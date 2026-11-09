'use strict';
const { Usuario } = require('../models');
const { firmarToken } = require('../middlewares/authMiddleware');

const manejarError = (res, error) => {
  switch (error.name) {
    case 'SequelizeValidationError':
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    case 'SequelizeUniqueConstraintError':
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    default:
      console.error(error);
      return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.registro = async (req, res) => {
  try {
    const { nombre, email, password } = req.body; // whitelist: no se aceptan otros campos
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    const usuario = await Usuario.create({ nombre, email, password }); // el hook la cifra con bcrypt
    res.status(201).json({ usuario }); // toJSON() ya quita el password
  } catch (error) { manejarError(res, error); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });

    // El scope conPassword es el ÚNICO lugar donde se lee el hash.
    const usuario = await Usuario.scope('conPassword').findOne({ where: { email } });
    const valido = usuario && (await usuario.verificarPassword(password));
    // Mismo mensaje para "no existe" y "clave incorrecta": no revela qué correos están registrados.
    if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = firmarToken(usuario); // expira a los 25 min (JWT_EXPIRES_IN)
    res.json({ token, usuario }); // usuario.toJSON() sin password
  } catch (error) { manejarError(res, error); }
};

// Ruta protegida que el front llama para mantener viva la sesión mientras hay interacción.
// El authMiddleware ya devuelve el token renovado en el header x-access-token.
exports.renovar = (req, res) => res.json({ ok: true });
