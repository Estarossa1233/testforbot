require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
const TelegramBotModule = require("node-telegram-bot-api");

const TelegramBot =
    TelegramBotModule.default || TelegramBotModule;
const { askOllama, MODEL } = require("./services/ollama"); 
const bonus = require("./prompt/bonus");
const gameGacor = require("./prompt/game gacor");
const pola = require("./prompt/pola");
const app = express();
const PORT = process.env.PORT || 3000;
const jsonDB = require("./services/jsonDB");
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: process.env.BOT_POLLING !== "false"
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "public")));

// =======================
// API USERS
// =======================

app.get("/api/users", (req, res) => {

    const users = jsonDB.read("users.json", []);

    res.json({
        success: true,
        users
    });

});

// =======================
// API MESSAGES
// =======================

app.get("/api/messages/:id", (req, res) => {

    const chatId = Number(req.params.id);

    const messages = jsonDB.getMessages(chatId);

    res.json({
        success: true,
        messages
    });

});

// =======================
// API MANUAL CHAT ADMIN
// =======================

app.post("/api/messages/:id/send", async (req, res) => {
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

        // Kirim langsung ke Telegram
        await bot.sendMessage(chatId, messageText);

        // Simpan pesan admin ke database
        jsonDB.addMessage({
            telegram_id: chatId,
            sender: "admin",
            text: messageText,
            time: new Date().toLocaleString("id-ID")
        });

        res.json({
            success: true,
            message: "Pesan berhasil dikirim."
        });

    } catch (err) {

        console.error("MANUAL CHAT ERROR:", err);

        res.status(500).json({
            success: false,
            message: "Gagal mengirim pesan ke Telegram."
        });
    }
});

bot.on("message", async (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text;

        jsonDB.addUser({

    telegram_id: chatId,

    username: msg.from.username || "",

    first_name: msg.from.first_name || "",

    last_name: msg.from.last_name || "",

    last_active: new Date().toLocaleString("id-ID")

});

        // Abaikan pesan kosong
        if (!text) return;

        jsonDB.addMessage({

    telegram_id: chatId,

    sender: "user",

    text,

    time: new Date().toLocaleString("id-ID")

});

        // Command /start
        if (text === "/start") {
          await new Promise(resolve => setTimeout(resolve, 1500));
            await bot.sendMessage(
                chatId,
                "👋 Hallo kakk"
            );

          await new Promise(resolve => setTimeout(resolve, 1000));
            await bot.sendMessage(
                chatId,
                "Selamat datang di IMBAJP,Dengan Lanny Admin kesayangan mu ada yang bisa di bantu?"
            );
        }
        if (text === "kak,kakk,hallo,hallo kak") {
          await new Promise(resolve => setTimeout(resolve, 1500));
            await bot.sendMessage(
                chatId,
                "Iya Hallo kakk ada yang bisa Lany bantu?"
            );
         }    
        // Abaikan command lain
        if (text.startsWith("/")) return;

        await bot.sendChatAction(chatId, "typing");

         const lower = text.toLowerCase().trim();

        // Perintah khusus
        if (
      text === "pola" ||
      text === "pola gacor" ||
      text === "pola hari ini"
    ) {
     await new Promise(resolve => setTimeout(resolve, 2000));

      return bot.sendMessage(chatId, pola);
    }
    if (lower.includes("bonus")) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    return bot.sendMessage(chatId, bonus);
    }

    if (lower.includes("game gacor")) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    return bot.sendMessage(chatId, gameGacor);
}

    

        const reply = await askOllama(text);

jsonDB.addMessage({

    telegram_id: chatId,

    sender: "bot",

    text: reply,

    time: new Date().toLocaleString("id-ID")

});

await bot.sendMessage(chatId, reply);

    } catch (err) {
        console.error(err);

        bot.sendMessage(
            msg.chat.id,
            "⚠️ AI sedang offline."
        );
    }
});

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    server: "Online",
    model: MODEL
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Prompt kosong."
      });
    }

    // ==========================
    // KIRIM KE OLLAMA
    // ==========================
    const reply = await askOllama(prompt);

return res.json({
  success: true,
  reply
});

  } catch (err) {
    console.log(err.message);

    return res.status(500).json({
      success: false,
      message: "Gagal terhubung ke Ollama."
    });
  }
});




app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


app.listen(PORT, () => {

  console.log("----------------------------------");
  console.log(" IMBAJP AI Dashboard");
  console.log("----------------------------------");
  console.log(`Server : http://localhost:${PORT}`);
  console.log(`Model  : ${MODEL}`);
  console.log("----------------------------------");
  console.log("JSON Database Ready");
});
