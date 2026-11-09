import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ListaNegraGlobal extends Model {
    static associate(models) {
      ListaNegraGlobal.belongsTo(models.ListaNegra, { foreignKey: 'origen_lista_negra_id', as: 'origen' });
      ListaNegraGlobal.belongsTo(models.Usuario, { foreignKey: 'cobrador_origen_id', as: 'cobradorOrigen' });
      ListaNegraGlobal.belongsTo(models.Usuario, { foreignKey: 'compartida_por', as: 'compartidaPor' });
      ListaNegraGlobal.belongsTo(models.Usuario, { foreignKey: 'retirada_por', as: 'retiradaPor' });
    }
  }

  ListaNegraGlobal.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cedula: { type: DataTypes.CHAR(9), allowNull: false, validate: { is: /^[0-9]{9}$/ } },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      apellidos: { type: DataTypes.STRING(120), allowNull: false },
      origen_lista_negra_id: { type: DataTypes.UUID, allowNull: true },
      cobrador_origen_id: { type: DataTypes.UUID, allowNull: true },
      compartida_por: { type: DataTypes.UUID, allowNull: false },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      fecha_compartida: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      retirada_por: { type: DataTypes.UUID, allowNull: true },
      fecha_retiro: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'ListaNegraGlobal', tableName: 'lista_negra_global', timestamps: false }
  );

  return ListaNegraGlobal;
};

