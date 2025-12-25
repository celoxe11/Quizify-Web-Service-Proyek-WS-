const { DataTypes } = require("sequelize");
const sequelize = require("../database/connection");

const Subscription = sequelize.define("Subscription", {
  id_subs: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  status: {
    type: DataTypes.STRING(50), 
    allowNull: false,
    defaultValue: "Free",
    unique: true,
  },
}, {
  tableName: "subscription",
  timestamps: false,
});

module.exports = Subscription;
