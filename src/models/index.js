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
const Transaction = require('./Transaction');
const Item = require('./Item');
const Avatar = require('./Avatar');
const UserAvatar = require('./UserAvatar');

// --- 1. USER & SUBSCRIPTION ---

// User <-> Subscription
User.belongsTo(Subscription, { 
  foreignKey: 'subscription_id', 
  targetKey: 'id_subs',  
  as: 'subscription',   
  constraints: false 
});

Subscription.hasMany(User, { 
  foreignKey: 'subscription_id', 
  sourceKey: 'id_subs', 
  constraints: false 
});

// --- 2. USER & AVATAR (SHOP/PROFILE) ---

// A. User memakai Avatar (Baju yang dipakai)
User.belongsTo(Avatar, { 
    foreignKey: 'current_avatar_id', 
    as: 'activeAvatar', 
    constraints: false 
});

// B. User punya banyak Avatar (Inventory - Many-to-Many)
User.belongsToMany(Avatar, { 
    through: UserAvatar, 
    foreignKey: 'user_id', 
    otherKey: 'avatar_id', 
    as: 'inventory', // Gunakan satu alias saja (inventory lebih cocok)
    constraints: false 
});
// (Opsional: Reverse relation jika ingin lihat siapa saja yg punya avatar tertentu)
Avatar.belongsToMany(User, { 
    through: UserAvatar, 
    foreignKey: 'avatar_id', 
    otherKey: 'user_id', 
    constraints: false 
});

// C. Relasi Manual ke Tabel Pivot (Untuk query detail kapan beli, dll)
User.hasMany(UserAvatar, { foreignKey: 'user_id', constraints: false });
UserAvatar.belongsTo(User, { foreignKey: 'user_id', constraints: false });

Avatar.hasMany(UserAvatar, { foreignKey: 'avatar_id', constraints: false });
UserAvatar.belongsTo(Avatar, { foreignKey: 'avatar_id', constraints: false });


// --- 3. USER LOG & ACTIVITY ---

User.hasMany(UserLog, { foreignKey: 'user_id', constraints: false });
UserLog.belongsTo(User, { foreignKey: 'user_id', targetKey: 'id', constraints: false });


// --- 4. QUIZ CORE ---

// User <-> Quiz (Creator)
User.hasMany(Quiz, { foreignKey: 'created_by', constraints: false });
Quiz.belongsTo(User, { foreignKey: 'created_by', targetKey: 'id', constraints: false });

// Quiz <-> Question
Quiz.hasMany(Question, { foreignKey: 'quiz_id', constraints: false });
Question.belongsTo(Quiz, { foreignKey: 'quiz_id', constraints: false });

// Question <-> QuestionImage
Question.hasMany(QuestionImage, { foreignKey: 'question_id', constraints: false });
QuestionImage.belongsTo(Question, { foreignKey: 'question_id', constraints: false });

// User <-> QuestionImage (Uploader)
User.hasMany(QuestionImage, { foreignKey: 'user_id', constraints: false });
QuestionImage.belongsTo(User, { foreignKey: 'user_id', constraints: false });


// --- 5. QUIZ SESSION & SCORING ---

// Quiz <-> QuizSession
Quiz.hasMany(QuizSession, { foreignKey: 'quiz_id', constraints: false });
QuizSession.belongsTo(Quiz, { foreignKey: 'quiz_id', constraints: false });

// User <-> QuizSession
User.hasMany(QuizSession, { foreignKey: 'user_id', constraints: false });
QuizSession.belongsTo(User, { foreignKey: 'user_id', constraints: false });

// QuizSession <-> SubmissionAnswer
QuizSession.hasMany(SubmissionAnswer, { foreignKey: 'quiz_session_id', constraints: false });
SubmissionAnswer.belongsTo(QuizSession, { foreignKey: 'quiz_session_id', constraints: false });

// Question <-> SubmissionAnswer
Question.hasMany(SubmissionAnswer, { foreignKey: 'question_id', constraints: false });
SubmissionAnswer.belongsTo(Question, { foreignKey: 'question_id', constraints: false });


// --- 6. ANALYTICS ---

// Question <-> QuestionAccuracy
Question.hasOne(QuestionAccuracy, { foreignKey: 'question_id', constraints: false });
QuestionAccuracy.belongsTo(Question, { foreignKey: 'question_id', constraints: false });

// Quiz <-> QuestionAccuracy
Quiz.hasMany(QuestionAccuracy, { foreignKey: 'quiz_id', constraints: false });
QuestionAccuracy.belongsTo(Quiz, { foreignKey: 'quiz_id', constraints: false });


// --- 7. TRANSACTION & PAYMENTS ---

// User <-> Transaction
User.hasMany(Transaction, { foreignKey: 'user_id', constraints: false });
Transaction.belongsTo(User, { foreignKey: 'user_id', constraints: false });

// Subscription <-> Transaction
Subscription.hasMany(Transaction, { foreignKey: 'subscription_id', sourceKey: 'id_subs', constraints: false });
Transaction.belongsTo(Subscription, { foreignKey: 'subscription_id', targetKey: 'id_subs', as: 'subscription_detail', constraints: false });

// Item <-> Transaction (Untuk pembelian Avatar/Item Satuan)
Item.hasMany(Transaction, { foreignKey: 'item_id', constraints: false });
Transaction.belongsTo(Item, { foreignKey: 'item_id', as: 'item_detail', constraints: false });


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
  Transaction,
  Item,
  Avatar,
  UserAvatar
};