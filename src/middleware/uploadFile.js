const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    const userId = req.user?.id || "anonymous";
    const dir = path.join(__dirname, "../uploads", userId.toString());

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    callback(null, dir);
  },
  filename: function (req, file, callback) {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    callback(null, `question-${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, callback) => {
    const allowed = /jpeg|jpg|png/;
    const valid = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    callback(valid ? null : new Error("File harus berupa gambar (jpeg/jpg/png)"), valid);
  },
});

module.exports = upload;