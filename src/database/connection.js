const { Sequelize } = require("sequelize");

const isProduction = process.env.NODE_ENV === "production";

let sequelize;

if (isProduction) {
  // PRODUCTION: Use Unix Socket (Cloud SQL)
  sequelize = new Sequelize(
    process.env.DB_DBNAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      dialect: "mysql",
      host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      dialectOptions: {
        socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      },
      logging: false,
    },
  );
} else {
  // DEVELOPMENT: Use TCP (Local or Cloud SQL Auth Proxy)
  sequelize = new Sequelize(
    process.env.DB_DBNAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST, // 127.0.0.1
      port: process.env.DB_PORT, // 3306
      dialect: "mysql",
    },
  );
}

module.exports = sequelize;
