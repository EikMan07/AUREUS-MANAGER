import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ListaNegra extends Model {
    static associate(models) {
      ListaNegra.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
      ListaNegra.belongsTo(models.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
      ListaNegra.hasMany(models.ListaNegraGlobal, { foreignKey: 'origen_lista_negra_id', as: 'compartidos' });
    }
  }

  ListaNegra.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      cliente_id: { type: DataTypes.UUID, allowNull: true },
      cedula: { type: DataTypes.CHAR(9), allowNull: true, validate: { is: /^[0-9]{9}$/ } },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      apellidos: { type: DataTypes.STRING(120), allowNull: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      fecha_registro: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
      fecha_salida: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'ListaNegra', tableName: 'lista_negra', timestamps: false }
  );

  return ListaNegra;
};

