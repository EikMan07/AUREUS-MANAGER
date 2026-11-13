'use strict';
// Índices en claves foráneas. PostgreSQL NO indexa las FKs automáticamente; sin índice los JOIN y
// los borrados en cascada se vuelven lentos. Hallazgo #2 de audit_schema.sql (16 FKs sin índice).
// Cambio aditivo y reversible (🟢): usa addIndex/removeIndex oficiales de Sequelize.
const INDICES = [
  { name: 'idx_suscripciones_push_usuario_id', table: 'suscripciones_push', field: 'usuario_id' },
  { name: 'idx_lista_negra_cliente_id', table: 'lista_negra', field: 'cliente_id' },
  { name: 'idx_lista_negra_global_cobrador_origen_id', table: 'lista_negra_global', field: 'cobrador_origen_id' },
  { name: 'idx_lista_negra_global_compartida_por', table: 'lista_negra_global', field: 'compartida_por' },
  { name: 'idx_lista_negra_global_origen_lista_negra_id', table: 'lista_negra_global', field: 'origen_lista_negra_id' },
  { name: 'idx_lista_negra_global_retirada_por', table: 'lista_negra_global', field: 'retirada_por' },
  { name: 'idx_renovaciones_prestamo_prestamo_id', table: 'renovaciones_prestamo', field: 'prestamo_id' },
  { name: 'idx_agenda_cobros_cliente_id', table: 'agenda_cobros', field: 'cliente_id' },
  { name: 'idx_historial_pasar_dia_agenda_cobro_id', table: 'historial_pasar_dia', field: 'agenda_cobro_id' },
  { name: 'idx_historial_pasar_dia_prestamo_id', table: 'historial_pasar_dia', field: 'prestamo_id' },
  { name: 'idx_pagos_prestamo_agenda_cobro_id', table: 'pagos_prestamo', field: 'agenda_cobro_id' },
  { name: 'idx_pagos_prestamo_registrado_por', table: 'pagos_prestamo', field: 'registrado_por' },
  { name: 'idx_historial_clientes_archivo_cliente_id_actual', table: 'historial_clientes_archivo', field: 'cliente_id_actual' },
  { name: 'idx_transferencias_cartera_cobrador_destino_id', table: 'transferencias_cartera', field: 'cobrador_destino_id' },
  { name: 'idx_transferencias_cartera_cobrador_origen_id', table: 'transferencias_cartera', field: 'cobrador_origen_id' },
  { name: 'idx_transferencias_cartera_realizado_por', table: 'transferencias_cartera', field: 'realizado_por' },
];

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      for (const item of INDICES) {
        try {
          await queryInterface.addIndex(item.table, [item.field], {
            name: item.name,
            transaction
          });
        } catch (err) {
          // Si el índice ya existía previamente no fallar
          if (!err.message || !err.message.includes('already exists')) {
            throw err;
          }
        }
      }
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      for (const item of INDICES.slice().reverse()) {
        try {
          await queryInterface.removeIndex(item.table, item.name, { transaction });
        } catch (err) {
          // Si no existe, no fallar la reversión
        }
      }
    });
  },
};
