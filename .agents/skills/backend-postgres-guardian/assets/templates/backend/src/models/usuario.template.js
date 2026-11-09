'use strict';
// Modelo Usuario: la contraseña SIEMPRE cifrada con bcrypt y NUNCA devuelta en las respuestas.
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs'); // o 'bcrypt': la API es la misma

const SALT_ROUNDS = 10;

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      // Ej.: Usuario.hasMany(models.Pedido, { foreignKey: 'usuarioId' });
    }
    async verificarPassword(plano) {
      return bcrypt.compare(plano, this.password);
    }
    // Defensa extra: aunque alguien olvide el scope, el hash no sale en el JSON.
    toJSON() {
      const datos = { ...this.get() };
      delete datos.password;
      return datos;
    }
  }

  Usuario.init(
    {
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: 'El nombre es obligatorio' }, len: { args: [2, 100], msg: 'El nombre debe tener entre 2 y 100 caracteres' } },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: 'Ese correo ya está registrado' },
        validate: { isEmail: { msg: 'El correo no tiene un formato válido' } },
      },
      password: {
        type: DataTypes.STRING, // guarda el HASH (bcrypt ~60 caracteres), nunca el texto plano
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Usuario',
      // Por defecto NUNCA se consulta la contraseña...
      defaultScope: { attributes: { exclude: ['password'] } },
      // ...solo cuando se pide explícitamente (login): Usuario.scope('conPassword')
      scopes: { conPassword: { attributes: {} } },
      hooks: {
        // Cifra al crear y al cambiar la contraseña.
        beforeSave: async (usuario) => {
          if (usuario.changed('password')) {
            usuario.password = await bcrypt.hash(usuario.password, SALT_ROUNDS);
          }
        },
      },
    }
  );

  return Usuario;
};
