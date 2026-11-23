// backend/src/models/CrmMensajeIa.js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CrmMensajeIa extends Model {
    static associate(models) {
      CrmMensajeIa.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
      CrmMensajeIa.belongsTo(models.CrmProspecto, { foreignKey: 'prospecto_id', as: 'prospecto' });
    }
  }

  CrmMensajeIa.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      prospecto_id: { type: DataTypes.UUID, allowNull: false },
      etapa_momento: {
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
      mensaje_propuesto: { type: DataTypes.TEXT, allowNull: false },
      estado: {
        type: DataTypes.ENUM('PENDIENTE_APROBACION', 'APROBADO', 'DESCARTADO'),
        allowNull: false,
        defaultValue: 'PENDIENTE_APROBACION',
      },
    },
    {
      sequelize,
      modelName: 'CrmMensajeIa',
      tableName: 'crm_mensajes_ia',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
    }
  );

  return CrmMensajeIa;
};
