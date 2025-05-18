const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Subscription = sequelize.define("Subscription", {
  id_subs: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  status: {
    type: DataTypes.ENUM("Premium", "Free"),
    defaultValue: "Free",
  },
}, {
  tableName: "Subscription",
  timestamps: false,
});

module.exports = Subscription;
