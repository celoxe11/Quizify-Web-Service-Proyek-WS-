const { Sequelize } = require("sequelize");

const {
  database,
  username,
  password,
  host,
  dialect,
  port,
} = require("../config/db");

let sequelize;

if (process.env.NODE_ENV === "production") {
  // Cloud SQL connection via Unix Socket (recommended for Firebase Functions)
  sequelize = new Sequelize(
    process.env.DB_DBNAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      dialect: "mysql",
      dialectOptions: {
        socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      },
      logging: console.log, // Enable logging
    },
  );
} else {
  // Local development
  sequelize = new Sequelize(database, username, password, {
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
}

module.exports = sequelize;
