import { pool } from '../config/db.js';
import { fragmentar } from './fragmentar.js';
import { embed } from '../services/embeddings.service.js';

/**
 * Fragmenta, vectoriza (en lotes de 64) e indexa un documento en `fragmentos_rag`
 * aislado estrictamente por `empresa_id`.
 *
 * @param {string} empresaId
 * @param {number} documentoId
 * @param {string} texto
 * @returns {Promise<{ numFragmentos: number }>}
 */
export async function indexarDocumento(empresaId, documentoId, texto) {
  const partes = fragmentar(texto, 1500, 200);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM fragmentos_rag WHERE documento_id = $1 AND empresa_id = $2::uuid`,
      [documentoId, empresaId]
    );

    for (let i = 0; i < partes.length; i += 64) {
      const lote = partes.slice(i, i + 64);
      const vectores = await embed(lote, 'document');

      for (let j = 0; j < lote.length; j += 1) {
        const orden = i + j;
        await client.query(
          `INSERT INTO fragmentos_rag (empresa_id, documento_id, orden, texto, embedding)
           VALUES ($1::uuid, $2, $3, $4, $5::double precision[])`,
          [empresaId, documentoId, orden, lote[j], vectores[j]]
        );
      }
    }

    await client.query(
      `UPDATE documentos_rag
       SET estado = 'indexado',
           num_fragmentos = $1
       WHERE id = $2 AND empresa_id = $3::uuid`,
      [partes.length, documentoId, empresaId]
    );

    await client.query('COMMIT');
    return { numFragmentos: partes.length };
  } catch (err) {
    await client.query('ROLLBACK');
    await pool
      .query(
        `UPDATE documentos_rag SET estado = 'error' WHERE id = $1 AND empresa_id = $2::uuid`,
        [documentoId, empresaId]
      )
      .catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export default {
  indexarDocumento
};
