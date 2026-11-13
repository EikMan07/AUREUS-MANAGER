import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Cliente extends Model {
    static associate(models) {
      Cliente.belongsTo(models.Usuario, { foreignKey: 'cobrador_id', as: 'cobrador' });
      // En la base de datos prestamos.cliente_id y agenda_cobros.cliente_id no tienen ON DELETE CASCADE
      // para proteger los préstamos contra dedazos cuando el cliente se mueve a clientes_baneados.
      Cliente.hasMany(models.Prestamo, { foreignKey: 'cliente_id', as: 'prestamos' });
      Cliente.hasMany(models.AgendaCobro, { foreignKey: 'cliente_id', as: 'agenda' });
      Cliente.hasMany(models.ListaNegra, { foreignKey: 'cliente_id', as: 'registrosListaNegra' });
    }
  }

  Cliente.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cobrador_id: { type: DataTypes.UUID, allowNull: false },
      cedula: { type: DataTypes.CHAR(9), allowNull: true, validate: { is: /^[0-9]{9}$/ } },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      apellidos: { type: DataTypes.STRING(120), allowNull: true },
      telefono: { type: DataTypes.STRING(20), allowNull: false },
      telefono_secundario: { type: DataTypes.STRING(40), allowNull: true, defaultValue: null },
      ubicacion: { type: DataTypes.STRING(200), allowNull: false },
      detalles: { type: DataTypes.TEXT, allowNull: true },
      estado: { type: DataTypes.ENUM('ACTIVO', 'EN_PAPELERA', 'EN_LISTA_NEGRA'), allowNull: false, defaultValue: 'ACTIVO' },
      fecha_envio_papelera: { type: DataTypes.DATE, allowNull: true },
      fecha_borrado_definitivo: { type: DataTypes.DATE, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    {
      sequelize,
      modelName: 'Cliente',
      tableName: 'clientes',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
    }
  );

  return Cliente;
};

