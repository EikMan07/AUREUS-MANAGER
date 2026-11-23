// backend/src/models/CrmProspecto.js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CrmProspecto extends Model {
    static associate(models) {
      CrmProspecto.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
      CrmProspecto.belongsTo(models.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
      CrmProspecto.hasMany(models.CrmHistorialEtapa, { foreignKey: 'prospecto_id', as: 'historialEtapas' });
      CrmProspecto.hasMany(models.CrmMensajeIa, { foreignKey: 'prospecto_id', as: 'mensajesIa' });
    }
  }

  CrmProspecto.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      cliente_id: { type: DataTypes.UUID, allowNull: true },
      nombre: { type: DataTypes.STRING(120), allowNull: false },
      apellidos: { type: DataTypes.STRING(120), allowNull: true },
      telefono: { type: DataTypes.STRING(30), allowNull: false },
      ubicacion: { type: DataTypes.STRING(180), allowNull: false },
      canal_origen: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'REFERIDO' },
      monto_estimado: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
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
        defaultValue: 'PROSPECTO',
      },
      revisado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      notas: { type: DataTypes.TEXT, allowNull: true },
      fecha_ingreso: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      fecha_ultimo_cambio_etapa: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'CrmProspecto',
      tableName: 'crm_prospectos',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
    }
  );

  return CrmProspecto;
};
