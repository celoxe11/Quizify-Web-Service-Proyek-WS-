require("dotenv").config();
const express = require("express");
const app = express();
const sequelize = require("./src/config/db");
const studentRoutes = require("./src/routes/studentRoutes");
const teacherRoutes = require("./src/routes/teacherRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const authRoutes = require("./src/routes/authRoutes");
const imageRoutes = require("./src/routes/imageRoutes");
const userRoutes = require("./src/routes/userRoutes");
const cors = require("cors");

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use("/api", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", imageRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Quizify API" });
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Database connected");
    app.listen(3000, () => console.log("Server running on port 3000"));
  })
  .catch((err) => console.error("Database connection failed:", err));
