require("dotenv").config();

module.exports = {
  database: process.env.DB_DBNAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  dialect: "mysql",
  port: process.env.DB_PORT,
  connectionName: process.env.CLOUD_SQL_CONNECTION_NAME
};
