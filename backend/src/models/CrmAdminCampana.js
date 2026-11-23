// backend/src/models/CrmAdminCampana.js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CrmAdminCampana extends Model {
    static associate(models) {
      CrmAdminCampana.hasMany(models.CrmAdminCampanaPieza, { foreignKey: 'campana_id', as: 'piezas' });
    }
  }

  CrmAdminCampana.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      nombre: { type: DataTypes.STRING(150), allowNull: false },
      objetivo: { type: DataTypes.TEXT, allowNull: false },
      publico_objetivo: { type: DataTypes.TEXT, allowNull: true },
      mensaje_central: { type: DataTypes.TEXT, allowNull: true },
      canales: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Facebook e Instagram' },
      presupuesto: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      inscritos_logrados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      estado: {
        type: DataTypes.ENUM(
          'OBJETIVO',
          'FICHA_CAMPANA',
          'PLAN_PIEZAS',
          'EN_GENERACION',
          'PENDIENTE_APROBACION',
          'PROGRAMADA',
          'PUBLICADA',
          'FINALIZADA'
        ),
        allowNull: false,
        defaultValue: 'OBJETIVO',
      },
      fecha_inicio: { type: DataTypes.DATEONLY, allowNull: true },
      fecha_fin: { type: DataTypes.DATEONLY, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CrmAdminCampana',
      tableName: 'crm_admin_campanas',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
    }
  );

  return CrmAdminCampana;
};
