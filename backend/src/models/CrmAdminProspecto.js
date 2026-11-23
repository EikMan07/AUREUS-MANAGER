// backend/src/models/CrmAdminProspecto.js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CrmAdminProspecto extends Model {
    static associate(models) {
      CrmAdminProspecto.hasMany(models.CrmAdminHistorialEtapa, { foreignKey: 'prospecto_admin_id', as: 'historialEtapas' });
    }
  }

  CrmAdminProspecto.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      nombre: { type: DataTypes.STRING(120), allowNull: false },
      correo: { type: DataTypes.STRING(160), allowNull: true },
      telefono: { type: DataTypes.STRING(30), allowNull: true },
      zona: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Puntarenas' },
      canal_origen: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'LANDING_PAGE' },
      etapa: {
        type: DataTypes.ENUM(
          'VISITANTE_LANDING',
          'REGISTRO_INICIADO',
          'CONSENTIMIENTO_LEY_8968',
          'CUENTA_ACTIVA',
          'PRIMER_PRESTAMO',
          'PRESTAMISTA_ACTIVO',
          'EN_RIESGO_BAJA'
        ),
        allowNull: false,
        defaultValue: 'VISITANTE_LANDING',
      },
      revisado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      notas: { type: DataTypes.TEXT, allowNull: true },
      fecha_ingreso: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      fecha_ultimo_cambio_etapa: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'CrmAdminProspecto',
      tableName: 'crm_admin_prospectos',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
    }
  );

  return CrmAdminProspecto;
};
