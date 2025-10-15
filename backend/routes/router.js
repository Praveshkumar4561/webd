require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../config/dbConnect");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

router.get("/", (req, res) => {
  res.send("API is running successfully!");
});

router.post("/adminlogin", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  const sql = "SELECT * FROM admin WHERE username = ? AND password = ? LIMIT 1";
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length > 0) {
      res.status(200).json({ message: "Login successful", admin: results[0] });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  });
});

router.post("/userlogin", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }
  const sql = "SELECT * FROM user WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length > 0) {
      res.status(200).json({ message: "Login successful", user: results[0] });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  });
});

router.post("/uploaditem", upload.array("images", 10), (req, res) => {
  const { item, description } = req.body;
  const files = req.files;
  if (!item || !description || !files || files.length === 0) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const image = files.map((file) => file.filename).join(",");
  const sql =
    "INSERT INTO user_items (item, image, description) VALUES (?, ?, ?)";
  db.query(sql, [item, image, description], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(200).json({
      message: "Item uploaded successfully",
      image: files.map((f) => f.filename),
    });
  });
});

// router.post("/adduser", (req, res) => {
//   const { fullname, phonenumber, username, password } = req.body;

//   if (!fullname || !phonenumber || !username || !password) {
//     return res.status(400).json({ message: "All fields are required" });
//   }

//   const sql =
//     "INSERT INTO adduser (fullname, phonenumber, username, password) VALUES (?, ?, ?, ?)";
//   db.query(sql, [fullname, phonenumber, username, password], (err, results) => {
//     if (err) {
//       console.error(err);
//       return res.status(500).json({ message: "Database error" });
//     }

//     res
//       .status(201)
//       .json({ message: "User added successfully", userId: results.insertId });
//   });
// });

module.exports = router;
