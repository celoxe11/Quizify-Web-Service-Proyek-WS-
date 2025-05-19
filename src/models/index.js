const User = require('./User');
const UserLog = require('./UserLog');
const Subscription = require('./Subscription');
const Quiz = require('./Quiz');
const Question = require('./Question');
const QuestionImage = require('./QuestionImage');
const QuestionAccuracy = require('./QuestionAccuracy');
const QuizSession = require('./QuizSession');
const SubmissionAnswer = require('./SubmissionAnswer');

// 1. User <-> Subscription
User.belongsTo(Subscription, { foreignKey: 'subscription_id' });
Subscription.hasMany(User, { foreignKey: 'subscription_id' });

// 2. User <-> UserLog
User.hasMany(UserLog, { foreignKey: 'user_id' });
UserLog.belongsTo(User, { foreignKey: 'user_id' });

// 3. User <-> Quiz (creator)
User.hasMany(Quiz, { foreignKey: 'created_by' });
Quiz.belongsTo(User, { foreignKey: 'created_by' });

// 4. Quiz <-> Question
Quiz.hasMany(Question, { foreignKey: 'quiz_id' });
Question.belongsTo(Quiz, { foreignKey: 'quiz_id' });

// 5. Question <-> QuestionImage
Question.hasMany(QuestionImage, { foreignKey: 'question_id' });
QuestionImage.belongsTo(Question, { foreignKey: 'question_id' });

// 6. User <-> QuestionImage
User.hasMany(QuestionImage, { foreignKey: 'user_id' });
QuestionImage.belongsTo(User, { foreignKey: 'user_id' });

// 7. Quiz <-> QuizSession
Quiz.hasMany(QuizSession, { foreignKey: 'quiz_id' });
QuizSession.belongsTo(Quiz, { foreignKey: 'quiz_id' });

// 8. User <-> QuizSession
User.hasMany(QuizSession, { foreignKey: 'user_id' });
QuizSession.belongsTo(User, { foreignKey: 'user_id' });

// 9. QuizSession <-> SubmissionAnswer
QuizSession.hasMany(SubmissionAnswer, { foreignKey: 'quiz_session_id' });
SubmissionAnswer.belongsTo(QuizSession, { foreignKey: 'quiz_session_id' });

// 10. Question <-> SubmissionAnswer
Question.hasMany(SubmissionAnswer, { foreignKey: 'question_id' });
SubmissionAnswer.belongsTo(Question, { foreignKey: 'question_id' });

// 11. Question <-> QuestionAccuracy
Question.hasOne(QuestionAccuracy, { foreignKey: 'question_id' });
QuestionAccuracy.belongsTo(Question, { foreignKey: 'question_id' });

// 12. Quiz <-> QuestionAccuracy
Quiz.hasMany(QuestionAccuracy, { foreignKey: 'quiz_id' });
QuestionAccuracy.belongsTo(Quiz, { foreignKey: 'quiz_id' });

module.exports = {
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
