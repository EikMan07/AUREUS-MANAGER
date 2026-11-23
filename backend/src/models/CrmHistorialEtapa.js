// backend/src/models/CrmHistorialEtapa.js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CrmHistorialEtapa extends Model {
    static associate(models) {
      CrmHistorialEtapa.belongsTo(models.CrmProspecto, { foreignKey: 'prospecto_id', as: 'prospecto' });
    }
  }

  CrmHistorialEtapa.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      prospecto_id: { type: DataTypes.UUID, allowNull: false },
      etapa_anterior: {
        type: DataTypes.ENUM(
          'PROSPECTO',
          'EVALUACION_RIESGO',
          'PROPUESTA_APROBADA',
          'PRESTAMO_ACTIVO',
          'ALERTA_ATRASO',
          'ARREGLO_PAGO',
          'FINIQUITADO_RENOVABLE'
        ),
        allowNull: true,
      },
      etapa_nueva: {
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
      dias_en_etapa_anterior: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      nota_cambio: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CrmHistorialEtapa',
      tableName: 'crm_historial_etapas',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: false,
    }
  );

  return CrmHistorialEtapa;
};
