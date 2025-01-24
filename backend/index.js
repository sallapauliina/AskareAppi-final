const express = require("express");
const cors = require("cors");
const { pool } = require("./db");

require("dotenv").config();
// setupDatabase();

const app = express();
app.use(
  cors({
    origin: "https://askareappi-final-1.onrender.com",
    methods: ["GET", "POST", "PATCH"],
  })
);
app.use(express.json());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = user;
    next();
  });
};

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database connected. Time:", result.rows[0]);
    res.status(200).send("Database connection successful.");
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(500).send("Database connection failed.");
  }
});

app.get("/tasks", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const tasks = await pool.query("SELECT * FROM Tasks");
    console.log("All tasks fetched:", tasks.rows);

    const formatDate = (dateString) => {
      return new Date(dateString).toISOString().split("T")[0];
    };

    const overdueTasks = tasks.rows.filter(
      (task) => formatDate(task.due_date) < today && task.status !== "completed"
    );
    const todaysTasks = tasks.rows.filter(
      (task) => formatDate(task.due_date) === today
    );
    const upcomingTasks = tasks.rows.filter(
      (task) => formatDate(task.due_date) > today
    );

    console.log("Categorized tasks:", {
      overdue: overdueTasks,
      today: todaysTasks,
      upcoming: upcomingTasks,
    });

    res.json({
      overdue: overdueTasks,
      today: todaysTasks,
      upcoming: upcomingTasks,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/tasks/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM tasks WHERE task_id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const currentStatus = result.rows[0].status;
    const newStatus = currentStatus === "not done" ? "completed" : "not done";

    const updateTask = await pool.query(
      "UPDATE tasks SET status = $1 WHERE task_id = $2 RETURNING *",
      [newStatus, id]
    );

    res.json(updateTask.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/tasks", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  let decoded;
  try {
    decoded = jwt.verify(token, "terve");
    console.log("Decoded Token:", decoded);
  } catch (err) {
    console.error("Token verification failed:", err.message);
  }
  try {
    const { room, description, due_date, name } = req.body;
    const newTask = await pool.query(
      "INSERT INTO tasks (room, description, due_date, name, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [room, description, due_date, name, decoded.userId]
    );
    res.json(newTask.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("Signup request received:", { name, email, password });

    // Check for existing user
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    console.log("Existing user query result:", existingUser.rows);

    if (existingUser.rows.length > 0) {
      console.log("Email already exists:", email);
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password (currently just using plain password as a placeholder)
    const hashedPassword = password;
    console.log("Password hashed (or placeholder used):", hashedPassword);

    // Insert new user
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hashedPassword]
    );
    console.log("New user inserted:", newUser.rows);

    res.status(201).json({
      user: {
        id: newUser.rows[0].user_id,
        name: newUser.rows[0].name,
        email: newUser.rows[0].email,
      },
    });
  } catch (err) {
    console.error("Error in /signup route:", err.stack); // Log full error details
    res.status(500).json({ message: "Internal server error" });
  }
});

const jwt = require("jsonwebtoken");

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    console.log(user.rows, "user");
    if (user.rows.length === 0) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }

    const validPassword = password === user.rows[0].password_hash;

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }
    console.log(user.rows[0].user_id);
    const token = jwt.sign({ userId: user.rows[0].user_id }, "terve");
    res.send({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Closing database connection pool...");
  await pool.end();
  console.log("Pool closed, exiting process.");
  process.exit(0);
});

module.exports = app;
