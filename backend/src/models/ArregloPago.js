import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ArregloPago extends Model {
    static associate(models) {
      ArregloPago.belongsTo(models.Prestamo, { foreignKey: 'prestamo_id', as: 'prestamo' });
    }
  }

  ArregloPago.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      prestamo_id: { type: DataTypes.UUID, allowNull: false },
      monto_fijo_acordado: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      cuota_especial: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      nuevo_dia_cobro: {
        type: DataTypes.ENUM('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'),
        allowNull: true,
      },
      // Excepción documentada a 1FN: días del mes de la quincena (ver modelo Prestamo).
      nuevo_dia_mes_1: { type: DataTypes.SMALLINT, allowNull: true },
      nuevo_dia_mes_2: { type: DataTypes.SMALLINT, allowNull: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      fecha_acuerdo: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'ArregloPago', tableName: 'arreglos_pago', timestamps: false }
  );

  return ArregloPago;
};

