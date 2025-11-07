import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import path from "path";
import ExcelJS from "exceljs";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import db from "../config/dbConnect.js";

dotenv.config();
const router = express.Router();

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verify error:", err);
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

router.post("/adminlogin", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const sql =
      "SELECT * FROM admin WHERE username = ? AND password = ? LIMIT 1";
    const [results] = await db.promise().execute(sql, [username, password]);

    if (results.length > 0) {
      res.status(200).json({ message: "Login successful", admin: results[0] });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

// router.post("/logout")

router.post("/userlogin", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res
      .status(400)
      .json({ message: "Username/email and password required" });

  try {
    const sql = "SELECT * FROM users WHERE username = ? OR email = ?";
    const [results] = await db.promise().execute(sql, [identifier, identifier]);

    if (results.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

router.get("/allitemswithuser", async (req, res) => {
  try {
    const { page = 1, limit = 25, search = "", shop = "", userId } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    let sql = `
      SELECT 
        ui.id AS itemId,
        ui.user_id,
        ui.item,
        ui.price,
        ui.image,
        ui.description,
        ui.created_at,
        u.id AS userId,
        u.username,
        u.email,
        u.fullname
      FROM user_items ui
      JOIN users u ON ui.user_id = u.id
    `;

    const where = [];
    const params = [];

    if (userId) {
      where.push("ui.user_id = ?");
      params.push(userId);
    }

    if (shop) {
      where.push("ui.shop_name = ?");
      params.push(shop);
    }

    if (search) {
      where.push(
        "(u.username LIKE ? OR ui.item LIKE ? OR ui.description LIKE ?)"
      );
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    if (where.length) {
      sql += " WHERE " + where.join(" AND ");
    }

    const countSql = `SELECT COUNT(*) as total FROM (${sql}) AS sub`;
    const [[countRow]] = await db.promise().query(countSql, params);
    const total = countRow?.total || 0;

    sql += " ORDER BY ui.id DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const [rows] = await db.promise().query(sql, params);

    const data = rows.map((r) => ({
      ...r,
      images: r.image ? r.image.split(",") : [],
    }));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      data,
    });
  } catch (err) {
    console.error("allitemswithuser error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

router.get("/itemsearch/:value", async (req, res) => {
  try {
    const data = req.params.value?.trim();
    if (!data) {
      return res.status(200).json([]);
    }

    const escaped = data.replace(/([%_\\])/g, "\\$1");

    const sql = `
      SELECT fullname 
      FROM users 
      WHERE fullname LIKE ? ESCAPE '\\\\' 
      LIMIT 20
    `;

    const [rows] = await db.promise().query(sql, [`%${escaped}%`]);
    res.status(200).json(rows);
  } catch (err) {
    console.error("itemsearch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/updatepassword/:id", async (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Both current and new passwords are required." });
  }

  try {
    const [results] = await db
      .promise()
      .execute("SELECT password FROM users WHERE id = ?", [userId]);

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const hashedPassword = results[0].password;

    const isMatch = await bcrypt.compare(currentPassword, hashedPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .promise()
      .execute(
        "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [newHashedPassword, userId]
      );

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error." });
  }
});

router.post("/createuser", async (req, res) => {
  const {
    fullname,
    email,
    phone,
    username,
    password,
    doj,
    gender,
    description,
  } = req.body;

  if (!username || !password || !email || !fullname) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users 
      (fullname, email, phone, username, password, doj, gender, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db
      .promise()
      .execute(sql, [
        fullname,
        email,
        phone,
        username,
        hashedPassword,
        doj,
        gender,
        description,
      ]);

    res
      .status(201)
      .json({ message: "User created successfully", userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

router.get("/allusers", async (req, res) => {
  try {
    const sql = `
      SELECT id, fullname, email, phone, username, doj, gender, description, created_at, updated_at, last_login
      FROM users
    `;
    const [rows] = await db.promise().query(sql);
    res.json(rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.delete("/userdelete/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "Shop ID is required" });
  }

  const conn = db.promise();

  try {
    await conn.beginTransaction();

    const [childDeleteResult] = await conn.query(
      "DELETE FROM user_items WHERE user_id = ?",
      [id]
    );

    const [userDeleteResult] = await conn.query(
      "DELETE FROM users WHERE id = ?",
      [id]
    );

    if (userDeleteResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Shop not found" });
    }

    await conn.commit();

    return res.status(200).json({
      message: "Shop deleted successfully",
      deletedUserItems: childDeleteResult.affectedRows,
      deletedUsers: userDeleteResult.affectedRows,
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error("Rollback failed:", rbErr);
    }

    console.error("Error deleting shop:", error);

    if (error && error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "Cannot delete shop: there are related records preventing deletion. Consider removing related user_items first.",
        error: error.message,
      });
    }

    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

router.put("/editusers/:id", async (req, res) => {
  const id = req.params.id;
  const data = { ...req.body }; // copy to avoid mutating req.body directly

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // If client supplied a non-empty password, hash it before saving.
    // If password is undefined, null, or an empty string, we won't change it.
    if (data.password !== undefined && data.password !== null) {
      const pwdStr = String(data.password || ""); // ensure string
      if (pwdStr.trim() !== "") {
        // hash the password
        const saltRounds = 10;
        const hashed = await bcrypt.hash(pwdStr, saltRounds);
        data.password = hashed;
      } else {
        // empty password string -> remove it so UPDATE won't overwrite existing password with empty value
        delete data.password;
      }
    }

    // Build and execute update
    const sql = "UPDATE users SET ? WHERE id = ?";
    const [result] = await db.promise().query(sql, [data, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "user not found" });
    }

    res.status(200).json({
      message: "users updated successfully",
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error("Error updating users:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message || err });
  }
});

router.get("/someusers/:id", async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const sql =
      "SELECT id, fullname, email, phone, username, password, doj, gender, description, created_at, updated_at, last_login FROM users WHERE id = ?";
    const [rows] = await db.promise().query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Failed to fetch user", error: err });
  }
});

router.post(
  "/uploaditem",
  authenticateToken,
  upload.array("images", 10),
  async (req, res) => {
    const { item, price, description } = req.body;
    const files = req.files;
    const userId = req.user?.id;

    if (!userId)
      return res.status(401).json({ message: "User not authenticated" });
    if (!item || !price || !description || !files || files.length === 0)
      return res.status(400).json({ message: "All fields are required" });

    const image = files.map((f) => f.filename).join(",");

    try {
      const sql =
        "INSERT INTO user_items (user_id, item, price, image, description) VALUES (?, ?, ?, ?, ?)";
      const [result] = await db
        .promise()
        .execute(sql, [userId, item, price, image, description]);

      res.status(200).json({
        message: "Item uploaded successfully",
        image: files.map((f) => f.filename),
        id: result.insertId,
        userId,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Database error" });
    }
  }
);

router.post("/addemployee", async (req, res) => {
  const {
    employee_name,
    dob,
    doj,
    department,
    shop_name,
    contact,
    email,
    employee_salary,
    advance,
    reason,
    advance_history,
    advance_reason,
  } = req.body;

  try {
    let normalizedHistory = null;
    if (Array.isArray(advance_history)) {
      normalizedHistory = advance_history
        .map((item) => {
          if (typeof item === "number") return { amount: Number(item) };
          if (
            item &&
            typeof item === "object" &&
            !Number.isNaN(parseFloat(item.amount))
          ) {
            return { amount: Number(item.amount), ts: item.ts || null };
          }
          return null;
        })
        .filter(Boolean);
    } else if (typeof advance_history === "string" && advance_history.trim()) {
      try {
        const parsed = JSON.parse(advance_history);
        if (Array.isArray(parsed)) {
          normalizedHistory = parsed
            .map((item) => {
              if (typeof item === "number") return { amount: Number(item) };
              if (
                item &&
                typeof item === "object" &&
                !Number.isNaN(parseFloat(item.amount))
              ) {
                return { amount: Number(item.amount), ts: item.ts || null };
              }
              return null;
            })
            .filter(Boolean);
        }
      } catch (e) {}
    }

    if (!normalizedHistory && advance !== undefined) {
      const adv = Number(advance) || 0;
      normalizedHistory = adv > 0 ? [{ amount: adv }] : [];
    }

    const totalAdvance = Array.isArray(normalizedHistory)
      ? normalizedHistory.reduce((s, it) => s + (Number(it.amount) || 0), 0)
      : Number(advance) || 0;

    let normalizedReasons = null;
    if (Array.isArray(advance_reason)) {
      normalizedReasons = advance_reason
        .map((r) => (typeof r === "string" ? r.trim() : String(r || "")))
        .filter(Boolean);
    } else if (typeof advance_reason === "string" && advance_reason.trim()) {
      const s = advance_reason.trim();
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          normalizedReasons = parsed
            .map((r) => (typeof r === "string" ? r.trim() : String(r || "")))
            .filter(Boolean);
        } else if (typeof parsed === "string") {
          normalizedReasons = parsed
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean);
        } else {
          normalizedReasons = s
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean);
        }
      } catch (e) {
        normalizedReasons = s
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean);
      }
    } else if (reason && typeof reason === "string" && reason.trim()) {
      normalizedReasons = [reason.trim()];
    } else {
      normalizedReasons = [];
    }

    const insertQuery = `
      INSERT INTO employee 
      (employee_name, dob, doj, department, shop_name, contact, email, employee_salary, advance, reason, advance_history, advance_reason) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db
      .promise()
      .execute(insertQuery, [
        employee_name || null,
        dob || null,
        doj || null,
        department || null,
        shop_name || null,
        contact || null,
        email || null,
        employee_salary || null,
        totalAdvance,
        reason && reason.trim() ? reason.trim() : null,
        Array.isArray(normalizedHistory) && normalizedHistory.length > 0
          ? JSON.stringify(normalizedHistory)
          : null,
        Array.isArray(normalizedReasons) && normalizedReasons.length > 0
          ? JSON.stringify(normalizedReasons)
          : null,
      ]);

    res.status(201).json({
      message: "Employee added successfully",
      id: result.insertId,
      advance: totalAdvance,
      advance_history: normalizedHistory,
      advance_reason: normalizedReasons,
    });
  } catch (err) {
    console.error("Add employee error:", err);
    res
      .status(500)
      .json({ message: "Database error", error: err.message || err });
  }
});

router.get("/allemployee", async (req, res) => {
  try {
    const [employees] = await db.promise().query("SELECT * FROM employee");
    const [transfers] = await db.promise().query("SELECT * FROM transfer");

    res.status(200).json({
      employees,
      transfers,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ message: "Failed to fetch data", error: err });
  }
});

router.post("/transfer", (req, res) => {
  const { employee_id, employee_name, shop_from, shop_to } = req.body;

  if (!employee_id || !employee_name || !shop_from || !shop_to) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const doTransactionWithConnection = (conn) => {
    conn.beginTransaction((err) => {
      if (err) {
        safeRelease(conn);
        console.error("beginTransaction error:", err);
        return res.status(500).json({ message: "Server error" });
      }

      conn.query(
        "SELECT id, employee_name FROM employee WHERE id = ? FOR UPDATE",
        [employee_id],
        (err, rows) => {
          if (err)
            return rollback(conn, res, "DB error (select employee)", err);

          if (rows.length === 0) {
            return rollback(conn, res, "Employee not found", null, 404);
          }

          if (rows[0].employee_name !== employee_name) {
            return rollback(
              conn,
              res,
              "Employee name does not match ID",
              null,
              400
            );
          }

          conn.query(
            "INSERT INTO transfer (employee_id, employee_name, shop_from, shop_to) VALUES (?, ?, ?, ?)",
            [employee_id, employee_name, shop_from, shop_to],
            (err, insertResult) => {
              if (err)
                return rollback(conn, res, "DB error (insert transfer)", err);

              const transferId = insertResult.insertId;

              conn.query(
                "UPDATE employee SET shop_name = ? WHERE id = ?",
                [shop_to, employee_id],
                (err, updateResult) => {
                  if (err)
                    return rollback(
                      conn,
                      res,
                      "DB error (update employee)",
                      err
                    );

                  if (updateResult.affectedRows === 0) {
                    return rollback(
                      conn,
                      res,
                      "Failed to update employee shop",
                      null,
                      500
                    );
                  }

                  conn.commit((err) => {
                    if (err)
                      return rollback(conn, res, "DB error (commit)", err);

                    safeRelease(conn);
                    return res.status(201).json({
                      message:
                        "Transfer added and employee updated successfully",
                      transferId,
                    });
                  });
                }
              );
            }
          );
        }
      );
    });
  };

  const rollback = (conn, res, logMsg, err = null, status = 500) => {
    console.error(logMsg, err || "");
    conn.rollback(() => {
      safeRelease(conn);
      return res.status(status).json({
        message: typeof logMsg === "string" ? logMsg : "Server error",
      });
    });
  };

  const safeRelease = (conn) => {
    try {
      if (typeof conn.release === "function") conn.release();
    } catch (e) {
      console.warn("Release failed:", e);
    }
  };

  if (typeof db.getConnection === "function") {
    db.getConnection((err, conn) => {
      if (err) {
        console.error("Failed to get DB connection from pool:", err);
        return res.status(500).json({ message: "Server error" });
      }
      doTransactionWithConnection(conn);
    });
  } else {
    if (typeof db.beginTransaction !== "function") {
      console.error("db object does not support transactions");
      return res
        .status(500)
        .json({ message: "DB not configured for transactions" });
    }
    doTransactionWithConnection(db);
  }
});

router.post("/tracker", (req, res) => {
  const {
    employee_id: reqEmployeeId,
    employee_name,
    employee_salary,
    advance,
    reason,
    advance_reason,
    salary_month,
    calculation_id,
  } = req.body;

  if (
    (!reqEmployeeId && !employee_name) ||
    !employee_salary ||
    typeof advance === "undefined" ||
    !salary_month
  ) {
    return res.status(400).json({
      message:
        "employee_id or employee_name, employee_salary, advance, and salary_month are required",
    });
  }

  const normalizeAdvanceReason = (raw) => {
    try {
      if (Array.isArray(raw))
        return raw
          .map((r) => (typeof r === "string" ? r.trim() : String(r || "")))
          .filter(Boolean);
      if (typeof raw === "string" && raw.trim().length > 0) {
        const s = raw.trim();
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed))
            return parsed
              .map((r) => (typeof r === "string" ? r.trim() : String(r || "")))
              .filter(Boolean);
        } catch (e) {}
        return s
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean);
      }
    } catch (err) {}
    if (reason && typeof reason === "string" && reason.trim().length > 0)
      return [reason.trim()];
    return [];
  };

  const normalizedAdvanceReason = normalizeAdvanceReason(advance_reason);

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("Transaction begin error:", txErr);
      return res
        .status(500)
        .json({ message: "Server error (transaction begin)" });
    }

    const rollbackAndRespond = (status, payload, log) => {
      db.rollback(() => {
        if (log) console.error(log);
        return res.status(status).json(payload);
      });
    };

    const resolveEmployee = (cb) => {
      const selectSql = reqEmployeeId
        ? "SELECT id, employee_name, advance_applied, advance FROM employee WHERE id = ? LIMIT 1 FOR UPDATE"
        : "SELECT id, employee_name, advance_applied, advance FROM employee WHERE employee_name = ? LIMIT 1 FOR UPDATE";
      const param = reqEmployeeId ? [reqEmployeeId] : [employee_name];

      db.query(selectSql, param, (err, rows) => {
        if (err)
          return rollbackAndRespond(
            500,
            { message: "Server error (select employee)" },
            err
          );
        if (!rows || rows.length === 0)
          return rollbackAndRespond(404, { message: "Employee not found" });
        if (
          reqEmployeeId &&
          employee_name &&
          rows[0].employee_name !== employee_name
        ) {
          return rollbackAndRespond(400, {
            message: "Employee name does not match ID",
          });
        }
        const empId = rows[0].id;
        const advanceApplied = Number(rows[0].advance_applied || 0);
        cb(empId, advanceApplied);
      });
    };

    const afterGotEmployeeId = (employeeId, advanceApplied) => {
      const maybeCheckCalculationId = (cb) => {
        if (!calculation_id) return cb();
        db.query(
          "SELECT 1 FROM processed_calculations WHERE calculation_id = ? LIMIT 1",
          [calculation_id],
          (err, calcRows) => {
            if (err)
              return rollbackAndRespond(
                500,
                { message: "Server error (idempotency check)" },
                err
              );
            if (calcRows && calcRows.length > 0)
              return rollbackAndRespond(200, {
                message: "Calculation already processed (idempotent)",
              });
            cb();
          }
        );
      };

      maybeCheckCalculationId(() => {
        db.query(
          "SELECT id, salary_calculated FROM tracker WHERE employee_id = ? AND salary_month = ? FOR UPDATE",
          [employeeId, salary_month],
          (err, rows) => {
            if (err)
              return rollbackAndRespond(
                500,
                { message: "Server error (select tracker)" },
                err
              );

            if (
              advanceApplied === 1 &&
              rows &&
              rows.length > 0 &&
              rows[0].salary_calculated === 1
            ) {
              return rollbackAndRespond(400, {
                message: "Salary already calculated for this employee/month",
              });
            }

            const finishAfterWrite = () => {
              const insertTransSql = `
                INSERT INTO transaction (employee_name, salary, advance, reason, salary_month)
                VALUES (?, ?, ?, ?, ?)
              `;
              const transValues = [
                employee_name || null,
                employee_salary,
                advance,
                reason || null,
                salary_month,
              ];

              db.query(insertTransSql, transValues, (transErr) => {
                if (transErr)
                  return rollbackAndRespond(
                    500,
                    { message: "Server error (insert transaction)" },
                    transErr
                  );

                db.query(
                  "UPDATE employee SET advance = 0, advance_applied = 0, reason = NULL WHERE id = ?",
                  [employeeId],
                  (empErr, empRes) => {
                    if (empErr)
                      return rollbackAndRespond(
                        500,
                        { message: "Server error (update employee)" },
                        empErr
                      );

                    if (empRes && empRes.affectedRows === 0) {
                      return rollbackAndRespond(500, {
                        message: "Failed to update employee advance flag",
                      });
                    }

                    if (calculation_id) {
                      db.query(
                        "INSERT INTO processed_calculations (calculation_id, employee_id, salary_month, created_at) VALUES (?, ?, ?, NOW())",
                        [calculation_id, employeeId, salary_month],
                        (insErr) => {
                          if (insErr && insErr.code !== "ER_DUP_ENTRY") {
                            return rollbackAndRespond(
                              500,
                              {
                                message: "Server error (insert calculation id)",
                              },
                              insErr
                            );
                          }

                          db.commit((commitErr) => {
                            if (commitErr)
                              return rollbackAndRespond(
                                500,
                                { message: "Server error (commit)" },
                                commitErr
                              );
                            return res.status(201).json({
                              message:
                                "Tracker entry saved, transaction recorded, employee advance reset to 0 and reason cleared (advance_reason preserved)",
                            });
                          });
                        }
                      );
                    } else {
                      db.commit((commitErr) => {
                        if (commitErr)
                          return rollbackAndRespond(
                            500,
                            { message: "Server error (commit)" },
                            commitErr
                          );
                        return res.status(201).json({
                          message:
                            "Tracker entry saved, transaction recorded, employee advance reset to 0 and reason cleared (advance_reason preserved)",
                        });
                      });
                    }
                  }
                );
              });
            };

            if (rows && rows.length > 0) {
              const updateParams = [
                employee_name || null,
                employee_salary,
                advance,
                reason || null,
                rows[0].id,
              ];
              let updateSql = `UPDATE tracker SET employee_name = ?, employee_salary = ?, advance = ?, reason = ?, salary_calculated = 1 WHERE id = ?`;

              if (
                Array.isArray(normalizedAdvanceReason) &&
                normalizedAdvanceReason.length > 0
              ) {
                updateSql = `UPDATE tracker SET employee_name = ?, employee_salary = ?, advance = ?, reason = ?, advance_reason = ?, salary_calculated = 1 WHERE id = ?`;
                updateParams.splice(
                  4,
                  0,
                  JSON.stringify(normalizedAdvanceReason)
                );
              }

              db.query(updateSql, updateParams, (uErr) => {
                if (uErr)
                  return rollbackAndRespond(
                    500,
                    { message: "Server error (update tracker)" },
                    uErr
                  );
                finishAfterWrite();
              });
            } else {
              const trackerCols = [
                "employee_id",
                "employee_name",
                "employee_salary",
                "advance",
                "reason",
                "salary_month",
                "salary_calculated",
              ];
              const trackerPlaceholders = ["?", "?", "?", "?", "?", "?", "1"];
              const trackerVals = [
                employeeId,
                employee_name || null,
                employee_salary,
                advance,
                reason || null,
                salary_month,
              ];

              if (
                Array.isArray(normalizedAdvanceReason) &&
                normalizedAdvanceReason.length > 0
              ) {
                trackerCols.splice(5, 0, "advance_reason");
                trackerPlaceholders.splice(5, 0, "?");
                trackerVals.splice(
                  5,
                  0,
                  JSON.stringify(normalizedAdvanceReason)
                );
              }

              const insertTrackerSql = `INSERT INTO tracker (${trackerCols.join(
                ", "
              )}) VALUES (${trackerPlaceholders.join(", ")})`;

              db.query(insertTrackerSql, trackerVals, (iErr) => {
                if (iErr) {
                  if (iErr.code === "ER_DUP_ENTRY") {
                    return rollbackAndRespond(
                      400,
                      {
                        message:
                          "Duplicate tracker entry (probably already calculated)",
                      },
                      iErr
                    );
                  }
                  return rollbackAndRespond(
                    500,
                    { message: "Server error (insert tracker)" },
                    iErr
                  );
                }
                finishAfterWrite();
              });
            }
          }
        );
      });
    };

    resolveEmployee(afterGotEmployeeId);
  });
});

router.get("/alltransactions", async (req, res) => {
  const sql = "select * from transaction";
  db.query(sql, (err, result) => {
    if (err) throw err;
    else {
      res.json(result);
    }
  });
});

router.delete("/employeedelete/:id", async (req, res) => {
  const id = req.params.id;

  const deleteTrackerSql = "DELETE FROM tracker WHERE employee_id = ?";
  const deleteTransferSql = "DELETE FROM transfer WHERE employee_id = ?";
  const deleteEmployeeSql = "DELETE FROM employee WHERE id = ?";

  try {
    const query = (sql, params) =>
      new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

    await query(deleteTrackerSql, [id]);
    await query(deleteTransferSql, [id]);

    const result = await query(deleteEmployeeSql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({
      message: "Employee and related records deleted successfully",
      result,
    });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({
      message: "Server error while deleting employee",
      error: err.message || err,
    });
  }
});

router.get("/someemployee/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const sql = "SELECT * FROM employee WHERE id = ?";
    const [rows] = await db.promise().query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const row = rows[0];

    try {
      if (row.advance_history && typeof row.advance_history === "string") {
        row.advance_history = JSON.parse(row.advance_history);
      }
    } catch (e) {}

    try {
      if (row.advance_reason && typeof row.advance_reason === "string") {
        const raw = row.advance_reason.trim();
        if (raw.length === 0) {
          row.advance_reason = [];
        } else {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              row.advance_reason = parsed
                .map((r) => (typeof r === "string" ? r.trim() : String(r)))
                .filter(Boolean);
            } else if (typeof parsed === "string") {
              row.advance_reason = parsed
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean);
            } else {
              row.advance_reason = raw
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean);
            }
          } catch (jsonErr) {
            row.advance_reason = raw
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean);
          }
        }
      } else if (row.advance_reason == null) {
        if (
          row.reason &&
          typeof row.reason === "string" &&
          row.reason.trim().length > 0
        ) {
          row.advance_reason = [row.reason.trim()];
        } else {
          row.advance_reason = [];
        }
      }
    } catch (e) {
      row.advance_reason = row.advance_reason || [];
    }

    res.status(200).json(row);
  } catch (err) {
    console.error("Database error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch employee", error: err.message || err });
  }
});

router.put("/editemployee/:id", async (req, res) => {
  const id = req.params.id;
  const data = { ...req.body };

  try {
    let advanceHistory = null;

    if (Array.isArray(data.advance_history)) {
      advanceHistory = data.advance_history
        .map((item) => {
          if (typeof item === "number") return { amount: Number(item) };
          if (
            item &&
            typeof item === "object" &&
            !Number.isNaN(parseFloat(item.amount))
          ) {
            return { amount: Number(item.amount), ts: item.ts || null };
          }
          return null;
        })
        .filter(Boolean);
    }

    if (!advanceHistory && data.advance !== undefined) {
      const adv = Number(data.advance) || 0;
      advanceHistory = adv > 0 ? [{ amount: adv }] : [];
    }

    const total = Array.isArray(advanceHistory)
      ? advanceHistory.reduce((s, it) => s + (Number(it.amount) || 0), 0)
      : Number(data.advance) || 0;

    let advanceReasonArr = null;

    if (Array.isArray(data.advance_reason)) {
      advanceReasonArr = data.advance_reason
        .map((r) => (typeof r === "string" ? r.trim() : String(r || "")))
        .filter((r) => r.length > 0);
    } else if (typeof data.advance_reason === "string") {
      const s = data.advance_reason.trim();
      if (s.length === 0) {
        advanceReasonArr = [];
      } else {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            advanceReasonArr = parsed
              .map((r) => (typeof r === "string" ? r.trim() : String(r || "")))
              .filter((r) => r.length > 0);
          } else if (typeof parsed === "string") {
            advanceReasonArr = parsed
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean);
          } else {
            advanceReasonArr = s
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean);
          }
        } catch (e) {
          advanceReasonArr = s
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean);
        }
      }
    } else if (data.reason && typeof data.reason === "string") {
      const s = data.reason.trim();
      advanceReasonArr = s.length ? [s] : [];
    } else {
      advanceReasonArr = [];
    }

    const updateObj = {
      employee_name: data.employee_name,
      dob: data.dob,
      doj: data.doj,
      department: data.department,
      shop_name: data.shop_name,
      contact: data.contact,
      email: data.email,
      employee_salary: data.employee_salary,
      reason: data.reason,
      advance: total,
      advance_applied: 0,
    };

    if (advanceHistory && advanceHistory.length > 0) {
      updateObj.advance_history = JSON.stringify(advanceHistory);
    } else {
      updateObj.advance_history = null;
    }

    if (Array.isArray(advanceReasonArr) && advanceReasonArr.length > 0) {
      updateObj.advance_reason = JSON.stringify(advanceReasonArr);
    } else {
      updateObj.advance_reason = null;
    }

    const sql = "UPDATE employee SET ? WHERE id = ?";
    const [result] = await db.promise().query(sql, [updateObj, id]);

    res.json({
      success: true,
      result,
      advance: total,
      advance_history: advanceHistory,
      advance_reason: advanceReasonArr,
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({
      message: "Failed to update employee",
      error: err.message || err,
    });
  }
});

router.post("/postshop", async (req, res) => {
  try {
    const { shop_name, contact, address, description } = req.body;
    if (!shop_name || !contact || !address) {
      return res.status(400).json({ message: "Shop name is required" });
    }
    const sql =
      "INSERT INTO shop (shop_name, contact, address, description) VALUES (?, ?)";
    const values = [shop_name, description || null];
    const [result] = await db.promise().query(sql, values);
    res.status(201).json({
      message: "Shop added successfully",
      shop_id: result.insertId,
    });
  } catch (error) {
    console.error("Error inserting shop:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/allshop", async (req, res) => {
  try {
    const sql = "SELECT * FROM shop";
    const [shops] = await db.promise().query(sql);

    res.status(200).json({
      success: true,
      count: shops.length,
      data: shops,
    });
  } catch (error) {
    console.error("Error fetching shops:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shop list",
    });
  }
});

router.delete("/shopdelete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: "Shop ID is required" });
    }
    const sql = "DELETE FROM shop WHERE id = ?";
    const [result] = await db.promise().query(sql, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Shop not found" });
    }
    res.status(200).json({ message: "Shop deleted successfully" });
  } catch (error) {
    console.error("Error deleting shop:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/editshop/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  if (!id) {
    return res.status(400).json({ message: "Shop ID is required" });
  }

  try {
    const sql = "UPDATE shop SET ? WHERE id = ?";
    const [result] = await db.promise().query(sql, [data, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Shop not found" });
    }

    res.status(200).json({
      message: "Shop updated successfully",
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error("Error updating shop:", err);
    res.status(500).json({ message: "Internal server error", error: err });
  }
});

router.get("/someshops/:id", async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ message: "Shop ID is required" });
  }

  try {
    const sql = "SELECT * FROM shop WHERE id = ?";
    const [rows] = await db.promise().query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Shop not found" });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Error fetching shop:", err);
    res.status(500).json({ message: "Failed to fetch shop", error: err });
  }
});

router.post("/expensepost", async (req, res) => {
  try {
    const { date, category, amount, repeats, note } = req.body;
    const sql = `
      INSERT INTO expense (date, category, amount, repeats, note)
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [
      date || null,
      category || null,
      amount,
      repeats || "no",
      note || null,
    ];

    const result = await new Promise((resolve, reject) => {
      db.query(sql, values, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    res.status(201).json({
      message: "Expense added successfully",
      expenseId: result.insertId,
    });
  } catch (err) {
    console.error("Error inserting expense:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// function pad(n) {
//   return String(n).padStart(2, "0");
// }

// function toLocalYMD(dateStr) {
//   if (!dateStr) return null;
//   try {
//     const isYMD = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
//     const dt = isYMD ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
//     if (isNaN(dt.getTime())) return null;
//     const yyyy = dt.getFullYear();
//     const mm = pad(dt.getMonth() + 1);
//     const dd = pad(dt.getDate());
//     return `${yyyy}-${mm}-${dd}`;
//   } catch (e) {
//     return null;
//   }
// }

// function addMonthsClamp(ymd, months = 1) {
//   const base = new Date(ymd + "T00:00:00");
//   const y0 = base.getFullYear();
//   const m0 = base.getMonth();
//   const d0 = base.getDate();

//   const target = m0 + months;
//   const y = y0 + Math.floor(target / 12);
//   const m = ((target % 12) + 12) % 12;

//   const tentative = new Date(y, m, d0);
//   const finalDate = (tentative.getMonth() !== m) ? new Date(y, m + 1, 0) : tentative;

//   const yyyy = finalDate.getFullYear();
//   const mm = String(finalDate.getMonth() + 1).padStart(2, "0");
//   const dd = String(finalDate.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`; // "2025-12-05"
// }

// function ymdToLocalDatetime(ymd) {
//   if (!ymd) return null;
//   return `${ymd} 00:00:00`;
// }

// router.post("/incomepost", async (req, res) => {
//   try {
//     const { date, category_name, amount, repeats, note, employee_name } =
//       req.body;

//     const normalizedYMD = toLocalYMD(date);
//     if (!normalizedYMD) {
//       return res.status(400).json({ error: "Invalid or missing date" });
//     }

//     if (!category_name || category_name === "") {
//       return res.status(400).json({ error: "category_name is required" });
//     }
//     if (amount === undefined || amount === null || amount === "") {
//       return res.status(400).json({ error: "amount is required" });
//     }
//     const numericAmount = Number(amount);
//     if (isNaN(numericAmount) || numericAmount <= 0) {
//       return res
//         .status(400)
//         .json({ error: "amount must be a positive number" });
//     }

//     let recurrenceNextYMD = null;
//     let recurrenceActive = "no";
//     if (repeats === "yes") {
//       recurrenceNextYMD = addMonthsClamp(normalizedYMD, 1);
//       if (recurrenceNextYMD) recurrenceActive = "yes";
//       else recurrenceActive = "no";
//     }

//     const dateForDb = ymdToLocalDatetime(normalizedYMD);
//     const recurrenceNextForDb = recurrenceNextYMD
//       ? ymdToLocalDatetime(recurrenceNextYMD)
//       : null;

//     const sql = `
//       INSERT INTO income
//       (date, category_name, amount, repeats, note, recurrence_next_date, recurrence_active, auto_generated, employee_name, created_at, updated_at)
//       VALUES (?, ?, ?, ?, ?, ?, ?, 'no', ?, NOW(), NOW())
//     `;

//     const values = [
//       dateForDb,
//       category_name,
//       numericAmount.toFixed(2),
//       repeats || "no",
//       note || null,
//       recurrenceNextForDb,
//       recurrenceActive,
//       employee_name || null,
//     ];

//     const result = await new Promise((resolve, reject) => {
//       db.query(sql, values, (err, results) => {
//         if (err) {
//           console.error("DB insert error:", err);
//           return reject(err);
//         }
//         resolve(results);
//       });
//     });

//     return res.status(201).json({
//       message: "Income added successfully",
//       incomeId: result.insertId,
//       nextRepeat: recurrenceNextYMD,
//     });
//   } catch (err) {
//     console.error("Error inserting income:", err);
//     return res.status(500).json({ error: "Database insert failed" });
//   }
// });

// helpers

function pad(n) {
  return String(n).padStart(2, "0");
}

function normalizeRepeats(val) {
  if (val === undefined || val === null) return "no";
  if (typeof val === "string")
    return val.trim().toLowerCase() === "yes" ? "yes" : "no";
  return !!val ? "yes" : "no";
}

function toLocalYMD(dateStr) {
  if (!dateStr) return null;
  try {
    const isYMD = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    const dt = isYMD ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
    if (isNaN(dt.getTime())) return null;
    const yyyy = dt.getFullYear();
    const mm = pad(dt.getMonth() + 1);
    const dd = pad(dt.getDate());
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return null;
  }
}

function addMonthsClamp(ymd, months = 1) {
  const base = new Date(ymd + "T00:00:00");
  const y0 = base.getFullYear(),
    m0 = base.getMonth(),
    d0 = base.getDate();
  const target = m0 + months;
  const y = y0 + Math.floor(target / 12);
  const m = ((target % 12) + 12) % 12;
  const tentative = new Date(y, m, d0);
  const finalDate =
    tentative.getMonth() !== m ? new Date(y, m + 1, 0) : tentative;
  const yyyy = finalDate.getFullYear();
  const mm = String(finalDate.getMonth() + 1).padStart(2, "0");
  const dd = String(finalDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function ymdToLocalDatetime(ymd) {
  if (!ymd) return null;
  return `${ymd} 00:00:00`;
}

function dateLikeToYMD(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
      value.getDate()
    )}`;
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

router.post("/incomepost", async (req, res) => {
  try {
    const { date, category_name, amount, repeats, note, employee_name } =
      req.body;

    const normalizedYMD = toLocalYMD(date);
    if (!normalizedYMD)
      return res.status(400).json({ error: "Invalid or missing date" });

    if (!category_name || category_name === "")
      return res.status(400).json({ error: "category_name is required" });
    if (amount === undefined || amount === null || amount === "")
      return res.status(400).json({ error: "amount is required" });

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0)
      return res
        .status(400)
        .json({ error: "amount must be a positive number" });

    const repeatsStored = normalizeRepeats(repeats);

    let recurrenceNextYMD = null;
    let recurrenceActive = "no";
    if (repeatsStored === "yes") {
      recurrenceNextYMD = addMonthsClamp(normalizedYMD, 1);
      recurrenceActive = recurrenceNextYMD ? "yes" : "no";
    }

    const dateForDb = ymdToLocalDatetime(normalizedYMD);
    const recurrenceNextForDb = recurrenceNextYMD
      ? ymdToLocalDatetime(recurrenceNextYMD)
      : null;

    const sql = `
      INSERT INTO income
      (date, category_name, amount, repeats, note, recurrence_next_date, recurrence_active, auto_generated, employee_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'no', ?, NOW(), NOW())
    `;

    const values = [
      dateForDb,
      category_name,
      numericAmount.toFixed(2),
      repeatsStored,
      note || null,
      recurrenceNextForDb,
      recurrenceActive,
      employee_name || null,
    ];

    const result = await new Promise((resolve, reject) => {
      db.query(sql, values, (err, results) =>
        err ? reject(err) : resolve(results)
      );
    });

    return res.status(201).json({
      message: "Income added successfully",
      incomeId: result.insertId,
      nextRepeat: recurrenceNextYMD,
    });
  } catch (err) {
    console.error("Error inserting income:", err);
    return res.status(500).json({ error: "Database insert failed" });
  }
});

async function processDueRecurrences() {
  try {
    const findSql = `
      SELECT id
      FROM income
      WHERE LOWER(repeats) = 'yes'
        AND LOWER(recurrence_active) = 'yes'
        AND recurrence_next_date IS NOT NULL
        AND DATE(recurrence_next_date) <= CURDATE()
        AND auto_generated = 'no'
    `;

    const candidates = await new Promise((resolve, reject) => {
      db.query(findSql, (err, rows) => (err ? reject(err) : resolve(rows)));
    });

    if (!candidates || candidates.length === 0) {
      return;
    }

    for (const c of candidates) {
      const origId = c.id;
      try {
        await new Promise((resolve, reject) =>
          db.beginTransaction((err) => (err ? reject(err) : resolve()))
        );

        const origRows = await new Promise((resolve, reject) => {
          db.query(
            "SELECT * FROM income WHERE id = ? FOR UPDATE",
            [origId],
            (err, rows) => (err ? reject(err) : resolve(rows))
          );
        });

        if (!origRows || origRows.length === 0) {
          await new Promise((r) => db.rollback(r));
          console.warn("[recurrence-worker] missing id=", origId);
          continue;
        }
        const orig = origRows[0];

        if (String(orig.auto_generated || "no").toLowerCase() === "yes") {
          await new Promise((r) => db.rollback(r));
          console.warn(
            "[recurrence-worker] skipping auto_generated id=",
            origId
          );
          continue;
        }
        const origRepeats = String(orig.repeats || "").toLowerCase();
        const origActive = String(orig.recurrence_active || "").toLowerCase();
        if (
          origRepeats !== "yes" ||
          origActive !== "yes" ||
          !orig.recurrence_next_date
        ) {
          await new Promise((r) => db.rollback(r));
          console.log("[recurrence-worker] not eligible id=", origId);
          continue;
        }

        const genYMD = dateLikeToYMD(orig.recurrence_next_date);
        if (!genYMD) {
          await new Promise((r) => db.rollback(r));
          console.warn(
            "[recurrence-worker] bad recurrence_next_date for id=",
            origId,
            orig.recurrence_next_date
          );
          continue;
        }

        console.log(
          `[recurrence-worker] id=${origId} will generate for date=${genYMD}`
        );

        const genDateForDb = ymdToLocalDatetime(genYMD);
        const insertSql = `
          INSERT INTO income
          (date, category_name, amount, repeats, note, recurrence_next_date, recurrence_active, auto_generated, employee_name, created_at, updated_at)
          VALUES (?, ?, ?, 'no', ?, NULL, 'no', 'yes', ?, NOW(), NOW())
        `;
        const insertVals = [
          genDateForDb,
          orig.category_name,
          orig.amount,
          orig.note || null,
          orig.employee_name || null,
        ];
        const insertResult = await new Promise((resolve, reject) => {
          db.query(insertSql, insertVals, (err, results) =>
            err ? reject(err) : resolve(results)
          );
        });

        const nextAfterGenYMD = addMonthsClamp(genYMD, 1);
        const nextAfterGenForDb = nextAfterGenYMD
          ? ymdToLocalDatetime(nextAfterGenYMD)
          : null;
        const nextAfterGenActive = nextAfterGenYMD ? "yes" : "no";

        const updateSql = `UPDATE income SET recurrence_next_date = ?, recurrence_active = ? WHERE id = ?`;
        await new Promise((resolve, reject) => {
          db.query(
            updateSql,
            [nextAfterGenForDb, nextAfterGenActive, origId],
            (err, results) => (err ? reject(err) : resolve(results))
          );
        });

        await new Promise((resolve, reject) =>
          db.commit((err) => (err ? reject(err) : resolve()))
        );

        console.log(
          `[recurrence-worker] processed id=${origId} -> generated id=${insertResult.insertId}, next=${nextAfterGenForDb}`
        );
      } catch (procErr) {
        console.error(
          "[recurrence-worker] error processing id=",
          origId,
          procErr
        );
        try {
          await new Promise((r) => db.rollback(r));
        } catch (e) {
          console.error("[recurrence-worker] rollback failed", e);
        }
      }
    }
  } catch (err) {
    console.error("[recurrence-worker] worker failed:", err);
  } finally {
    new Date().toISOString();
  }
}

function scheduleDailyAt(hour = 0, minute = 5, fn) {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );
  if (next <= now) next.setDate(next.getDate() + 1);
  const msToNext = next.getTime() - now.getTime();

  fn().catch((err) =>
    console.error("[recurrence-worker] immediate run error:", err)
  );

  setTimeout(() => {
    fn().catch((err) =>
      console.error("[recurrence-worker] scheduled run error:", err)
    );
    setInterval(() => {
      fn().catch((err) =>
        console.error("[recurrence-worker] scheduled run error:", err)
      );
    }, 24 * 60 * 60 * 1000);
  }, msToNext);
}

scheduleDailyAt(0, 5, processDueRecurrences);

router.get("/allrepeat", async (req, res) => {
  try {
    const sql = `
      SELECT
        t.emp_name AS employee_name,
        -- pick most frequent category for this employee (if none, show 'Unknown')
        (
          SELECT IFNULL(NULLIF(TRIM(i2.category_name), ''), 'Unknown')
          FROM income i2
          WHERE IFNULL(NULLIF(TRIM(i2.employee_name), ''), 'Unknown') = t.emp_name
          GROUP BY i2.category_name
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS category_name,
        COUNT(*) AS occurrences,
        ROUND(SUM(
          CAST(REPLACE(IFNULL(t.amount, '0'), ',', '') AS DECIMAL(20,2))
        ), 2) AS total_amount,
        ROUND(SUM(
          CAST(REPLACE(IFNULL(t.amount, '0'), ',', '') AS DECIMAL(20,2))
        ), 2) AS amount,
        MIN(t.date) AS first_date,
        MAX(t.date) AS last_date
      FROM (
        SELECT
          IFNULL(NULLIF(TRIM(employee_name), ''), 'Unknown') AS emp_name,
          amount,
          date,
          category_name
        FROM income
      ) AS t
      GROUP BY t.emp_name
      ORDER BY total_amount DESC
      LIMIT 500
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      const out = (results || []).map((r) => ({
        employee_name: r.employee_name,
        category_name: r.category_name || "Unknown",
        occurrences: Number(r.occurrences) || 0,
        total_amount:
          r.total_amount === null ? "0.00" : Number(r.total_amount).toFixed(2),
        amount: r.amount === null ? "0.00" : Number(r.amount).toFixed(2),
        first_date: r.first_date,
        last_date: r.last_date,
      }));

      return res.status(200).json(out);
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/incomedelete-by-employee", (req, res) => {
  const emp = (req.query.employee_name || "").trim();
  if (!emp) {
    return res
      .status(400)
      .json({ error: "employee_name query parameter required" });
  }

  const delSql = "DELETE FROM income WHERE employee_name = ?";
  db.query(delSql, [emp], (err, result) => {
    if (err) {
      console.error("DB delete error:", err);
      return res
        .status(500)
        .json({ error: "Failed to delete records for employee" });
    }
    return res.status(200).json({
      message: `Deleted rows for employee ${emp}`,
      deletedRows: result.affectedRows,
    });
  });
});

router.get("/alldata", async (req, res) => {
  const sql = "select *from income";
  db.query(sql, (err, result) => {
    if (err) throw err;
    else {
      res.json(result);
    }
  });
});

router.post("/categorypost", upload.single("file"), (req, res) => {
  try {
    let { category_name, amount, note } = req.body;
    const image = req.file ? req.file.filename : null;

    category_name =
      category_name && category_name.trim() !== "" ? category_name : null;
    note = note && note.trim() !== "" ? note : null;

    const sql = `
      INSERT INTO category (category_name, amount, image, note)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [category_name, amount, image, note], (err, result) => {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.status(201).json({
        success: true,
        message: "Category added successfully",
        data: {
          id: result.insertId,
          category_name,
          amount,
          image,
          note,
        },
      });
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/allcategorydata", (req, res) => {
  const sql = "SELECT  *FROM category";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Database Fetch Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  });
});

router.delete("/categorydelete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: "Category ID is required" });
    }
    const sql = "DELETE FROM category WHERE id = ?";
    const [result] = await db.promise().query(sql, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Shop not found" });
    }
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting Category:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/categoryedit/:id", upload.single("file"), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category id" });
    }

    let { category_name, note, amount } = req.body;
    const newImageFilename = req.file ? req.file.filename : null;

    if (typeof category_name === "string") {
      category_name = category_name.trim();
      if (category_name === "") category_name = undefined;
    } else {
      category_name = undefined;
    }

    if (typeof note === "string") {
      note = note.trim();
      if (note === "") note = undefined;
    } else {
      note = undefined;
    }

    let parsedAmount;
    if (amount === undefined || amount === null || amount === "") {
      parsedAmount = undefined;
    } else {
      parsedAmount = Number(amount);
      if (Number.isNaN(parsedAmount)) {
        parsedAmount = undefined;
      }
    }

    db.query("SELECT * FROM category WHERE id = ?", [id], (selectErr, rows) => {
      if (selectErr) {
        console.error("DB select error:", selectErr);
        if (newImageFilename) {
          const tmpPath = path.join(
            __dirname,
            "..",
            "uploads",
            newImageFilename
          );
          fs.unlink(tmpPath, (uerr) => {
            if (uerr)
              console.warn(
                "Failed to remove orphan upload:",
                tmpPath,
                uerr.message
              );
          });
        }
        return res
          .status(500)
          .json({ success: false, message: "Database error" });
      }

      if (!rows || rows.length === 0) {
        if (newImageFilename) {
          const tmpPath = path.join(
            __dirname,
            "..",
            "uploads",
            newImageFilename
          );
          fs.unlink(tmpPath, (uerr) => {
            if (uerr)
              console.warn(
                "Failed to remove orphan upload:",
                tmpPath,
                uerr.message
              );
          });
        }
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      const existing = rows[0];

      const finalCategoryName =
        category_name !== undefined ? category_name : existing.category_name;
      const finalNote = note !== undefined ? note : existing.note;
      const finalImage =
        newImageFilename !== null ? newImageFilename : existing.image;
      const finalAmount =
        parsedAmount !== undefined ? parsedAmount : existing.amount;

      const updateSql = `
        UPDATE category
        SET category_name = ?, image = ?, note = ?, amount = ?
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [finalCategoryName, finalImage, finalNote, finalAmount, id],
        (updateErr, updateResult) => {
          if (updateErr) {
            console.error("DB update error:", updateErr);

            if (newImageFilename) {
              const newPath = path.join(
                __dirname,
                "..",
                "uploads",
                newImageFilename
              );
              fs.unlink(newPath, (uerr) => {
                if (uerr)
                  console.warn(
                    "Failed to remove orphan upload after failed update:",
                    newPath,
                    uerr.message
                  );
              });
            }

            return res
              .status(500)
              .json({ success: false, message: "Database error" });
          }

          if (
            newImageFilename &&
            existing.image &&
            existing.image !== newImageFilename
          ) {
            const oldPath = path.join(
              __dirname,
              "..",
              "uploads",
              existing.image
            );
            fs.unlink(oldPath, (unlinkErr) => {
              if (unlinkErr && unlinkErr.code !== "ENOENT") {
                console.warn(
                  "Failed to delete old image:",
                  oldPath,
                  unlinkErr.message
                );
              }
            });
          }

          db.query(
            "SELECT * FROM category WHERE id = ?",
            [id],
            (selErr2, updatedRows) => {
              if (selErr2) {
                console.error("DB re-select error:", selErr2);
                return res.status(200).json({
                  success: true,
                  message: "Category updated (could not fetch updated row)",
                  data: {
                    id,
                    category_name: finalCategoryName,
                    image: finalImage,
                    note: finalNote,
                    amount: finalAmount,
                  },
                });
              }

              return res.status(200).json({
                success: true,
                message: "Category updated successfully",
                data:
                  updatedRows && updatedRows[0]
                    ? updatedRows[0]
                    : {
                        id,
                        category_name: finalCategoryName,
                        image: finalImage,
                        note: finalNote,
                        amount: finalAmount,
                      },
              });
            }
          );
        }
      );
    });
  } catch (error) {
    console.error("Server error in category edit:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/somecategory/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "Category ID is required" });
  }
  try {
    const sql = "SELECT * FROM category WHERE id = ?";
    const [rows] = await db.promise().query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Error fetching category:", err);
    res.status(500).json({ message: "Failed to fetch category", error: err });
  }
});

router.post("/shopexpensepost", async (req, res) => {
  try {
    const { reason, category_name, amount, shop_name } = req.body;

    if (!category_name || !amount || !shop_name) {
      return res.status(400).json({
        success: false,
        message: "category_name, amount and shop_name are required",
      });
    }

    const query = `
      INSERT INTO shopex (reason, category_name, amount, shop_name)
      VALUES (?, ?, ?, ?)
    `;

    const values = [reason || null, category_name, amount, shop_name];

    const [result] = await db.promise().query(query, values);

    return res.status(201).json({
      success: true,
      message: "Shop expense added successfully",
      insertedId: result.insertId,
    });
  } catch (error) {
    console.error("Error inserting shop expense:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/employeeexpensepost", async (req, res) => {
  try {
    const { shop_name, employee_name, reason, category_name, amount } =
      req.body;

    if (!shop_name || !employee_name || !category_name || !amount) {
      return res.status(400).json({
        success: false,
        message:
          "shop_name, employee_name, category_name, and amount are required",
      });
    }

    const query = `
      INSERT INTO employeeex (shop_name, employee_name, reason, category_name, amount)
      VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      shop_name,
      employee_name,
      reason || null,
      category_name,
      amount,
    ];

    const [result] = await db.promise().query(query, values);

    return res.status(201).json({
      success: true,
      message: "Employee expense added successfully",
      insertedId: result.insertId,
    });
  } catch (error) {
    console.error("Error inserting employee expense:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/personalexpense", async (req, res) => {
  try {
    const { reason, category_name, amount } = req.body;

    if (!category_name || !amount) {
      return res.status(400).json({
        success: false,
        message: "category_name and amount are required",
      });
    }

    const query = `
      INSERT INTO personalex (reason, category_name, amount)
      VALUES (?, ?, ?)
    `;

    const values = [reason || null, category_name, amount];

    const [result] = await db.promise().query(query, values);

    return res.status(201).json({
      success: true,
      message: "Personal expense added successfully",
      insertedId: result.insertId,
    });
  } catch (error) {
    console.error("Error inserting personal expense:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/combinedata", async (req, res) => {
  try {
    const [shopRows, employeeRows, personalRows] = await Promise.all([
      db
        .promise()
        .query(
          `SELECT id, shop_name, NULL AS employee_name, reason, category_name, amount, created_at
           FROM shopex
           ORDER BY created_at DESC`
        )
        .then((r) => r[0]),

      db
        .promise()
        .query(
          `SELECT id, shop_name, employee_name, reason, category_name, amount, created_at
           FROM employeeex
           ORDER BY created_at DESC`
        )
        .then((r) => r[0]),

      db
        .promise()
        .query(
          `SELECT id, NULL AS shop_name, NULL AS employee_name, reason, category_name, amount, created_at
           FROM personalex
           ORDER BY created_at DESC`
        )
        .then((r) => r[0]),
    ]);

    const shops = shopRows.map((row) => ({ ...row, type: "shop" }));
    const employees = employeeRows.map((row) => ({ ...row, type: "employee" }));
    const personals = personalRows.map((row) => ({ ...row, type: "personal" }));

    return res.json({
      success: true,
      message: "Fetched all expense data successfully",
      count: {
        shopex: shops.length,
        employeeex: employees.length,
        personalex: personals.length,
      },
      data: {
        shopex: shops,
        employeeex: employees,
        personalex: personals,
      },
    });
  } catch (err) {
    console.error("Error fetching combined data:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch combined data",
    });
  }
});

// export excel

function safeJsonParse(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (s.length === 0) return null;

  try {
    return JSON.parse(s);
  } catch (e) {
    try {
      const replaced = s.replace(/'/g, '"');
      return JSON.parse(replaced);
    } catch (e2) {
      return s;
    }
  }
}

function extractNumberFrom(item) {
  if (item == null) return NaN;
  if (typeof item === "number") return item;
  if (typeof item === "string") {
    const p = parseFloat(item);
    return Number.isNaN(p) ? NaN : p;
  }
  if (typeof item === "object") {
    if ("amount" in item) return Number(item.amount) || NaN;
    if ("value" in item) return Number(item.value) || NaN;
    for (const v of Object.values(item)) {
      const p = parseFloat(v);
      if (!Number.isNaN(p)) return p;
    }
  }
  return NaN;
}

function sumAdvanceHistory(hist) {
  if (!hist) return 0;
  if (Array.isArray(hist)) {
    return hist.reduce((acc, item) => {
      const n = extractNumberFrom(item);
      return acc + (isFinite(n) ? n : 0);
    }, 0);
  }
  const n = extractNumberFrom(hist);
  return isFinite(n) ? n : 0;
}

function flattenAdvanceReason(raw) {
  if (raw == null) return "";

  if (Array.isArray(raw)) {
    const parts = [];
    for (const item of raw) {
      if (item == null) continue;
      if (typeof item === "string") {
        const s = item.trim();
        if (s) parts.push(s);
        continue;
      }
      if (typeof item === "object") {
        // collect keys and values
        const keys = Object.keys(item)
          .map((k) => String(k).trim())
          .filter(Boolean);
        const vals = Object.values(item)
          .map((v) => (v == null ? "" : String(v).trim()))
          .filter(Boolean);
        parts.push(...keys, ...vals);
        continue;
      }
      parts.push(String(item).trim());
    }
    return Array.from(new Set(parts)).join(", ");
  }

  if (typeof raw === "object") {
    const keys = Object.keys(raw)
      .map((k) => String(k).trim())
      .filter(Boolean);
    const vals = Object.values(raw)
      .map((v) => (v == null ? "" : String(v).trim()))
      .filter(Boolean);
    return Array.from(new Set([...keys, ...vals])).join(", ");
  }

  if (typeof raw === "string") {
    const s = raw.trim();
    if (s.length === 0) return "";

    const arrObjKeyMatch = s.match(
      /^\s*\[\s*\{\s*["']?([^"'}]+?)["']?\s*\}\s*\]\s*$/
    );
    if (arrObjKeyMatch && arrObjKeyMatch[1]) {
      return arrObjKeyMatch[1].trim();
    }

    const objKeyMatch = s.match(/^\s*\{\s*["']?([^"'}]+?)["']?\s*\}\s*$/);
    if (objKeyMatch && objKeyMatch[1]) {
      return objKeyMatch[1].trim();
    }

    const bracketSingleMatch = s.match(
      /^\s*\[\s*["']?([^"'\]]+?)["']?\s*\]\s*$/
    );
    if (bracketSingleMatch && bracketSingleMatch[1]) {
      return bracketSingleMatch[1].trim();
    }

    const parsed = safeJsonParse(s);
    if (parsed && parsed !== s) {
      return flattenAdvanceReason(parsed);
    }

    const parts = s
      .split(/[,;|]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return Array.from(new Set(parts)).join(", ");

    return s;
  }

  return String(raw);
}

router.get("/export-excel/:id", async (req, res) => {
  try {
    const empId = req.params.id;
    if (!empId) {
      return res
        .status(400)
        .json({ message: "Employee id is required in URL" });
    }

    const now = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(
      firstOfThisMonth.getFullYear(),
      firstOfThisMonth.getMonth() - 1,
      1
    );
    const lastMonth = firstOfLastMonth.getMonth() + 1; // 1..12
    const lastMonthYear = firstOfLastMonth.getFullYear();

    const query = `
      SELECT 
        id,
        employee_name,
        shop_name,
        advance_history,
        advance_reason
      FROM employee
      WHERE id = ? AND MONTH(created_at) = ? AND YEAR(created_at) = ?
      ORDER BY shop_name, employee_name
    `;

    const [rows] = await db
      .promise()
      .execute(query, [empId, lastMonth, lastMonthYear]);

    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No records found for this employee in last month." });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Employee_LastMonth_Advance");

    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Employee Name", key: "employee_name", width: 30 },
      { header: "Shop Name", key: "shop_name", width: 25 },
      { header: "Advance (Sum)", key: "advance_sum", width: 15 },
      { header: "Advance Reason", key: "advance_reason", width: 50 },
    ];

    for (const r of rows) {
      const ahRaw = r.advance_history;
      const ahParsed = safeJsonParse(ahRaw) ?? ahRaw;
      const advanceSum = sumAdvanceHistory(ahParsed);

      const arRaw = r.advance_reason;
      const arParsed = safeJsonParse(arRaw) ?? arRaw;
      const advanceReasonStr = flattenAdvanceReason(arParsed);

      sheet.addRow({
        id: r.id,
        employee_name: r.employee_name,
        shop_name: r.shop_name,
        advance_sum: advanceSum,
        advance_reason: advanceReasonStr,
      });
    }

    sheet.getRow(1).font = { bold: true };

    const empNameSafe = rows[0].employee_name
      ? String(rows[0].employee_name).replace(/[^a-z0-9_\- ]/gi, "")
      : `employee_${empId}`;
    const monthStr = String(lastMonth).padStart(2, "0");
    const fileName = `advance_${empNameSafe}_${lastMonthYear}_${monthStr}.xlsx`;

    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export Excel error:", err);
    res
      .status(500)
      .json({ message: "Failed to export Excel", error: err.message });
  }
});

export default router;
