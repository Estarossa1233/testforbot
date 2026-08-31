const fs = require("fs");
const path = require("path");

// Membaca file JSON
function read(fileName, defaultData = []) {

    const filePath = path.join(__dirname, "../database", fileName);

    if (!fs.existsSync(filePath)) {

        fs.writeFileSync(
            filePath,
            JSON.stringify(defaultData, null, 2)
        );

        return defaultData;

    }

    const data = fs.readFileSync(filePath, "utf8");

    if (!data.trim()) {
        return defaultData;
    }

    return JSON.parse(data);

}

// Menulis file JSON
function write(fileName, data) {

    const filePath = path.join(__dirname, "../database", fileName);

    fs.writeFileSync(
        filePath,
        JSON.stringify(data, null, 2)
    );

}

// ==========================
// USER
// ==========================

function addUser(user) {
    console.log("ADD USER:", user);

    const users = read("users.json", []);

    const index = users.findIndex(
        u => u.telegram_id === user.telegram_id
    );

    if (index === -1) {

        users.push(user);

    } else {

        users[index] = {
            ...users[index],
            ...user
        };

    }

    write("users.json", users);

}

function getUser(id) {

    const users = read("users.json", []);

    return users.find(
        u => u.telegram_id === id
    );

}

// ==========================
// MESSAGE
// ==========================

function addMessage(message) {
    console.log("ADD MESSAGE:", message);

    const messages = read("messages.json", []);

    messages.push(message);

    write("messages.json", messages);

}

function getMessages(chatId) {

    const messages = read("messages.json", []);

    return messages.filter(
        m => m.telegram_id === chatId
    );

}

// ==========================

module.exports = {

    read,
    write,

    addUser,
    getUser,

    addMessage,
    getMessages

};