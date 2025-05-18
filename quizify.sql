DROP DATABASE IF EXISTS Quizify;
CREATE DATABASE Quizify;
USE Quizify;

-- Drop tables in reverse order
DROP TABLE IF EXISTS SubmissionAnswer;
DROP TABLE IF EXISTS QuizSession;
DROP TABLE IF EXISTS QuestionAccuracy;
DROP TABLE IF EXISTS Question;
DROP TABLE IF EXISTS Quiz;
DROP TABLE IF EXISTS USER;
DROP TABLE IF EXISTS Subscription;
DROP TABLE IF EXISTS UserLog;

-- SUBSCRIPTION
CREATE TABLE Subscription (
    id_subs INT PRIMARY KEY AUTO_INCREMENT,
    STATUS ENUM ('Premium', 'Free') DEFAULT 'Free'
);

-- USER
CREATE TABLE USER (
    id VARCHAR(10) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('teacher', 'student') NOT NULL,
    subscription_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscription(id_subs) ON DELETE RESTRICT
);

-- QUIZ
CREATE TABLE Quiz (
    id VARCHAR(10) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_by VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES USER(id) ON DELETE SET NULL
);

-- QUESTION
CREATE TABLE Question (
    id VARCHAR(10) PRIMARY KEY,
    quiz_id VARCHAR(10),
    category VARCHAR(100),
    TYPE ENUM('multiple', 'boolean') NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    incorrect_answers JSON NOT NULL,
    is_generated BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES Quiz(id) ON DELETE SET NULL
);

CREATE TABLE UserLog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL,
    action_type VARCHAR(255) NOT NULL,
    ENDPOINT VARCHAR(255), 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE
);

-- QUIZ SESSION
CREATE TABLE QuizSession (
    id VARCHAR(10) PRIMARY KEY,
    quiz_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(10) NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    score INT,
    `status` ENUM('in_progress', 'completed', 'expired') DEFAULT 'in_progress',
    FOREIGN KEY (quiz_id) REFERENCES Quiz(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE
);

-- SUBMISSION ANSWER
CREATE TABLE SubmissionAnswer (
    id VARCHAR(10) PRIMARY KEY,
    quiz_session_id VARCHAR(10) NOT NULL,
    question_id VARCHAR(10) NOT NULL,
    selected_answer TEXT,
    is_correct BOOLEAN,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_session_id) REFERENCES QuizSession(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES Question(id) ON DELETE CASCADE
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES Question(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES Quiz(id) ON DELETE SET NULL
);

-- INSERT SUBSCRIPTIONS
INSERT INTO Subscription (STATUS) VALUES
('Free'),
('Premium');

-- INSERT USERS
INSERT INTO USER (id, NAME, email, password_hash, role, subscription_id)
VALUES
('TE001', 'Alice Teacher', 'alice@quizify.com', 'hashed_pass_1', 'teacher', 2),
('ST002', 'Bob Student', 'bob@student.com', 'hashed_pass_2', 'student', 1),
('ST003', 'Charlie Admin', 'charlie@admin.com', 'hashed_pass_3', 'student', 2);

-- QUIZZES
INSERT INTO Quiz (id, title, description, category, created_by)
VALUES
('SC001', 'Science Quiz', 'Test your science knowledge!', 'Science', 'TE001'),
('HI002', 'History Basics', 'A quiz on world history.', 'History', 'TE001'),
('MI003', 'Mixed Knowledge', 'Combination of topics.', NULL, 'TE001');

-- QUESTIONS
INSERT INTO Question (id, quiz_id, category, TYPE, difficulty, question_text, correct_answer, incorrect_answers, is_generated)
VALUES
('Q001', 'SC001', 'Science: Computers', 'multiple', 'easy', 'What does CPU stand for?', 'Central Processing Unit', '["Computer Personal Unit", "Central Processor Unit", "Computer Processing Unit"]', TRUE),
('Q002', 'SC001', 'Science: Computers', 'boolean', 'medium', 'The GPU is primarily used for rendering graphics.', 'True', '["False"]', TRUE),
('Q003', 'HI002', 'History', 'multiple', 'hard', 'Who was the first emperor of Rome?', 'Augustus', '["Julius Caesar", "Nero", "Caligula"]', FALSE);

-- QUIZ SESSIONS
INSERT INTO QuizSession (id, quiz_id, user_id, started_at, ended_at, score, STATUS)
VALUES
('S001', 'SC001', 'ST002', NOW(), NOW(), 80, 'completed'),
('S002', 'HI002', 'ST002', NOW(), NOW(), 60, 'completed'),
('S003', 'MI003', 'ST002', NOW(), NULL, NULL, 'in_progress');

-- SUBMISSION ANSWERS
INSERT INTO SubmissionAnswer (id, quiz_session_id, question_id, selected_answer, is_correct)
VALUES
('SA001', 'S001', 'Q001', 'Central Processing Unit', TRUE),
('SA002', 'S001', 'Q002', 'True', TRUE),
('SA003', 'S002', 'Q003', 'Julius Caesar', FALSE);

-- QUESTION ACCURACY
INSERT INTO QuestionAccuracy (id, question_id, quiz_id, total_answered, correct_answers, incorrect_answers)
VALUES
('QA001', 'Q001', 'SC001', 5, 4, 1),
('QA002', 'Q002', 'SC001', 5, 5, 0),
('QA003', 'Q003', 'HI002', 5, 2, 3);
