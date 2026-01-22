const multer = require("multer");

// Use memory storage to keep files in memory before uploading to Firebase
const memoryStorage = multer.memoryStorage();

// File filter for avatars
const fileFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung"), false);
  }
};

// Multer configuration for parsing multipart form data
const uploadAvatar = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // max 2MB
});

module.exports = uploadAvatar;
