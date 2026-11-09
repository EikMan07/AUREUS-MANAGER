import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class TransferenciaCartera extends Model {
    static associate(models) {
      TransferenciaCartera.belongsTo(models.Usuario, { foreignKey: 'cobrador_origen_id', as: 'cobradorOrigen' });
      TransferenciaCartera.belongsTo(models.Usuario, { foreignKey: 'cobrador_destino_id', as: 'cobradorDestino' });
      TransferenciaCartera.belongsTo(models.Usuario, { foreignKey: 'realizado_por', as: 'realizadoPor' });
    }
  }

  TransferenciaCartera.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_origen_id: { type: DataTypes.UUID, allowNull: false },
      cobrador_destino_id: { type: DataTypes.UUID, allowNull: false },
      realizado_por: { type: DataTypes.UUID, allowNull: false },
      cantidad_clientes: { type: DataTypes.INTEGER, allowNull: false },
      cantidad_prestamos: { type: DataTypes.INTEGER, allowNull: false },
      motivo: { type: DataTypes.STRING(200), allowNull: true },
      fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'TransferenciaCartera',
      tableName: 'transferencias_cartera',
      timestamps: false,
      validate: {
        origenDistintoDestino() {
          if (this.cobrador_origen_id === this.cobrador_destino_id) {
            throw new Error('El cobrador de origen y el de destino deben ser distintos.');
          }
        },
      },
    }
  );

  return TransferenciaCartera;
};

