require('dotenv').config();
const express = require('express')
const app = express()
const sequelize = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/admin", adminRoutes);

sequelize
  .sync()
  .then(() => {
    console.log("Database connected");
    app.listen(3000, () => console.log("Server running on port 3000"));
  })
  .catch((err) => console.error("Database connection failed:", err));