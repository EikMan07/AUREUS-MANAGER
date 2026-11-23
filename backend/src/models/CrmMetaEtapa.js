// backend/src/models/CrmMetaEtapa.js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CrmMetaEtapa extends Model {
    static associate(models) {
      CrmMetaEtapa.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
    }
  }

  CrmMetaEtapa.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      etapa: {
        type: DataTypes.ENUM(
          'PROSPECTO',
          'EVALUACION_RIESGO',
          'PROPUESTA_APROBADA',
          'PRESTAMO_ACTIVO',
          'ALERTA_ATRASO',
          'ARREGLO_PAGO',
          'FINIQUITADO_RENOVABLE'
        ),
        allowNull: false,
      },
      meta_conversion: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 75.0 },
      dias_alerta_estancado: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    },
    {
      sequelize,
      modelName: 'CrmMetaEtapa',
      tableName: 'crm_metas_etapa',
      timestamps: false,
    }
  );

  return CrmMetaEtapa;
};
