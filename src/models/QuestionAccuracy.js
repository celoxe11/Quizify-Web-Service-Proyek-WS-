const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const QuestionAccuracy = sequelize.define("QuestionAccuracy", {
  id: {
    type: DataTypes.STRING(10),
    primaryKey: true,
  },
  question_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  quiz_id: {
    type: DataTypes.STRING(10),
  },
  total_answered: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  correct_answers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  incorrect_answers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: "QuestionAccuracy",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = QuestionAccuracy;
