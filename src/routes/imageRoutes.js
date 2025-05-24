const express = require("express");
const router = express.Router();

router.get("/:folder/:filename", (req, res) => {
  const { folder, filename } = req.params;
  const filePath = `./uploads/${folder}/${filename}`;

  // just display the image on the postman
  res.sendFile(filePath, { root: __dirname }, (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res.status(404).json({ message: "File not found" });
    }
  });
});

module.exports = router;
