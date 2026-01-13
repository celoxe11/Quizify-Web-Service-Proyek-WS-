const { DataTypes } = require("sequelize");
const sequelize = require("../database/connection");

const SubmissionAnswer = sequelize.define("SubmissionAnswer", {
  id: {
    type: DataTypes.STRING(10),
    primaryKey: true,
  },
  quiz_session_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  question_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  selected_answer: {
    type: DataTypes.TEXT,
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
  },
  answered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "submissionanswer",
  timestamps: false,
});

module.exports = SubmissionAnswer;
