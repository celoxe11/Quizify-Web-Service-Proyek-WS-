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

// Import Firebase Admin from centralized config
// This ensures Firebase is initialized before any routes are loaded
const { admin } = require("./src/config/firebase");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

const { onRequest } = require("firebase-functions/v2/https");

app.use("/uploads", express.static("uploads"));
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

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connected in ${process.env.NODE_ENV} mode`);
  } catch (err) {
    console.error("Database connection failed:", err);
    throw err; // Propagate error to stop the server/function if needed
  }
};

// LOCAL DEVELOPMENT SERVER
if (process.env.NODE_ENV !== "production") {
  connectDB().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

// PRODUCTION FIREBASE FUNCTION
exports.api = onRequest(
  {
    region: "asia-southeast2",
    maxInstances: 10,
    cloudSqlInstances: [process.env.CLOUD_SQL_CONNECTION_NAME],
  },
  async (req, res) => {
    try {
      await sequelize.authenticate().then(() => {
        console.log("Database Connected");
      });
      return app(req, res);
    } catch (err) {
      console.error("Database connection failed:", err);
      res.status(500).send(err);
    }
  },
);
