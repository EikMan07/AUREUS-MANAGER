'use strict';
// Migración base (marcador). La estructura original de cobro_firme_db se creó con
// backend/sql/01_schema_cobro_firme.sql y 02_automatizacion_historial_cobro_firme.sql.
// Esta migración NO crea ni modifica nada: solo verifica que esa estructura exista y deja
// registrado el punto de partida en SequelizeMeta. Si la base está vacía, falla con instrucciones
// claras en lugar de ejecutar un volcado completo (que cambia el search_path de la sesión).
module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT to_regclass('public.usuarios') AS usuarios, to_regclass('public.clientes') AS clientes, to_regclass('public.prestamos') AS prestamos;"
    );
    const { usuarios, clientes, prestamos } = rows[0];
    if (!usuarios || !clientes || !prestamos) {
      throw new Error(
        'La base de datos no tiene la estructura inicial. Ejecuta primero backend/sql/01_schema_cobro_firme.sql ' +
          'y backend/sql/02_automatizacion_historial_cobro_firme.sql, y luego repite: npm run db:migrate'
      );
    }
  },

  async down() {
    // Marcador baseline: no altera objetos físicos de BD
    return Promise.resolve();
  },
};

