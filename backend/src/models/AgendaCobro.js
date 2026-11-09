import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class AgendaCobro extends Model {
    static associate(models) {
      AgendaCobro.belongsTo(models.Prestamo, { foreignKey: 'prestamo_id', as: 'prestamo' });
      AgendaCobro.belongsTo(models.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
      AgendaCobro.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
      AgendaCobro.hasMany(models.PagoPrestamo, { foreignKey: 'agenda_cobro_id', as: 'pagos' });
    }
  }

  AgendaCobro.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      prestamo_id: { type: DataTypes.UUID, allowNull: false },
      cliente_id: { type: DataTypes.UUID, allowNull: false },
      numero_cobro: { type: DataTypes.INTEGER, allowNull: false },
      fecha_programada_original: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_cobro_actual: { type: DataTypes.DATEONLY, allowNull: false },
      dia_semana_actual: {
        type: DataTypes.ENUM('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'),
        allowNull: false,
      },
      veces_pasado: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      monto_cuota: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      monto_moratoria: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      monto_total_cobrado: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      estado: {
        type: DataTypes.ENUM('PENDIENTE', 'REGISTRADO', 'NO_PAGO', 'PASADO_DE_DIA'),
        allowNull: false,
        defaultValue: 'PENDIENTE',
      },
      fecha_hora_registro_pago: { type: DataTypes.DATE, allowNull: true },
      fecha_proximo_cobro: { type: DataTypes.DATEONLY, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    { sequelize, modelName: 'AgendaCobro', tableName: 'agenda_cobros', timestamps: false }
  );

  return AgendaCobro;
};

