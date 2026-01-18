require("dotenv").config();
const express = require("express");
const app = express();
const sequelize = require("./src/database/connection");
const studentRoutes = require("./src/routes/studentRoutes");
const teacherRoutes = require("./src/routes/teacherRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const authRoutes = require("./src/routes/authRoutes");
const imageRoutes = require("./src/routes/imageRoutes");
const userRoutes = require("./src/routes/userRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const shopRoutes = require("./src/routes/shopRoutes");
const cors = require("cors");

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

const { onRequest } = require("firebase-functions/v2/https");

app.use("/api", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", imageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/shop", shopRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Quizify API" });
});

// sequelize
//   .authenticate()
//   .then(() => {
//     console.log("Database connected");
//     app.listen(3000, "0.0.0.0", () =>
//       console.log("Server running on http://0.0.0.0:3000"),
//     );
//   })
//   .catch((err) => console.error("Database connection failed:", err));

exports.api = onRequest({ maxInstances: 10 }, async (req, res) => {
  try {
    await sequelize.authenticate();
    return app(req, res);
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(500).send("Internal Server Error");
  }
});
