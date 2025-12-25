const sequelize = require('../database/connection');
const User = require('./User');
const UserLog = require('./UserLog');
const Subscription = require('./Subscription');
const Quiz = require('./Quiz');
const Question = require('./Question');
const QuestionImage = require('./QuestionImage');
const QuestionAccuracy = require('./QuestionAccuracy');
const QuizSession = require('./QuizSession');
const SubmissionAnswer = require('./SubmissionAnswer');

// Define the association options to disable constraints
const associationOptions = {
  foreignKey: { name: 'subscription_id' },
  constraints: false
};

// 1. User <-> Subscription
User.belongsTo(Subscription, { 
  foreignKey: 'subscription_id', 
  targetKey: 'id_subs',  
  as: 'subscription',   
  constraints: false 
});

// 2. Subscription "Punya Banyak" User
// Di sini kita pakai sourceKey (Sumbernya dari id_subs milik Subscription)
Subscription.hasMany(User, { 
  foreignKey: 'subscription_id', 
  sourceKey: 'id_subs', 
  constraints: false 
});

// 2. User <-> UserLog
User.hasMany(UserLog, { foreignKey: 'user_id', constraints: false });
UserLog.belongsTo(User, { foreignKey: 'user_id', targetKey: 'id', constraints: false });

// 3. User <-> Quiz (creator)
User.hasMany(Quiz, { foreignKey: 'created_by', constraints: false });
Quiz.belongsTo(User, { foreignKey: 'created_by', targetKey: 'id', constraints: false });

// 4. Quiz <-> Question
Quiz.hasMany(Question, { foreignKey: 'quiz_id', constraints: false });
Question.belongsTo(Quiz, { foreignKey: 'quiz_id', constraints: false });

// 5. Question <-> QuestionImage
Question.hasMany(QuestionImage, { foreignKey: 'question_id', constraints: false });
QuestionImage.belongsTo(Question, { foreignKey: 'question_id', constraints: false });

// 6. User <-> QuestionImage
User.hasMany(QuestionImage, { foreignKey: 'user_id', constraints: false });
QuestionImage.belongsTo(User, { foreignKey: 'user_id', constraints: false });

// 7. Quiz <-> QuizSession
Quiz.hasMany(QuizSession, { foreignKey: 'quiz_id', constraints: false });
QuizSession.belongsTo(Quiz, { foreignKey: 'quiz_id', constraints: false });

// 8. User <-> QuizSession
User.hasMany(QuizSession, { foreignKey: 'user_id', constraints: false });
QuizSession.belongsTo(User, { foreignKey: 'user_id', constraints: false });

// 9. QuizSession <-> SubmissionAnswer
QuizSession.hasMany(SubmissionAnswer, { foreignKey: 'quiz_session_id', constraints: false });
SubmissionAnswer.belongsTo(QuizSession, { foreignKey: 'quiz_session_id', constraints: false });

// 10. Question <-> SubmissionAnswer
Question.hasMany(SubmissionAnswer, { foreignKey: 'question_id', constraints: false });
SubmissionAnswer.belongsTo(Question, { foreignKey: 'question_id', constraints: false });

// 11. Question <-> QuestionAccuracy
Question.hasOne(QuestionAccuracy, { foreignKey: 'question_id', constraints: false });
QuestionAccuracy.belongsTo(Question, { foreignKey: 'question_id', constraints: false });

// 12. Quiz <-> QuestionAccuracy
Quiz.hasMany(QuestionAccuracy, { foreignKey: 'quiz_id', constraints: false });
QuestionAccuracy.belongsTo(Quiz, { foreignKey: 'quiz_id', constraints: false });

module.exports = {
  sequelize,
  User,
  UserLog,
  Subscription,
  Quiz,
  Question,
  QuestionImage,
  QuestionAccuracy,
  QuizSession,
  SubmissionAnswer,
};
