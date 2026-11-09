'use strict';
// Validaciones reutilizables. Mensajes claros; nunca devolver detalles internos de la BD.

// Exige campos obligatorios en req.body. Uso: router.post('/', requerir(['nombre','email']), ctrl.crear)
const requerir = (campos) => (req, res, next) => {
  const faltan = campos.filter((c) => req.body[c] === undefined || req.body[c] === null || req.body[c] === '');
  if (faltan.length) {
    return res.status(400).json({ error: `Faltan campos obligatorios: ${faltan.join(', ')}` });
  }
  next();
};

// Verifica que el id exista en la tabla referenciada (relaciones). Si no existe -> 400 (o 404).
// Uso: router.post('/', verificarRelacion(Categoria, 'categoriaId', 'La categoría'), ctrl.crear)
const verificarRelacion = (Modelo, campo, etiqueta = 'El registro relacionado', status = 400) =>
  async (req, res, next) => {
    try {
      const id = req.body[campo];
      if (id === undefined || id === null) return next(); // la obligatoriedad la decide requerir()
      const existe = await Modelo.findByPk(id);
      if (!existe) return res.status(status).json({ error: `${etiqueta} (${campo}=${id}) no existe` });
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

// Valida el tipo de dato: numero / texto / entero
const tipos = (reglas) => (req, res, next) => {
  const errores = [];
  for (const [campo, tipo] of Object.entries(reglas)) {
    const v = req.body[campo];
    if (v === undefined) continue;
    if (tipo === 'numero' && (typeof v !== 'number' || Number.isNaN(v))) errores.push(`${campo} debe ser un número`);
    if (tipo === 'entero' && !Number.isInteger(v)) errores.push(`${campo} debe ser un entero`);
    if (tipo === 'texto' && typeof v !== 'string') errores.push(`${campo} debe ser texto`);
  }
  if (errores.length) return res.status(400).json({ error: errores });
  next();
};

module.exports = { requerir, verificarRelacion, tipos };
