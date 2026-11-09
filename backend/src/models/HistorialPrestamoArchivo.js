import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class HistorialPrestamoArchivo extends Model {
    static associate(models) {
      HistorialPrestamoArchivo.belongsTo(models.HistorialClienteArchivo, { foreignKey: 'archivo_id', as: 'archivo' });
    }
  }

  HistorialPrestamoArchivo.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      archivo_id: { type: DataTypes.UUID, allowNull: false },
      prestamo_id_original: { type: DataTypes.UUID, allowNull: false },
      monto_prestado: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      porcentaje_interes: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
      monto_total_financiar: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      monto_pagado: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      saldo_pendiente: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      cuota: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      modalidad: { type: DataTypes.ENUM('SEMANAL', 'QUINCENAL'), allowNull: false },
      fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_final: { type: DataTypes.DATEONLY, allowNull: false },
      estado_final: {
        type: DataTypes.ENUM('ACTIVO', 'ATRASADO', 'ARREGLO_PAGO', 'LIQUIDADO', 'RENOVADO', 'SUSPENDIDO'),
        allowNull: false,
      },
      periodos_pagados: { type: DataTypes.INTEGER, allowNull: false },
      total_periodos: { type: DataTypes.INTEGER, allowNull: false },
      veces_pasado_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      total_moratorias: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      // JSONB: foto histórica inmutable del detalle de pagos (dato archivado, no relacional).
      pagos_detalle: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    {
      sequelize,
      modelName: 'HistorialPrestamoArchivo',
      tableName: 'historial_prestamos_archivo',
      timestamps: true,
      createdAt: 'archivado_en',
      updatedAt: false,
    }
  );

  return HistorialPrestamoArchivo;
};

