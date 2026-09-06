const mysql = require("mysql2/promise");
const fs = require("fs");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        ca: fs.readFileSync(process.env.DB_CA_PATH),
        rejectUnauthorized: true
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log("==================================");
        console.log(" MySQL Aiven Connected");
        console.log(" Database :", process.env.DB_NAME);
        console.log(" Host     :", process.env.DB_HOST);
        console.log(" Port     :", process.env.DB_PORT);
        console.log("==================================");

        connection.release();
    } catch (error) {
        console.error("❌ MySQL Connection Failed:");
        console.error(error.message);
    }
}

async function addUser(user) {
    const sql = `
        INSERT INTO users
        (telegram_id, username, first_name, last_name, last_active)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            last_active = VALUES(last_active)
    `;

    await pool.execute(sql, [
        user.telegram_id,
        user.username || "",
        user.first_name || "",
        user.last_name || "",
        user.last_active || new Date()
    ]);
}

async function addMessage(message) {
    const sql = `
        INSERT INTO messages
        (telegram_id, sender, text, time)
        VALUES (?, ?, ?, ?)
    `;

    await pool.execute(sql, [
        message.telegram_id,
        message.sender,
        message.text,
        message.time || new Date()
    ]);
}

async function getUsers() {
    const [rows] = await pool.execute(`
        SELECT *
        FROM users
        ORDER BY last_active DESC
    `);

    return rows;
}

async function getMessages(telegram_id) {
    const [rows] = await pool.execute(`
        SELECT *
        FROM messages
        WHERE telegram_id = ?
        ORDER BY id ASC
    `, [telegram_id]);

    return rows;
}


// =========================
// BOCORAN
// =========================

async function saveBocoran(file_id, caption) {

    // Nonaktifkan bocoran lama
    await pool.execute(`
        UPDATE bocoran
        SET is_active = FALSE
    `);

    // Simpan bocoran baru
    await pool.execute(`
        INSERT INTO bocoran
        (file_id, caption, is_active)
        VALUES (?, ?, TRUE)
    `, [
        file_id,
        caption || null
    ]);
}


async function getLatestBocoran() {

    const [rows] = await pool.execute(`
        SELECT *
        FROM bocoran
        WHERE is_active = TRUE
        ORDER BY id DESC
        LIMIT 1
    `);

    return rows[0] || null;
}


module.exports = {
    pool,
    testConnection,
    addUser,
    addMessage,
    getUsers,
    getMessages,
    saveBocoran,
    getLatestBocoran
};