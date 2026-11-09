import { Usuario } from '../models/index.js';
import { firmarToken } from '../middlewares/authMiddleware.js';

export const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({
        success: false,
        error: 'Debe ingresar el nombre de usuario y la contraseña',
        userMessage: 'Debe ingresar el nombre de usuario y la contraseña'
      });
    }

    const user = await Usuario.scope('conPassword').findOne({
      where: { usuario: usuario.trim() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
        userMessage: 'Credenciales inválidas'
      });
    }

    const esValida = await user.validarPassword(password);
    if (!esValida) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
        userMessage: 'Credenciales inválidas'
      });
    }

    const token = firmarToken(user);
    res.setHeader('x-access-token', token);

    return res.json({
      success: true,
      token,
      usuario: user.toJSON()
    });
  } catch (error) {
    console.error('[Auth] Error en login:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al autenticar usuario',
      userMessage: 'Error interno al procesar el inicio de sesión'
    });
  }
};

export const registro = async (req, res) => {
  try {
    const { usuario, nombre_completo, correo, password } = req.body;
    if (!usuario || !nombre_completo || !correo || !password) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son obligatorios',
        userMessage: 'Todos los campos son obligatorios'
      });
    }

    const existente = await Usuario.findOne({ where: { usuario: usuario.trim() } });
    if (existente) {
      return res.status(409).json({
        success: false,
        error: 'El nombre de usuario ya está registrado',
        userMessage: 'El nombre de usuario ya está en uso'
      });
    }

    const nuevo = await Usuario.create({
      usuario: usuario.trim(),
      nombre_completo: nombre_completo.trim(),
      correo: correo.trim(),
      password_hash: password
    });

    const token = firmarToken(nuevo);
    res.setHeader('x-access-token', token);

    return res.status(201).json({
      success: true,
      token,
      usuario: nuevo.toJSON()
    });
  } catch (error) {
    console.error('[Auth] Error en registro:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al registrar usuario',
      userMessage: 'No fue posible registrar el usuario'
    });
  }
};

export const perfil = async (req, res) => {
  try {
    const usuario = req.usuario || req.user;
    return res.json({
      success: true,
      usuario
    });
  } catch (error) {
    console.error('[Auth] Error en perfil:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener perfil',
      userMessage: 'No se pudo cargar la información de la sesión'
    });
  }
};

export default { login, registro, perfil };

