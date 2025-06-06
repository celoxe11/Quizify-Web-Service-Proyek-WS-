DROP DATABASE IF EXISTS Quizify;
CREATE DATABASE Quizify;
USE Quizify;

-- Drop tables in reverse order
DROP TABLE IF EXISTS SubmissionAnswer;
DROP TABLE IF EXISTS QuizSession;
DROP TABLE IF EXISTS QuestionAccuracy;
DROP TABLE IF EXISTS Question;
DROP TABLE IF EXISTS QuestionImage;
DROP TABLE IF EXISTS Quiz;
DROP TABLE IF EXISTS USER;
DROP TABLE IF EXISTS Subscription;
DROP TABLE IF EXISTS UserLog;

-- SUBSCRIPTION
CREATE TABLE Subscription (
    id_subs INT PRIMARY KEY AUTO_INCREMENT,
    STATUS VARCHAR(50) DEFAULT 'Free'
);

-- USER
CREATE TABLE USER (
    id VARCHAR(10) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('teacher', 'student') NOT NULL,
    subscription_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- QUIZ
CREATE TABLE Quiz (
    id VARCHAR(10) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_by VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- QUESTION
CREATE TABLE Question (
    id VARCHAR(10) PRIMARY KEY,
    quiz_id VARCHAR(10),
    category VARCHAR(100),
    `type` ENUM('multiple', 'boolean') NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    incorrect_answers JSON NOT NULL,
    is_generated BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_subscribe DATETIME
);

-- QUESTIONS IMAGE
CREATE TABLE QuestionImage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL,
    question_id VARCHAR(10) NOT NULL,
    image_url TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE UserLog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL,
    action_type VARCHAR(255) NOT NULL,
    `endpoint` VARCHAR(255), 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- QUIZ SESSION
CREATE TABLE QuizSession (
    id VARCHAR(10) PRIMARY KEY,
    quiz_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(10) NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    score INT,
    `status` ENUM('in_progress', 'completed', 'expired') DEFAULT 'in_progress'
);

-- SUBMISSION ANSWER
CREATE TABLE SubmissionAnswer (
    id VARCHAR(10) PRIMARY KEY,
    quiz_session_id VARCHAR(10) NOT NULL,
    question_id VARCHAR(10) NOT NULL,
    selected_answer TEXT,
    is_correct BOOLEAN,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- QUESTION ACCURACY
CREATE TABLE QuestionAccuracy (
    id VARCHAR(10) PRIMARY KEY,
    question_id VARCHAR(10) NOT NULL,
    quiz_id VARCHAR(10),
    total_answered INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    incorrect_answers INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);