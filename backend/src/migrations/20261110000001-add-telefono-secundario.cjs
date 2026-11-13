'use strict';
// Agrega la columna opcional telefono_secundario VARCHAR(40) a clientes, clientes_baneados e historial_clientes_archivo.
// Idempotente: si ya existen las columnas (añadidas previamente), la migración se ejecuta sin errores
// y registra el estado en SequelizeMeta de cobro_firme_db.
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const run = (sql) => sequelize.query(sql, { transaction });
      await run('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono_secundario VARCHAR(40);');
      await run('ALTER TABLE clientes_baneados ADD COLUMN IF NOT EXISTS telefono_secundario VARCHAR(40);');
      await run('ALTER TABLE historial_clientes_archivo ADD COLUMN IF NOT EXISTS telefono_secundario VARCHAR(40);');
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const run = (sql) => sequelize.query(sql, { transaction });
      await run('ALTER TABLE clientes DROP COLUMN IF EXISTS telefono_secundario;');
      await run('ALTER TABLE clientes_baneados DROP COLUMN IF EXISTS telefono_secundario;');
      await run('ALTER TABLE historial_clientes_archivo DROP COLUMN IF EXISTS telefono_secundario;');
    });
  },
};

