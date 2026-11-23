import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CuentaOauth extends Model {
    static associate(models) {
      CuentaOauth.belongsTo(models.Usuario, {
        foreignKey: 'usuario_id',
        as: 'usuario',
        onDelete: 'CASCADE',
      });
    }
  }

  CuentaOauth.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      usuario_id: { type: DataTypes.UUID, allowNull: false },
      proveedor: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['google', 'github']],
        },
      },
      proveedor_usuario_id: { type: DataTypes.STRING(191), allowNull: false },
      correo_proveedor: { type: DataTypes.STRING(255), allowNull: false },
    },
    {
      sequelize,
      modelName: 'CuentaOauth',
      tableName: 'cuentas_oauth',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
      indexes: [
        {
          name: 'uq_cuentas_oauth_proveedor_sub',
          unique: true,
          fields: ['proveedor', 'proveedor_usuario_id'],
        },
        {
          name: 'idx_cuentas_oauth_usuario_id',
          fields: ['usuario_id'],
        },
      ],
    }
  );

  return CuentaOauth;
};
