const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const QuizSession = sequelize.define("QuizSession", {
  id: {
    type: DataTypes.STRING(10),
    primaryKey: true,
  },
  quiz_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  user_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  started_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  ended_at: {
    type: DataTypes.DATE,
  },
  score: {
    type: DataTypes.INTEGER,
  },
  status: {
    type: DataTypes.ENUM("in_progress", "completed", "expired"),
    defaultValue: "in_progress",
  },
}, {
  tableName: "QuizSession",
  timestamps: false,
});

module.exports = QuizSession;
