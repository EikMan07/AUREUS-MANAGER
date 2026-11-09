import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class PagoPrestamo extends Model {
    static associate(models) {
      PagoPrestamo.belongsTo(models.Prestamo, { foreignKey: 'prestamo_id', as: 'prestamo' });
      PagoPrestamo.belongsTo(models.AgendaCobro, { foreignKey: 'agenda_cobro_id', as: 'cuota' });
      PagoPrestamo.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
      PagoPrestamo.belongsTo(models.Usuario, { foreignKey: 'registrado_por', as: 'registrador' });
    }
  }

  PagoPrestamo.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      prestamo_id: { type: DataTypes.UUID, allowNull: false },
      agenda_cobro_id: { type: DataTypes.UUID, allowNull: true },
      registrado_por: { type: DataTypes.UUID, allowNull: true },
      tipo: { type: DataTypes.ENUM('COBRO_NORMAL', 'PAGO_ATRASADO'), allowNull: false, defaultValue: 'COBRO_NORMAL' },
      monto_cobrado: { type: DataTypes.DECIMAL(14, 2), allowNull: false, validate: { min: 0 } },
      monto_moratoria: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
      periodos_cubiertos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      fecha_hora_pago: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      sincronizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'PagoPrestamo', tableName: 'pagos_prestamo', timestamps: false }
  );

  return PagoPrestamo;
};

