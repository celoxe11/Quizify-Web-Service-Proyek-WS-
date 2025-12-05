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
        category VARCHAR(100) DEFAULT NULL,
        type ENUM('multiple','boolean') NOT NULL,
        difficulty ENUM('easy','medium','hard') NOT NULL,
        question_text TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        incorrect_answers JSON NOT NULL,
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
      const teacherMax = (teacherRows && teacherRows[0] && teacherRows[0].maxNum) ? teacherRows[0].maxNum : 0;
      const studentMax = (studentRows && studentRows[0] && studentRows[0].maxNum) ? studentRows[0].maxNum : 0;
      const counters = { teacher: teacherMax + 1, student: studentMax + 1 };

      for (const fbUser of firebaseUsers) {

        // DATA MAPPING LOGIC
        const name = fbUser.displayName || "Anonymous"; // Handle missing names
        const email = fbUser.email;

        // Generate a username from email if missing (e.g., johndoe from johndoe@gmail.com)
        const username = email
          ? email.split("@")[0]
          : "user_" + Math.random().toString(36).substring(2, 8);

        if(username == "admin") {
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
        const role = fbUser.customClaims && fbUser.customClaims.role === 'teacher' ? 'teacher' : 'student';

        // Generate ID like TE001 or ST001 using counters
        const prefix = role === 'teacher' ? 'TE' : 'ST';
        const idNumber = counters[role]++;
        const generatedId = `${prefix}${idNumber.toString().padStart(3, '0')}`;

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
  } catch (err) {
    console.error("Failed to setup database:", err);
  } finally {
    await connection.end();
  }
}

seedDatabase();
