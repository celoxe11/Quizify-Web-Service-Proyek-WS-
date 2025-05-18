const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserLog = sequelize.define("UserLog", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  action_type: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  endpoint: {
    type: DataTypes.STRING(255),
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "UserLog",
  timestamps: false,
});

module.exports = UserLog;
