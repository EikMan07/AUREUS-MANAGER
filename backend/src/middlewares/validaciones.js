export const requerir = (campos) => (req, res, next) => {
  const faltan = campos.filter(
    (c) => req.body[c] === undefined || req.body[c] === null || req.body[c] === ''
  );
  if (faltan.length) {
    return res.status(400).json({ error: `Faltan campos obligatorios: ${faltan.join(', ')}` });
  }
  next();
};

export const verificarRelacion = (Modelo, campo, etiqueta = 'El registro relacionado', status = 400) =>
  async (req, res, next) => {
    try {
      const id = req.body[campo];
      if (id === undefined || id === null) return next();
      const existe = await Modelo.findByPk(id);
      if (!existe) return res.status(status).json({ error: `${etiqueta} (${campo}=${id}) no existe` });
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

export const tipos = (reglas) => (req, res, next) => {
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

export default { requerir, verificarRelacion, tipos };

