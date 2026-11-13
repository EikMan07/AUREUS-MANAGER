import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class PrestamoBaneado extends Model {
    static associate(models) {
      PrestamoBaneado.belongsTo(models.Usuario, {
        foreignKey: 'cobrador_id',
        as: 'cobrador',
        onDelete: 'CASCADE',
      });
    }
  }

  PrestamoBaneado.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      cliente_id: { type: DataTypes.UUID, allowNull: false },
      cliente_nombre: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
      cliente_apellidos: { type: DataTypes.STRING(140), allowNull: true, defaultValue: '' },
      cliente_cedula: { type: DataTypes.CHAR(9), allowNull: true },
      cliente_telefono: { type: DataTypes.STRING(20), allowNull: true, defaultValue: '' },
      origen_papelera: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'PRESTAMO_ELIMINADO',
      },
      categoria_previa: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'PENDIENTE',
      },
      monto_prestado: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      porcentaje_interes: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      monto_total_financiar: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      monto_pagado_acumulado: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      saldo_por_pagar: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      cuota: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      modalidad: { type: DataTypes.ENUM('SEMANAL', 'QUINCENAL'), allowNull: false },
      fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_final: { type: DataTypes.DATEONLY, allowNull: false },
      estado_previo: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'ACTIVO' },
      periodos_pagados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      total_periodos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      periodos_atrasados_acumulados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      fecha_envio_papelera: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      fecha_borrado_definitivo: { type: DataTypes.DATE, allowNull: false },
      datos_prestamo_json: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      respaldo_agenda_cobros: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      respaldo_pagos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      respaldo_arreglos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      respaldo_renovaciones: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      respaldo_historial_pasar_dia: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      creado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'PrestamoBaneado',
      tableName: 'prestamos_baneados',
      timestamps: false,
    }
  );

  return PrestamoBaneado;
};

