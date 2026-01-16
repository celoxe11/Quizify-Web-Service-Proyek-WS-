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
  logging: false,
  // Ensure consistent collation across all operations
  define: {
    charset: "utf8mb4",
    collate: "utf8mb4_0900_ai_ci",
  },
  dialectOptions: {
    charset: "utf8mb4",
  },
});

module.exports = sequelize;
