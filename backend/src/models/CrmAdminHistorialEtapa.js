// backend/src/models/CrmAdminHistorialEtapa.js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CrmAdminHistorialEtapa extends Model {
    static associate(models) {
      CrmAdminHistorialEtapa.belongsTo(models.CrmAdminProspecto, { foreignKey: 'prospecto_admin_id', as: 'prospecto' });
    }
  }

  CrmAdminHistorialEtapa.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      prospecto_admin_id: { type: DataTypes.UUID, allowNull: false },
      etapa_anterior: {
        type: DataTypes.ENUM(
          'VISITANTE_LANDING',
          'REGISTRO_INICIADO',
          'CONSENTIMIENTO_LEY_8968',
          'CUENTA_ACTIVA',
          'PRIMER_PRESTAMO',
          'PRESTAMISTA_ACTIVO',
          'EN_RIESGO_BAJA'
        ),
        allowNull: true,
      },
      etapa_nueva: {
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
      },
      dias_en_etapa_anterior: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: 'CrmAdminHistorialEtapa',
      tableName: 'crm_admin_historial_etapas',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: false,
    }
  );

  return CrmAdminHistorialEtapa;
};
