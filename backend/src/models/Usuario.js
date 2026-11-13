import { Model } from 'sequelize';
import bcryptjs from 'bcryptjs';

export default (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.hasMany(models.Cliente, { foreignKey: 'cobrador_id', as: 'clientes', onDelete: 'RESTRICT' });
      Usuario.hasMany(models.Prestamo, { foreignKey: 'cobrador_id', as: 'prestamos', onDelete: 'RESTRICT' });
      Usuario.hasMany(models.BitacoraActividad, { foreignKey: 'usuario_id', as: 'bitacora', onDelete: 'RESTRICT' });
    }

    validarPassword(password) {
      return bcryptjs.compare(password, this.password_hash);
    }

    toJSON() {
      const values = { ...this.get() };
      delete values.password_hash;
      return values;
    }
  }

  Usuario.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      usuario: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      nombre_completo: { type: DataTypes.STRING(120), allowNull: false },
      correo: { type: DataTypes.STRING(254), allowNull: false, unique: true },
      correo_verificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      correo_verificado_en: { type: DataTypes.DATE, allowNull: true },
      password_hash: { type: DataTypes.TEXT, allowNull: false },
      rol: { type: DataTypes.ENUM('ADMINISTRADOR', 'COBRADOR'), allowNull: false, defaultValue: 'COBRADOR' },
      estado_cuenta: {
        type: DataTypes.ENUM('PENDIENTE_VERIFICACION', 'ACTIVA', 'SUSPENDIDA'),
        allowNull: false,
        defaultValue: 'PENDIENTE_VERIFICACION',
      },
      codigo_vinculacion: { type: DataTypes.STRING(24), allowNull: true, unique: true },
      foto_url: { type: DataTypes.TEXT, allowNull: true },
      ultimo_acceso: { type: DataTypes.DATE, allowNull: true },
      webauthn_user_handle: { type: DataTypes.TEXT, allowNull: true },
      intentos_fallidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      bloqueado_hasta: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Usuario',
      tableName: 'usuarios',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
      defaultScope: {
        attributes: { exclude: ['password_hash'] },
      },
      scopes: {
        conPassword: {},
      },
      hooks: {
        beforeCreate: async (user) => {
          if (user.password_hash && !user.password_hash.startsWith('$2')) {
            user.password_hash = await bcryptjs.hash(user.password_hash, 10);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password_hash') && !user.password_hash.startsWith('$2')) {
            user.password_hash = await bcryptjs.hash(user.password_hash, 10);
          }
        },
      },
    }
  );

  return Usuario;
};
