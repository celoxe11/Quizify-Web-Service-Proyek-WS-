const admin = require("firebase-admin");
const mysql = require("mysql2/promise");
const serviceAccount = require("./serviceAccountKey.json");

// 1. Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function seedDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "", // sesuaikan
    multipleStatements: true,
  });

  try {
    await connection.query(
      `DROP DATABASE IF EXISTS quizify; CREATE DATABASE quizify; USE quizify;`
    );

    const schema = `
      DROP TABLE IF EXISTS submissionanswer;
      DROP TABLE IF EXISTS quizsession;
      DROP TABLE IF EXISTS questionaccuracy;
      DROP TABLE IF EXISTS questionimage;
      DROP TABLE IF EXISTS question;
      DROP TABLE IF EXISTS quiz;
      DROP TABLE IF EXISTS user;
      DROP TABLE IF EXISTS subscription;
      DROP TABLE IF EXISTS userlog;

      CREATE TABLE subscription (
        id_subs INT NOT NULL AUTO_INCREMENT,
        status VARCHAR(50) DEFAULT 'Free',
        PRIMARY KEY (id_subs)
      ) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE user (
        id VARCHAR(10) NOT NULL,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        firebase_uid VARCHAR(128) UNIQUE DEFAULT NULL,
        role ENUM('teacher','student', "admin") NOT NULL,
        subscription_id INT NOT NULL,
        is_active TINYINT(1) DEFAULT '1',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY username (username),
        UNIQUE KEY email (email),
        KEY idx_firebase_uid (firebase_uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE quiz (
        id VARCHAR(10) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM("private", "public") DEFAULT "private",
        category VARCHAR(100) DEFAULT NULL,
        created_by VARCHAR(10) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE question (
        id VARCHAR(10) NOT NULL,
        quiz_id VARCHAR(10) DEFAULT NULL,
        type ENUM('multiple','boolean') NOT NULL,
        difficulty ENUM('easy','medium','hard') NOT NULL,
        question_text TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        options JSON NOT NULL,
        is_generated TINYINT(1) DEFAULT '0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE questionimage (
        id INT NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(10) NOT NULL,
        question_id VARCHAR(10) NOT NULL,
        image_url TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE quizsession (
        id VARCHAR(10) NOT NULL,
        quiz_id VARCHAR(10) NOT NULL,
        user_id VARCHAR(10) NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME DEFAULT NULL,
        score INT DEFAULT NULL,
        status ENUM('in_progress','completed','expired') DEFAULT 'in_progress',
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE submissionanswer (
        id VARCHAR(10) NOT NULL,
        quiz_session_id VARCHAR(10) NOT NULL,
        question_id VARCHAR(10) NOT NULL,
        selected_answer TEXT,
        is_correct TINYINT(1) DEFAULT NULL,
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE questionaccuracy (
        id VARCHAR(10) NOT NULL,
        question_id VARCHAR(10) NOT NULL,
        quiz_id VARCHAR(10) DEFAULT NULL,
        total_answered INT DEFAULT '0',
        correct_answers INT DEFAULT '0',
        incorrect_answers INT DEFAULT '0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE userlog (
        id INT NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(10) NOT NULL,
        action_type VARCHAR(255) NOT NULL,
        endpoint VARCHAR(255) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;

    await connection.query(schema);

    console.log("Database tables created successfully!");

    // --- 2. SEED SUBSCRIPTIONS ---
    console.log("Seeding Reference Data (Subscriptions)...");
    await connection.query(
      `INSERT INTO subscription (status) VALUES ('Free'), ('Premium')`
    );

    // --- 3. SYNC USERS FROM FIREBASE TO MYSQL ---
    console.log("Fetching Users from Firebase...");

    const listUsersResult = await admin.auth().listUsers(1000);
    const firebaseUsers = listUsersResult.users;

    if (firebaseUsers.length > 0) {
      console.log(
        `   Found ${firebaseUsers.length} users in Firebase. Syncing to MySQL...`
      );

      const userValues = [];
      // Counters to generate sequential IDs per role (TE001, ST001, ...)
      // Initialize counters from existing DB values to avoid primary-key collisions
      const [teacherRows] = await connection.query(
        "SELECT MAX(CAST(SUBSTRING(id,3) AS UNSIGNED)) AS maxNum FROM user WHERE role = 'teacher'"
      );
      const [studentRows] = await connection.query(
        "SELECT MAX(CAST(SUBSTRING(id,3) AS UNSIGNED)) AS maxNum FROM user WHERE role = 'student'"
      );
      const teacherMax =
        teacherRows && teacherRows[0] && teacherRows[0].maxNum
          ? teacherRows[0].maxNum
          : 0;
      const studentMax =
        studentRows && studentRows[0] && studentRows[0].maxNum
          ? studentRows[0].maxNum
          : 0;
      const counters = { teacher: teacherMax + 1, student: studentMax + 1 };

      for (const fbUser of firebaseUsers) {
        // DATA MAPPING LOGIC
        const name = fbUser.displayName || "Anonymous"; // Handle missing names
        const email = fbUser.email;

        // Generate a username from email if missing (e.g., johndoe from johndoe@gmail.com)
        const username = email
          ? email.split("@")[0]
          : "user_" + Math.random().toString(36).substring(2, 8);

        if (username == "admin") {
          let adminName = "Administrator";
          const role = "admin";
          const generatedId = "AD001";
          const subscriptionId = 1;
          userValues.push([
            generatedId,
            adminName,
            username,
            email,
            fbUser.uid,
            role,
            subscriptionId,
          ]);
          continue;
        }

        // Determine role from Firebase custom claims if available, otherwise default to 'student'
        const role =
          fbUser.customClaims && fbUser.customClaims.role === "teacher"
            ? "teacher"
            : "student";

        // Generate ID like TE001 or ST001 using counters
        const prefix = role === "teacher" ? "TE" : "ST";
        const idNumber = counters[role]++;
        const generatedId = `${prefix}${idNumber.toString().padStart(3, "0")}`;

        // Default Subscription: 1 (Free)
        const subscriptionId = 1;

        userValues.push([
          generatedId,
          name,
          username,
          email,
          fbUser.uid, // The Firebase UID goes into firebase_uid column
          role,
          subscriptionId,
        ]);
      }

      const insertQuery = `
            INSERT INTO user (id, name, username, email, firebase_uid, role, subscription_id) 
            VALUES ?
        `;

      await connection.query(insertQuery, [userValues]);
      console.log("   Users synced successfully!");
    } else {
      console.log("   No users found in Firebase.");
    }

    // --- 4. SEED DUMMY DATA ---
    console.log("Seeding Dummy Data...");

    // Add dummy users if no Firebase users
    if (firebaseUsers.length === 0) {
      console.log("   Adding dummy users...");
      await connection.query(`
        INSERT INTO user (id, name, username, email, firebase_uid, role, subscription_id) VALUES
        ('AD001', 'Administrator', 'admin', 'admin@quizify.com', NULL, 'admin', 1),
        ('TE001', 'John Teacher', 'john_teacher', 'john@teacher.com', NULL, 'teacher', 2),
        ('TE002', 'Jane Educator', 'jane_educator', 'jane@teacher.com', NULL, 'teacher', 1),
        ('ST001', 'Alice Student', 'alice_student', 'alice@student.com', NULL, 'student', 1),
        ('ST002', 'Bob Learner', 'bob_learner', 'bob@student.com', NULL, 'student', 1),
        ('ST003', 'Charlie Pupil', 'charlie_pupil', 'charlie@student.com', NULL, 'student', 2)
      `);
      console.log("   Dummy users added successfully!");
    }

    // Add dummy quizzes
    console.log("   Adding dummy quizzes...");
    await connection.query(`
      INSERT INTO quiz (id, title, description, status, category, created_by) VALUES
      ('QU001', 'General Knowledge Quiz', 'Test your general knowledge across various topics', 'public', 'General', 'TE001'),
      ('QU002', 'Mathematics Basic', 'Basic mathematics quiz for beginners', 'public', 'Mathematics', 'TE001'),
      ('QU003', 'Science Fundamentals', 'Fundamental concepts in science', 'private', 'Science', 'TE002'),
      ('QU004', 'History Quiz', 'Test your knowledge about world history', 'public', 'History', 'TE002')
    `);
    console.log("   Dummy quizzes added successfully!");

    // Add dummy questions
    console.log("   Adding dummy questions...");
    await connection.query(`
      INSERT INTO question (id, quiz_id, type, difficulty, question_text, correct_answer, options, is_generated) VALUES
      ('Q001', 'QU001', 'multiple', 'easy', 'What is the capital of France?', 'Paris', '["Paris", "London", "Berlin", "Madrid"]', 0),
      ('Q002', 'QU001', 'multiple', 'medium', 'Which planet is known as the Red Planet?', 'Mars', '["Mars", "Venus", "Jupiter", "Saturn"]', 0),
      ('Q003', 'QU001', 'boolean', 'easy', 'The Earth is flat.', 'False', '["True", "False"]', 0),
      
      ('Q004', 'QU002', 'multiple', 'easy', 'What is 5 + 3?', '8', '["6", "7", "8", "9"]', 0),
      ('Q005', 'QU002', 'multiple', 'medium', 'What is 12 × 12?', '144', '["120", "132", "144", "156"]', 0),
      ('Q006', 'QU002', 'boolean', 'easy', 'Is 10 divisible by 3?', 'False', '["True", "False"]', 0),
      
      ('Q007', 'QU003', 'multiple', 'medium', 'What is the chemical symbol for water?', 'H2O', '["H2O", "CO2", "O2", "N2"]', 0),
      ('Q008', 'QU003', 'multiple', 'hard', 'What is the speed of light?', '299,792,458 m/s', '["299,792,458 m/s", "300,000,000 m/s", "150,000,000 m/s", "250,000,000 m/s"]', 0),
      
      ('Q009', 'QU004', 'multiple', 'medium', 'In which year did World War II end?', '1945', '["1943", "1944", "1945", "1946"]', 0),
      ('Q010', 'QU004', 'boolean', 'easy', 'The Great Wall of China was built in the 20th century.', 'False', '["True", "False"]', 0)
    `);
    console.log("   Dummy questions added successfully!");

    // Add dummy quiz sessions
    console.log("   Adding dummy quiz sessions...");
    await connection.query(`
      INSERT INTO quizsession (id, quiz_id, user_id, started_at, ended_at, score, status) VALUES
      ('S001', 'QU001', 'ST001', '2024-12-01 10:00:00', '2024-12-01 10:15:00', 100, 'completed'),
      ('S002', 'QU001', 'ST002', '2024-12-01 11:00:00', '2024-12-01 11:20:00', 67, 'completed'),
      ('S003', 'QU002', 'ST001', '2024-12-02 14:00:00', '2024-12-02 14:12:00', 100, 'completed'),
      ('S004', 'QU002', 'ST003', '2024-12-03 09:00:00', '2024-12-03 09:18:00', 67, 'completed'),
      ('S005', 'QU004', 'ST002', '2024-12-05 15:00:00', NULL, NULL, 'in_progress')
    `);
    console.log("   Dummy quiz sessions added successfully!");

    // Add dummy submission answers
    console.log("   Adding dummy submission answers...");
    await connection.query(`
      INSERT INTO submissionanswer (id, quiz_session_id, question_id, selected_answer, is_correct, answered_at) VALUES
      ('SA001', 'S001', 'Q001', 'Paris', 1, '2024-12-01 10:05:00'),
      ('SA002', 'S001', 'Q002', 'Mars', 1, '2024-12-01 10:10:00'),
      ('SA003', 'S001', 'Q003', 'False', 1, '2024-12-01 10:15:00'),
      
      ('SA004', 'S002', 'Q001', 'Paris', 1, '2024-12-01 11:05:00'),
      ('SA005', 'S002', 'Q002', 'Venus', 0, '2024-12-01 11:12:00'),
      ('SA006', 'S002', 'Q003', 'False', 1, '2024-12-01 11:20:00'),
      
      ('SA007', 'S003', 'Q004', '8', 1, '2024-12-02 14:03:00'),
      ('SA008', 'S003', 'Q005', '144', 1, '2024-12-02 14:08:00'),
      ('SA009', 'S003', 'Q006', 'False', 1, '2024-12-02 14:12:00'),
      
      ('SA010', 'S004', 'Q004', '8', 1, '2024-12-03 09:05:00'),
      ('SA011', 'S004', 'Q005', '132', 0, '2024-12-03 09:12:00'),
      ('SA012', 'S004', 'Q006', 'False', 1, '2024-12-03 09:18:00')
    `);
    console.log("   Dummy submission answers added successfully!");

    // Add dummy question accuracy
    console.log("   Adding dummy question accuracy...");
    await connection.query(`
      INSERT INTO questionaccuracy (id, question_id, quiz_id, total_answered, correct_answers, incorrect_answers) VALUES
      ('QA001', 'Q001', 'QU001', 2, 2, 0),
      ('QA002', 'Q002', 'QU001', 2, 1, 1),
      ('QA003', 'Q003', 'QU001', 2, 2, 0),
      ('QA004', 'Q004', 'QU002', 2, 2, 0),
      ('QA005', 'Q005', 'QU002', 2, 1, 1),
      ('QA006', 'Q006', 'QU002', 2, 2, 0)
    `);
    console.log("   Dummy question accuracy added successfully!");

    // Add dummy user logs
    console.log("   Adding dummy user logs...");
    await connection.query(`
      INSERT INTO userlog (user_id, action_type, endpoint, created_at) VALUES
      ('ST001', 'START_QUIZ', '/api/student/quiz/QU001/start', '2024-12-01 10:00:00'),
      ('ST001', 'SUBMIT_QUIZ', '/api/student/quiz/submit', '2024-12-01 10:15:00'),
      ('ST002', 'START_QUIZ', '/api/student/quiz/QU001/start', '2024-12-01 11:00:00'),
      ('ST002', 'SUBMIT_QUIZ', '/api/student/quiz/submit', '2024-12-01 11:20:00'),
      ('TE001', 'CREATE_QUIZ', '/api/teacher/quiz', '2024-11-28 09:00:00'),
      ('TE001', 'CREATE_QUESTION', '/api/teacher/question', '2024-11-28 09:30:00'),
      ('TE002', 'CREATE_QUIZ', '/api/teacher/quiz', '2024-11-29 10:00:00'),
      ('ST003', 'START_QUIZ', '/api/student/quiz/QU002/start', '2024-12-03 09:00:00'),
      ('ST003', 'SUBMIT_QUIZ', '/api/student/quiz/submit', '2024-12-03 09:18:00')
    `);
    console.log("   Dummy user logs added successfully!");

    console.log("\n✅ All dummy data seeded successfully!");
  } catch (err) {
    console.error("Failed to setup database:", err);
  } finally {
    await connection.end();
  }
}

seedDatabase();
