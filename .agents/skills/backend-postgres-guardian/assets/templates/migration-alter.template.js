'use strict';
// Plantilla: modificar tabla existente (NUNCA editar una migración ya aplicada).
// Ejemplo seguro: agregar columna nullable. up y down deben ser exactamente inversos.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        'Entidades',
        'telefonoPrincipal',
        { type: Sequelize.STRING(20), allowNull: true },
        { transaction: t }
      );
      // Si luego debe ser NOT NULL: backfill + changeColumn en una migración posterior.
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn('Entidades', 'telefonoPrincipal', { transaction: t });
    });
  },
};
