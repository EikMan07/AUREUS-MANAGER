import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  // La bitácora es inmutable (trigger trg_bitacora_inmutable): solo se inserta, nunca se actualiza ni se borra.
  class BitacoraActividad extends Model {
    static associate(models) {
      BitacoraActividad.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
      BitacoraActividad.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
    }
  }

  BitacoraActividad.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      usuario_id: { type: DataTypes.UUID, allowNull: false },
      cobrador_id: { type: DataTypes.UUID, allowNull: true },
      accion: {
        type: DataTypes.ENUM(
          'PAGO_REGISTRADO', 'COBRO_PASADO', 'NO_PAGO_REGISTRADO', 'CLIENTE_CREADO', 'CLIENTE_EDITADO',
          'CLIENTE_A_PAPELERA', 'CLIENTE_RESTAURADO', 'CLIENTE_ELIMINADO_DEFINITIVO', 'CLIENTE_A_LISTA_NEGRA',
          'CLIENTE_SACADO_DE_LISTA_NEGRA', 'PRESTAMO_CREADO', 'PRESTAMO_RENOVADO', 'ARREGLO_PAGO_CREADO',
          'LISTA_NEGRA_COMPARTIDA', 'LISTA_NEGRA_GLOBAL_RETIRADA', 'CARTERA_TRANSFERIDA', 'USUARIO_SUSPENDIDO',
          'USUARIO_REACTIVADO', 'CLAVE_RESTABLECIDA', 'HUELLA_ELIMINADA'
        ),
        allowNull: false,
      },
      entidad: { type: DataTypes.STRING(40), allowNull: true },
      entidad_id: { type: DataTypes.UUID, allowNull: true },
      cedula: { type: DataTypes.CHAR(9), allowNull: true },
      detalle: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      fecha_hora: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      sincronizado_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { sequelize, modelName: 'BitacoraActividad', tableName: 'bitacora_actividad', timestamps: false }
  );

  return BitacoraActividad;
};

