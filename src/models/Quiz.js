const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Quiz = sequelize.define("Quiz", {
  id: {
    type: DataTypes.STRING(10),
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  category: {
    type: DataTypes.STRING(100),
  },
  created_by: {
    type: DataTypes.STRING(10),
  },
}, {
  tableName: "Quiz",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = Quiz;
