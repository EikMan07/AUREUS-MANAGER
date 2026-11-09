import { Model } from 'sequelize';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

export default (sequelize, DataTypes) => {
  class Prestamo extends Model {
    static associate(models) {
      Prestamo.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
      Prestamo.belongsTo(models.Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
      Prestamo.hasMany(models.AgendaCobro, { foreignKey: 'prestamo_id', as: 'agenda', onDelete: 'CASCADE' });
      Prestamo.hasMany(models.PagoPrestamo, { foreignKey: 'prestamo_id', as: 'pagos', onDelete: 'CASCADE' });
      Prestamo.hasMany(models.ArregloPago, { foreignKey: 'prestamo_id', as: 'arreglos', onDelete: 'CASCADE' });
    }
  }

  Prestamo.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      cliente_id: { type: DataTypes.UUID, allowNull: false },
      // Dinero: DECIMAL, nunca FLOAT.
      monto_prestado: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      porcentaje_interes: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      monto_total_financiar: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      monto_pagado_acumulado: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      saldo_por_pagar: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      cuota: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      modalidad: { type: DataTypes.ENUM('SEMANAL', 'QUINCENAL'), allowNull: false },
      dia_fijo_original: { type: DataTypes.ENUM(...DIAS), allowNull: true },
      // Excepción documentada a 1FN: no son un grupo repetitivo; son los dos días del mes de la
      // modalidad quincenal (el CHECK ck_prestamos_dia_segun_modalidad exige dia_mes_1 < dia_mes_2).
      dia_mes_1: { type: DataTypes.SMALLINT, allowNull: true },
      dia_mes_2: { type: DataTypes.SMALLINT, allowNull: true },
      fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_final: { type: DataTypes.DATEONLY, allowNull: false },
      total_periodos: { type: DataTypes.INTEGER, allowNull: false },
      periodos_pagados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      periodos_pendientes: { type: DataTypes.INTEGER, allowNull: false },
      periodos_atrasados_acumulados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      estado: {
        type: DataTypes.ENUM('ACTIVO', 'ATRASADO', 'ARREGLO_PAGO', 'LIQUIDADO', 'CANCELADO', 'RENOVADO', 'SUSPENDIDO'),
        allowNull: false,
        defaultValue: 'ACTIVO',
      },
      estado_previo_suspension: {
        type: DataTypes.ENUM('ACTIVO', 'ATRASADO', 'ARREGLO_PAGO', 'LIQUIDADO', 'CANCELADO', 'RENOVADO', 'SUSPENDIDO'),
        allowNull: true,
      },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    {
      sequelize,
      modelName: 'Prestamo',
      tableName: 'prestamos',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
    }
  );

  return Prestamo;
};

