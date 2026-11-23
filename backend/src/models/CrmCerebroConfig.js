// backend/src/models/CrmCerebroConfig.js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CrmCerebroConfig extends Model {
    static associate(models) {
      CrmCerebroConfig.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
    }
  }

  CrmCerebroConfig.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      tono: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'EJECUTIVO_CERCANO' },
      instruccion_base: { type: DataTypes.TEXT, allowNull: false },
      reglas_adicionales: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CrmCerebroConfig',
      tableName: 'crm_cerebro_config',
      timestamps: true,
      createdAt: false,
      updatedAt: 'actualizado_en',
    }
  );

  return CrmCerebroConfig;
};
