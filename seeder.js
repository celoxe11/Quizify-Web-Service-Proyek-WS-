const mysql = require('mysql2/promise');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function seedDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // sesuaikan
    multipleStatements: true
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS Quizify; CREATE DATABASE Quizify; USE Quizify;`);

    const schema = `
      DROP TABLE IF EXISTS SubmissionAnswer;
      DROP TABLE IF EXISTS QuizSession;
      DROP TABLE IF EXISTS QuestionAccuracy;
      DROP TABLE IF EXISTS QuestionImage;
      DROP TABLE IF EXISTS Question;
      DROP TABLE IF EXISTS Quiz;
      DROP TABLE IF EXISTS USER;
      DROP TABLE IF EXISTS Subscription;
      DROP TABLE IF EXISTS UserLog;

      CREATE TABLE Subscription (
        id_subs INT PRIMARY KEY AUTO_INCREMENT,
        status VARCHAR(50) DEFAULT 'Free'
      );

      CREATE TABLE USER (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('teacher', 'student') NOT NULL,
        subscription_id INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE Quiz (
        id VARCHAR(10) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        created_by VARCHAR(10),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE Question (
        id VARCHAR(10) PRIMARY KEY,
        quiz_id VARCHAR(10),
        category VARCHAR(100),
        type ENUM('multiple', 'boolean') NOT NULL,
        difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
        question_text TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        incorrect_answers JSON NOT NULL,
        is_generated BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE QuestionImage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL,
        question_id VARCHAR(10) NOT NULL,
        image_url TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE QuizSession (
        id VARCHAR(10) PRIMARY KEY,
        quiz_id VARCHAR(10) NOT NULL,
        user_id VARCHAR(10) NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        score INT,
        status ENUM('in_progress', 'completed', 'expired') DEFAULT 'in_progress'
      );

      CREATE TABLE SubmissionAnswer (
        id VARCHAR(10) PRIMARY KEY,
        quiz_session_id VARCHAR(10) NOT NULL,
        question_id VARCHAR(10) NOT NULL,
        selected_answer TEXT,
        is_correct BOOLEAN,
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE UserLog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL,
        action_type VARCHAR(255) NOT NULL,
        endpoint VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await connection.query(schema);

    // Insert Subscription Tiers
    await connection.query(`
      INSERT INTO Subscription (status) VALUES ('Free'), ('Premium');
    `);

    // Ambil ID dari Subscription berdasarkan status
    const [subsRows] = await connection.query(`SELECT id_subs, status FROM Subscription`);
    const subsMap = {};
    for (const row of subsRows) {
      subsMap[row.status] = row.id_subs;
    }

    // Generate users using Faker
    const users = [];
    const roles = ['teacher', 'student'];
    for (let i = 1; i <= 10; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)];
      const prefix = role === 'teacher' ? 'TE' : 'ST';
      const id = `${prefix}${i.toString().padStart(3, '0')}`;

      const name = faker.person.fullName();
      const username = faker.internet.userName().toLowerCase();
      const email = faker.internet.email().toLowerCase();
      const rawPassword = faker.internet.password({ length: 10 });
      const password_hash = await hashPassword(rawPassword);
      const subscription_id = role === 'teacher' ? subsMap["Premium"] : subsMap["Free"];

      console.log(`🔐 ${email} | password: ${rawPassword}`);
      users.push([id, name, username, email, password_hash, role, subscription_id]);
    }

    await connection.query(
      `INSERT INTO USER (id, name, username, email, password_hash, role, subscription_id) VALUES ?`,
      [users]
    );

    // Generate quizzes for teachers only
    const quizzes = [];
    for (let i = 1; i <= 5; i++) {
      const id = `QU${i.toString().padStart(3, '0')}`;
      const title = faker.lorem.words(3);
      const description = faker.lorem.sentence();
      const categories = ['Science', 'History', 'Math', 'Geography'];
      const category = categories[Math.floor(Math.random() * categories.length)];

      const teachers = users.filter(u => u[5] === 'teacher');
      const teacher = teachers[Math.floor(Math.random() * teachers.length)];
      const created_by = teacher[0];

      quizzes.push([id, title, description, category, created_by]);
    }

    await connection.query(
      `INSERT INTO Quiz (id, title, description, category, created_by) VALUES ?`,
      [quizzes]
    );

    // Generate questions
    const questions = [];
    let qIdCounter = 1;
    const difficulties = ['easy', 'medium', 'hard'];
    const types = ['multiple', 'boolean'];

    for (const quiz of quizzes) {
      const quiz_id = quiz[0];
      const numQuestions = faker.number.int({ min: 3, max: 7 });

      for (let j = 0; j < numQuestions; j++) {
        const id = `Q${qIdCounter.toString().padStart(3, '0')}`;
        qIdCounter++;
        const category = quiz[3];
        const type = types[Math.floor(Math.random() * types.length)];
        const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        const question_text = faker.lorem.sentence();
        const correct_answer = type === 'boolean' ? faker.helpers.arrayElement(['True', 'False']) : faker.lorem.word();
        const incorrect_answers = type === 'boolean'
          ? JSON.stringify([correct_answer === 'True' ? 'False' : 'True'])
          : JSON.stringify([faker.lorem.word(), faker.lorem.word(), faker.lorem.word()]);
        const is_generated = true;

        questions.push([
          id, quiz_id, category, type, difficulty,
          question_text, correct_answer, incorrect_answers, is_generated
        ]);
      }
    }

    await connection.query(
      `INSERT INTO Question (id, quiz_id, category, type, difficulty, question_text, correct_answer, incorrect_answers, is_generated) VALUES ?`,
      [questions]
    );

    console.log("Database dan data dummy berhasil dibuat dengan Faker.");
  } catch (err) {
    console.error('Gagal setup database:', err);
  } finally {
    await connection.end();
  }
}

seedDatabase();
