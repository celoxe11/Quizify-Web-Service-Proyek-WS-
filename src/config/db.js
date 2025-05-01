require("dotenv").config();
module.exports = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DBNAME,
  host: process.env.DB_HOST,
  dialect: "mysql",
  port: process.env.DB_PORT,
};
