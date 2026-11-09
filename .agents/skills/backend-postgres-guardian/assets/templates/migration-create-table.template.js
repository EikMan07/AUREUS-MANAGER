'use strict';
// Plantilla: crear tabla. Nombre del archivo: YYYYMMDDHHMMSS-create-entidad.js
// Generar con: npx sequelize-cli migration:generate --name create-entidad
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Entidades', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, unique: true },
      monto: { type: Sequelize.DECIMAL(10, 2) },
      activo: { type: Sequelize.BOOLEAN, defaultValue: true },
      padreId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Padres', key: 'id' }, // la tabla padre debe existir antes
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT', // no borrar el padre si tiene hijos
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      // deletedAt: { type: Sequelize.DATE }, // si el modelo usa paranoid: true
    });
    // PostgreSQL NO indexa FKs automáticamente:
    await queryInterface.addIndex('Entidades', ['padreId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Entidades');
    // Si hay ENUM: await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Entidades_columna";');
  },
};
