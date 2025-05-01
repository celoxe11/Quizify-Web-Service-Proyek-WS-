//import sequelize
const { Sequelize } = require("sequelize");

//import data dari config-db.js
const {
  database,
  username,
  password,
  host,
  dialect,
  port,
} = require("../config/db");

const sequelize = new Sequelize(database, username, password, {
  host: host,
  dialect: dialect,
  port: port,
});

module.exports = sequelize;
