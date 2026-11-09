'use strict';
// Carga automática de todos los modelos de esta carpeta y ejecuta sus associate().
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

const db = {};
fs.readdirSync(__dirname)
  .filter((f) => f !== 'index.js' && f.endsWith('.js') && !f.includes('.template'))
  .forEach((f) => {
    const model = require(path.join(__dirname, f))(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach((m) => m.associate && m.associate(db));

db.sequelize = sequelize;
db.Sequelize = Sequelize;
module.exports = db;
