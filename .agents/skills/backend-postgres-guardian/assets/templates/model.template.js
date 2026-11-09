'use strict';
// Plantilla de modelo Sequelize (v6) para PostgreSQL.
// Reemplaza Entidad / entidades / campos. Debe COINCIDIR con la migración.
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Entidad extends Model {
    static associate(models) {
      // 1:N  -> Entidad.hasMany(models.Hija, { foreignKey: 'entidadId', onDelete: 'RESTRICT' });
      // N:1  -> Entidad.belongsTo(models.Padre, { foreignKey: 'padreId' });
      // N:M  -> Entidad.belongsToMany(models.Otra, { through: models.EntidadOtra, foreignKey: 'entidadId' });
      // Declara SIEMPRE ambos lados de la relación.
    }
  }

  Entidad.init(
    {
      nombre: { type: DataTypes.STRING, allowNull: false, validate: { len: [2, 100] } },
      email: { type: DataTypes.STRING, unique: true, validate: { isEmail: true } },
      monto: { type: DataTypes.DECIMAL(10, 2) }, // dinero: DECIMAL, nunca FLOAT
      activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'Entidad',
      // tableName: 'entidades',   // respeta la convención del proyecto
      // underscored: true,        // snake_case en columnas (proyectos nuevos)
      // paranoid: true,           // borrado lógico (requiere columna deletedAt en la migración)
    }
  );

  return Entidad;
};
