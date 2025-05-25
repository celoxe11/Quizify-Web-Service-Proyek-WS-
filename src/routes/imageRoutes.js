const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

router.get("/:userId/:filename", (req, res) => {
  const { userId, filename } = req.params;
  const filePath = path.join(__dirname, "..", "uploads", userId, filename);

  // Check if file exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "Gambar Soal tidak ditemukan" });
  }
});

module.exports = router;
