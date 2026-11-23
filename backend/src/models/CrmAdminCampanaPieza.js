// backend/src/models/CrmAdminCampanaPieza.js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CrmAdminCampanaPieza extends Model {
    static associate(models) {
      CrmAdminCampanaPieza.belongsTo(models.CrmAdminCampana, { foreignKey: 'campana_id', as: 'campana' });
    }
  }

  CrmAdminCampanaPieza.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      campana_id: { type: DataTypes.UUID, allowNull: false },
      titulo: { type: DataTypes.STRING(120), allowNull: false },
      canal: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'Facebook' },
      copy_propuesto: { type: DataTypes.TEXT, allowNull: false },
      formato: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '1:1' },
      estado: {
        type: DataTypes.ENUM('PENDIENTE_APROBACION', 'APROBADO', 'DESCARTADO'),
        allowNull: false,
        defaultValue: 'PENDIENTE_APROBACION',
      },
      fecha_programada: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CrmAdminCampanaPieza',
      tableName: 'crm_admin_campana_piezas',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: false,
    }
  );

  return CrmAdminCampanaPieza;
};
