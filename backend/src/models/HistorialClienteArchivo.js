import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class HistorialClienteArchivo extends Model {
    static associate(models) {
      HistorialClienteArchivo.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
      HistorialClienteArchivo.belongsTo(models.Cliente, { foreignKey: 'cliente_id_actual', as: 'clienteActual' });
      HistorialClienteArchivo.hasMany(models.HistorialPrestamoArchivo, {
        foreignKey: 'archivo_id',
        as: 'prestamos',
        onDelete: 'CASCADE',
      });
    }
  }

  HistorialClienteArchivo.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      cliente_id_actual: { type: DataTypes.UUID, allowNull: true },
      cedula: { type: DataTypes.CHAR(9), allowNull: true },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      apellidos: { type: DataTypes.STRING(120), allowNull: true },
      telefono: { type: DataTypes.STRING(20), allowNull: true },
      ubicacion: { type: DataTypes.STRING(200), allowNull: true },
      detalles: { type: DataTypes.TEXT, allowNull: true },
      fecha_eliminacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      fecha_expiracion: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'HistorialClienteArchivo',
      tableName: 'historial_clientes_archivo',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: false,
    }
  );

  return HistorialClienteArchivo;
};

