require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const TelegramBotModule = require("node-telegram-bot-api");

const TelegramBot =
    TelegramBotModule.default || TelegramBotModule;

const db = require("./services/database");
const { testConnection } = db;

const { askOllama, MODEL } = require("./services/ollama");

const bonus = require("./prompt/bonus");
const gameGacor = require("./prompt/game gacor");
const pola = require("./prompt/pola");
const withdraw = require("./prompt/withdraw");

const app = express();

const PORT = process.env.PORT || 3000;

// =========================
// TELEGRAM BOT
// =========================

const bot = new TelegramBot(
    process.env.TELEGRAM_BOT_TOKEN,
    {
        polling: true
    }
);

// =========================
// TELEGRAM ERROR LOG
// =========================

bot.on("polling_error", (error) => {
    console.error(
        "TELEGRAM POLLING ERROR:",
        error.message
    );
});

bot.on("error", (error) => {
    console.error(
        "TELEGRAM BOT ERROR:",
        error.message
    );
});

// =========================
// WITHDRAW STATE
// =========================

const pendingWithdraw = new Map();

// =========================
// MIDDLEWARE
// =========================

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// =========================
// API MANUAL CHAT ADMIN
// =========================

app.post(
    "/api/messages/:id/send",
    async (req, res) => {
        try {
            const chatId = Number(req.params.id);
            const { text } = req.body;

            if (!chatId) {
                return res.status(400).json({
                    success: false,
                    message: "Telegram ID tidak valid."
                });
            }

            if (!text || !text.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Pesan tidak boleh kosong."
                });
            }

            const messageText = text.trim();

            await bot.sendMessage(
                chatId,
                messageText
            );

            await db.addMessage({
                telegram_id: chatId,
                sender: "admin",
                text: messageText,
                time: new Date()
            });

            return res.json({
                success: true,
                message: "Pesan berhasil dikirim."
            });

        } catch (err) {

            console.error(
                "MANUAL CHAT ERROR:",
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    "Gagal mengirim pesan ke Telegram."
            });
        }
    }
);

// =========================
// TELEGRAM MESSAGE HANDLER
// =========================

