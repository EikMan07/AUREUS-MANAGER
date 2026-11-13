import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ClienteBaneado extends Model {
    static associate(models) {
      ClienteBaneado.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
      ClienteBaneado.hasMany(models.Prestamo, { foreignKey: 'cliente_id', as: 'prestamos' });
      ClienteBaneado.hasMany(models.AgendaCobro, { foreignKey: 'cliente_id', as: 'agenda' });
    }
  }

  ClienteBaneado.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      cedula: { type: DataTypes.STRING(20), allowNull: true },
      nombre: { type: DataTypes.STRING(120), allowNull: false },
      apellidos: { type: DataTypes.STRING(160), allowNull: true },
      telefono: { type: DataTypes.STRING(40), allowNull: false },
      telefono_secundario: { type: DataTypes.STRING(40), allowNull: true, defaultValue: null },
      ubicacion: { type: DataTypes.TEXT, allowNull: false },
      detalles: { type: DataTypes.TEXT, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      creado_originalmente_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      fecha_envio_papelera: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      fecha_borrado_definitivo: { type: DataTypes.DATE, allowNull: false },
      respaldo_prestamos: { type: DataTypes.JSONB, defaultValue: [] },
    },
    {
      sequelize,
      modelName: 'ClienteBaneado',
      tableName: 'clientes_baneados',
      timestamps: false,
    }
  );

  return ClienteBaneado;
};

