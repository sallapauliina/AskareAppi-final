const { Pool } = require("pg");
require("dotenv").config();
// const fs = require("fs");
// const path = require("path");

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

// function getSqlFilePath(fileName) {
//   return path.resolve(__dirname, "./database/sql", fileName);
// }

// async function executeSqlFile(fileName) {
//   const sqlFilePath = getSqlFilePath(fileName);

//   try {
//     console.log(`Reading SQL file: ${sqlFilePath}`);
//     const sql = fs.readFileSync(sqlFilePath, "utf8");
//     await pool.query(sql);
//     console.log(`${fileName} executed successfully`);
//   } catch (error) {
//     console.error(`Error executing ${fileName}:`, error);
//   }
// }

// async function setupDatabase() {
//   try {
//     console.log("Starting database setup...");
//     await executeSqlFile("create_tables.sql");
//     await executeSqlFile("tasks.sql");
//     console.log("Database setup complete!");
//   } catch (err) {
//     console.error("Error setting up the database:", err);
//   }
// }

module.exports = { pool };