bot.on(
    "message",
    async (msg) => {

        console.log(
            "=================================="
        );

        console.log(
            "TELEGRAM MESSAGE MASUK"
        );

        console.log(
            "Chat ID :",
            msg.chat?.id
        );

        console.log(
            "Text    :",
            msg.text || "(non-text)"
        );

        console.log(
            "From ID :",
            msg.from?.id
        );

        console.log(
            "=================================="
        );

        try {

            const chatId = msg.chat.id;
            const text = msg.text;

            // =========================
            // ADMIN SET BOCORAN
            // =========================

            if (
                msg.from?.id?.toString() ===
                    process.env.ADMIN_TELEGRAM_ID &&
                msg.photo
            ) {

                const photo =
                    msg.photo[
                        msg.photo.length - 1
                    ];

                await db.saveBocoran(
                    photo.file_id,
                    msg.caption || ""
                );

                await bot.sendMessage(
                    chatId,
                    "✅ Bocoran game terbaru sudah disimpan."
                );

                return;
            }

            // =========================
            // SIMPAN / UPDATE USER
            // =========================

            await db.addUser({
                telegram_id: chatId,
                username:
                    msg.from?.username || "",
                first_name:
                    msg.from?.first_name || "",
                last_name:
                    msg.from?.last_name || "",
                last_active: new Date()
            });

            // =========================
            // ABAIKAN NON-TEXT
            // =========================

            if (!text) {
                return;
            }

            // =========================
            // SIMPAN PESAN USER
            // =========================

            await db.addMessage({
                telegram_id: chatId,
                sender: "user",
                text: text,
                time: new Date()
            });

            // =========================
            // /START
            // =========================

            if (text === "/start") {

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 1500)
                );

                await bot.sendMessage(
                    chatId,
                    "👋 Hallo kakk"
                );

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 1000)
                );

                await bot.sendMessage(
                    chatId,
                    "Selamat datang di IMBAJP,Dengan Lanny Admin kesayangan mu ada yang bisa di bantu?"
                );

                return;
            }

            // =========================
            // SAPAAN
            // =========================

            const lower =
                text.toLowerCase().trim();

            if (
                [
                    "kak",
                    "kakk",
                    "hallo",
                    "halo",
                    "hallo kak",
                    "halo kak"
                ].includes(lower)
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 1500)
                );

                await bot.sendMessage(
                    chatId,
                    "Iya Hallo kakk ada yang bisa Lany bantu?"
                );

                return;
            }

            // =========================
            // COMMAND LAIN
            // =========================

            if (text.startsWith("/")) {
                return;
            }

            // =========================
            // TYPING
            // =========================

            await bot.sendChatAction(
                chatId,
                "typing"
            );

            // =========================
            // WITHDRAW
            // MENUNGGU USERNAME
            // =========================

            if (
                pendingWithdraw.has(chatId)
            ) {

                const username =
                    text.trim();

                pendingWithdraw.delete(
                    chatId
                );

                console.log(
                    "WITHDRAW USERNAME:",
                    username
                );

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 2000)
                );

                await bot.sendMessage(
                    chatId,
                    withdraw.messages[0]
                );

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 2000)
                );

                await bot.sendMessage(
                    chatId,
                    withdraw.messages[1]
                );

                return;
            }

            // =========================
            // USER MEMINTA WITHDRAW
            // =========================

            if (
                withdraw.keywords.some(
                    keyword =>
                        lower.includes(keyword)
                )
            ) {

                pendingWithdraw.set(
                    chatId,
                    true
                );

                await bot.sendMessage(
                    chatId,
                    withdraw.askUsername
                );

                return;
            }

            // =========================
            // POLA
            // =========================

            if (
                lower === "pola" ||
                lower === "pola gacor" ||
                lower === "pola hari ini"
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 2000)
                );

                return bot.sendMessage(
                    chatId,
                    pola
                );
            }

            // =========================
            // BONUS
            // =========================

            if (
                lower.includes("bonus")
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 2000)
                );

                return bot.sendMessage(
                    chatId,
                    bonus
                );
            }

            // =========================
            // GAME GACOR
            // =========================

            if (
                lower.includes("game gacor")
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 2000)
                );

                return bot.sendMessage(
                    chatId,
                    gameGacor
                );
            }

            // =========================
            // BOCORAN
            // =========================

            if (
                [
                    "bocoran",
                    "bocoran game",
                    "bocoran terbaru",
                    "game lain",
                    "game apa",
                    "game bagus"
                ].some(
                    keyword =>
                        lower.includes(keyword)
                )
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 1000)
                );

                const bocoran =
                    await db.getLatestBocoran();

                if (!bocoran) {

                    return bot.sendMessage(
                        chatId,
                        "Maaf yaa kakk, bocoran terbaru belum tersedia."
                    );
                }

                await bot.sendPhoto(
                    chatId,
                    bocoran.file_id,
                    {
                        caption:
                            bocoran.caption || ""
                    }
                );

                return;
            }

            // =========================
            // OLLAMA
            // =========================

            const reply =
                await askOllama(text);

            // =========================
            // SIMPAN JAWABAN BOT
            // =========================

            await db.addMessage({
                telegram_id: chatId,
                sender: "bot",
                text: reply,
                time: new Date()
            });

            
            // =========================
            // KIRIM JAWABAN
            // =========================
            
            function splitReply(text) {
            
                // Jika teks 250 karakter atau kurang,
                // kirim sebagai 1 pesan
                if (text.length <= 250) {
                    return [text];
                }
            
                const sentences = text.match(/[^.!?]+[.!?]+/g);
            
                // Jika tidak cukup untuk dibagi,
                // kirim sebagai 1 pesan
                if (!sentences || sentences.length < 2) {
                    return [text];
                }
            
                const middle = Math.ceil(sentences.length / 2);
            
                const part1 = sentences
                    .slice(0, middle)
                    .join("")
                    .trim();
            
                const part2 = sentences
                    .slice(middle)
                    .join("")
                    .trim();
            
                return [part1, part2].filter(Boolean);
            }
            
            const parts = splitReply(reply);
            
            for (const part of parts) {
            
                await bot.sendMessage(
                    chatId,
                    part
                );
            
                await new Promise(
                    resolve => setTimeout(resolve, 500)
                );
            }
const parts = splitReply(reply);

for (const part of parts) {
    await bot.sendMessage(chatId, part);

    await new Promise(
        resolve => setTimeout(resolve, 500)
    );
}

        } catch (err) {

            console.error(
                "MESSAGE HANDLER ERROR:",
                err
            );

            try {

                await bot.sendMessage(
                    msg.chat.id,
                    "⚠️ AI sedang offline."
                );

            } catch (sendError) {

                console.error(
                    "ERROR SEND FALLBACK:",
                    sendError.message
                );
            }
        }
    }
);

// =========================
// API STATUS
// =========================

app.get(
    "/api/status",
    (req, res) => {

        res.json({
            success: true,
            server: "Online",
            model: MODEL
        });
    }
);

// =========================
// API CHAT
// =========================

app.post(
    "/api/chat",
    async (req, res) => {

        try {

            const { prompt } =
                req.body;

            if (!prompt) {

                return res.status(400).json({
                    success: false,
                    message: "Prompt kosong."
                });
            }

            const reply =
                await askOllama(prompt);

            return res.json({
                success: true,
                reply
            });

        } catch (err) {

            console.error(
                "API CHAT ERROR:",
                err
            );

            return res.status(500).json({
                success: false,
                message:
                    "Gagal terhubung ke Ollama."
            });
        }
    }
);

// =========================
// FRONTEND
// =========================

app.get(
    "*",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );
    }
);

// =========================
// START SERVER
// =========================

app.listen(
    PORT,
    () => {

        console.log(
            "----------------------------------"
        );

        console.log(
            " IMBAJP AI Dashboard"
        );

        console.log(
            "----------------------------------"
        );

        console.log(
            `Server : http://localhost:${PORT}`
        );

        console.log(
            `Model  : ${MODEL}`
        );

        testConnection();
    }
);
