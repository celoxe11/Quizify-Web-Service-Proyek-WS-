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
    // === 1. DROP & CREATE DATABASE ===
    await connection.query(
      `DROP DATABASE IF EXISTS quizify; CREATE DATABASE quizify; USE quizify;`,
    );

    console.log("Database reset successfully.");

    // === 2. DEFINE SCHEMA ===
    // Urutan DROP penting untuk menghindari error constraint (jika ada)
    const schema = `
      DROP TABLE IF EXISTS submissionanswer;
      DROP TABLE IF EXISTS quizsession;
      DROP TABLE IF EXISTS questionaccuracy;
      DROP TABLE IF EXISTS questionimage;
      DROP TABLE IF EXISTS question;
      DROP TABLE IF EXISTS quiz;
      DROP TABLE IF EXISTS useravatar;   -- BARU
      DROP TABLE IF EXISTS transaction;
      DROP TABLE IF EXISTS userlog;
      DROP TABLE IF EXISTS user;
      DROP TABLE IF EXISTS item;         -- BARU
      DROP TABLE IF EXISTS avatar;       -- BARU
      DROP TABLE IF EXISTS subscription;

      -- A. TABEL REFERENCE UTAMA
      CREATE TABLE subscription (
        id_subs INT NOT NULL AUTO_INCREMENT,
        status VARCHAR(50) DEFAULT 'Free',
        price DECIMAL(10, 2) DEFAULT 0,
        PRIMARY KEY (id_subs)
      ) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE avatar (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        price DECIMAL(10, 2) DEFAULT 0,
        rarity ENUM('common', 'rare', 'epic', 'legendary') DEFAULT 'common',
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE item (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) DEFAULT 0,
        type ENUM('subscription', 'avatar', 'consumable') DEFAULT 'consumable',
        reference_id INT, 
        image_url TEXT,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      -- B. USER & PIVOT
      CREATE TABLE user (
        id VARCHAR(10) NOT NULL,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        firebase_uid VARCHAR(128) UNIQUE DEFAULT NULL,
        role ENUM('teacher','student', "admin") NOT NULL,
        subscription_id INT NOT NULL,
        current_avatar_id INT DEFAULT NULL, -- BARU: Avatar yang sedang dipakai
        is_active TINYINT(1) DEFAULT '1',
        points INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY username (username),
        UNIQUE KEY email (email),
        KEY idx_firebase_uid (firebase_uid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE useravatar (
        id INT NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(10) NOT NULL,
        avatar_id INT NOT NULL,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      -- C. TRANSAKSI (UPDATE STRUKTUR)
      CREATE TABLE transaction (
        id VARCHAR(10) NOT NULL,
        user_id VARCHAR(10) NOT NULL,
        subscription_id INT DEFAULT NULL, -- UBAH: Jadi Nullable
        item_id INT DEFAULT NULL,         -- BARU: Referensi ke Item Toko
        category ENUM('subscription', 'item') NOT NULL DEFAULT 'subscription', -- BARU
        amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
        payment_method VARCHAR(50) DEFAULT 'manual',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE quiz (
        id VARCHAR(10) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        quiz_code VARCHAR(20) UNIQUE DEFAULT NULL,
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

    // === 3. SEED REFERENCE DATA ===

    // A. Subscriptions
    console.log("Seeding Subscriptions...");
    await connection.query(
      `INSERT INTO subscription (status, price) VALUES 
       ('Free', 0), 
       ('Premium', 50000)`,
    );

    // B. Avatars
    console.log("Seeding Avatars...");
    // ID akan auto-increment mulai dari 1
    await connection.query(
      `INSERT INTO avatar (name, description, image_url, price, rarity) VALUES 
       ('Basic Student', 'Default avatar for students', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', 0, 'common'),
       ('Cool Cat', 'A cool cat avatar for cool students', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pepper', 15000, 'rare'),
       ('Robo Teacher', 'Beep boop, I am a robot', 'https://api.dicebear.com/7.x/bottts/svg?seed=Tech', 25000, 'epic'),
       ('Golden Graduate', 'Legendary avatar for top scorers', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Goldy', 100000, 'legendary')`,
    );

    // C. Items (Katalog Toko)
    // Kita buat item yang merepresentasikan Subscription dan Avatar
    console.log("Seeding Items (Shop Catalog)...");
    await connection.query(
      `INSERT INTO item (name, description, price, type, reference_id, image_url) VALUES 
        -- Item Subscription
        ('Premium Subscription', 'Unlock all features', 50000, 'subscription', 2, NULL),
        
        -- Item Avatars (Reference ID sesuai urutan insert avatar di atas)
        ('Cool Cat Avatar', 'Unlock the Cool Cat look', 15000, 'avatar', 2, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pepper'),
        ('Robo Teacher Avatar', 'Unlock the Robot look', 25000, 'avatar', 3, 'https://api.dicebear.com/7.x/bottts/svg?seed=Tech'),
        ('Golden Graduate Avatar', 'Unlock the Legendary look', 100000, 'avatar', 4, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Goldy')`,
    );

    // === 4. SYNC USERS FROM FIREBASE ===
    console.log("Fetching Users from Firebase...");
    const listUsersResult = await admin.auth().listUsers(1000);
    const firebaseUsers = listUsersResult.users;

    if (firebaseUsers.length > 0) {
      console.log(
        `   Found ${firebaseUsers.length} users in Firebase. Syncing...`,
      );

      const userValues = [];
      const [teacherRows] = await connection.query(
        "SELECT MAX(CAST(SUBSTRING(id,3) AS UNSIGNED)) AS maxNum FROM user WHERE role = 'teacher'",
      );
      const [studentRows] = await connection.query(
        "SELECT MAX(CAST(SUBSTRING(id,3) AS UNSIGNED)) AS maxNum FROM user WHERE role = 'student'",
      );

      let teacherCount = (teacherRows[0]?.maxNum || 0) + 1;
      let studentCount = (studentRows[0]?.maxNum || 0) + 1;

      for (const fbUser of firebaseUsers) {
        const name = fbUser.displayName || "Anonymous";
        const email = fbUser.email;
        const username = email
          ? email.split("@")[0]
          : "user_" + Math.random().toString(36).substring(2, 8);

        if (username === "admin") {
          userValues.push([
            "AD001",
            "Administrator",
            "admin",
            email,
            fbUser.uid,
            "admin",
            1,
            null,
          ]);
          continue;
        }

        const role =
          fbUser.customClaims?.role === "teacher" ? "teacher" : "student";
        const prefix = role === "teacher" ? "TE" : "ST";
        const idNumber = role === "teacher" ? teacherCount++ : studentCount++;
        const generatedId = `${prefix}${idNumber.toString().padStart(3, "0")}`;

        // Default avatar NULL (user belum pakai avatar) atau set default avatar ID 1
        const defaultAvatarId = 1; // Basic Student

        userValues.push([
          generatedId,
          name,
          username,
          email,
          fbUser.uid,
          role,
          1,
          defaultAvatarId,
          0, // points
        ]);
      }

      const insertQuery = `INSERT INTO user (id, name, username, email, firebase_uid, role, subscription_id, current_avatar_id, points) VALUES ?`;
      await connection.query(insertQuery, [userValues]);
      console.log("   Users synced successfully!");
    }

    // === 5. SEED DUMMY USERS (Jika Kosong) ===
    if (firebaseUsers.length === 0) {
      console.log("   Adding dummy users...");
      await connection.query(`
          INSERT INTO user (id, name, username, email, firebase_uid, role, subscription_id, current_avatar_id, points) VALUES
          ('AD001', 'Administrator', 'admin', 'admin@quizify.com', NULL, 'admin', 1, NULL, 0),
          ('TE001', 'John Teacher', 'john_teacher', 'john@teacher.com', NULL, 'teacher', 2, 3, 500), -- Pakai Robo Teacher
          ('TE002', 'Jane Educator', 'jane_educator', 'jane@teacher.com', NULL, 'teacher', 1, 1, 100),
          ('ST001', 'Alice Student', 'alice_student', 'alice@student.com', NULL, 'student', 1, 2, 250), -- Pakai Cool Cat
          ('ST002', 'Bob Learner', 'bob_learner', 'bob@student.com', NULL, 'student', 1, 1, 0),
          ('ST003', 'Charlie Pupil', 'charlie_pupil', 'charlie@student.com', NULL, 'student', 2, 1, 1000)
        `);
    }

    // Add dummy quizzes
    // === 6. SEED TRANSACTIONS & INVENTORY ===
    console.log("Seeding Transactions & Inventory...");

    // A. Transactions
    // TR001: Beli Subscription Premium
    // TR002: Beli Item Avatar (Cool Cat)
    // TR003: Beli Item Avatar (Robo Teacher)
    await connection.query(`
      INSERT INTO transaction (id, user_id, category, subscription_id, item_id, amount, status, payment_method, created_at) VALUES
      ('TR001', 'TE001', 'subscription', 2, NULL, 50000, 'success', 'Bank Transfer', '2024-11-20 10:00:00'),
      ('TR002', 'ST001', 'item', NULL, 2, 15000, 'success', 'E-Wallet', '2024-12-01 09:00:00'),
      ('TR003', 'TE001', 'item', NULL, 3, 25000, 'success', 'Credit Card', '2024-11-21 10:00:00'),
      ('TR004', 'ST003', 'subscription', 2, NULL, 50000, 'success', 'E-Wallet', '2024-12-05 14:00:00')
    `);

    // B. User Inventory (UserAvatar)
    // Harus sinkron dengan transaksi 'item' di atas dan 'current_avatar_id' di user
    // ST001 beli Avatar ID 2
    // TE001 beli Avatar ID 3
    // Semua user default punya Avatar ID 1 (Basic)
    await connection.query(`
      INSERT INTO useravatar (user_id, avatar_id) VALUES
      -- Default Avatar for Everyone
      ('TE001', 1), ('TE002', 1), ('ST001', 1), ('ST002', 1), ('ST003', 1),
      
      -- Purchased Avatars
      ('ST001', 2), -- ST001 punya Cool Cat
      ('TE001', 3)  -- TE001 punya Robo Teacher
    `);

    // === 7. SEED QUIZZES & QUESTIONS (Tetap Sama) ===
    console.log("   Adding dummy quizzes...");
    await connection.query(`
      INSERT INTO quiz (id, title, description, quiz_code, status, category, created_by) VALUES
      ('QU001', 'General Knowledge Quiz', 'Test your general knowledge', 'GEN2024', 'public', 'General', 'TE001'),
      ('QU002', 'Mathematics Basic', 'Basic mathematics quiz', 'MATH101', 'public', 'Mathematics', 'TE001'),
      ('QU003', 'Science Fundamentals', 'Fundamental concepts', 'SCI2024', 'private', 'Science', 'TE002'),
      ('QU004', 'History Quiz', 'World history', 'HIST001', 'public', 'History', 'TE002')
    `);

    console.log("   Adding dummy questions...");
    await connection.query(`
      INSERT INTO question (id, quiz_id, type, difficulty, question_text, correct_answer, options, is_generated) VALUES
      ('Q001', 'QU001', 'multiple', 'easy', 'What is the capital of France?', 'Paris', '["Paris", "London", "Berlin", "Madrid"]', 0),
      ('Q002', 'QU001', 'multiple', 'medium', 'Which planet is Red Planet?', 'Mars', '["Mars", "Venus", "Jupiter", "Saturn"]', 0),
      ('Q003', 'QU001', 'boolean', 'easy', 'The Earth is flat.', 'False', '["True", "False"]', 0),
      ('Q004', 'QU002', 'multiple', 'easy', 'What is 5 + 3?', '8', '["6", "7", "8", "9"]', 0),
      ('Q005', 'QU002', 'multiple', 'medium', 'What is 12 x 12?', '144', '["120", "132", "144", "156"]', 0),
      ('Q006', 'QU002', 'boolean', 'easy', 'Is 10 divisible by 3?', 'False', '["True", "False"]', 0),
      ('Q007', 'QU003', 'multiple', 'medium', 'Chemical symbol for water?', 'H2O', '["H2O", "CO2", "O2", "N2"]', 0),
      ('Q008', 'QU003', 'multiple', 'hard', 'Speed of light?', '299,792,458 m/s', '["299,792,458 m/s", "300,000,000 m/s", "150,000,000 m/s"]', 0),
      ('Q009', 'QU004', 'multiple', 'medium', 'Year WWII ended?', '1945', '["1943", "1944", "1945", "1946"]', 0),
      ('Q010', 'QU004', 'boolean', 'easy', 'Great Wall built in 20th century.', 'False', '["True", "False"]', 0)
    `);

    console.log("   Adding dummy quiz sessions...");
    await connection.query(`
      INSERT INTO quizsession (id, quiz_id, user_id, started_at, ended_at, score, status) VALUES
      ('S001', 'QU001', 'ST001', '2024-12-01 10:00:00', '2024-12-01 10:15:00', 100, 'completed'),
      ('S002', 'QU001', 'ST002', '2024-12-01 11:00:00', '2024-12-01 11:20:00', 67, 'completed'),
      ('S003', 'QU002', 'ST001', '2024-12-02 14:00:00', '2024-12-02 14:12:00', 100, 'completed'),
      ('S004', 'QU002', 'ST003', '2024-12-03 09:00:00', '2024-12-03 09:18:00', 67, 'completed'),
      ('S005', 'QU004', 'ST002', '2024-12-05 15:00:00', NULL, NULL, 'in_progress')
    `);

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

    console.log("\n✅ All dummy data seeded successfully with New Schema!");
  } catch (err) {
    console.error("Failed to setup database:", err);
  } finally {
    await connection.end();
  }
}

seedDatabase();
