require("dotenv").config();

const { testConnection } = require("./services/database");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const TelegramBotModule = require("node-telegram-bot-api");

const TelegramBot =
    TelegramBotModule.default || TelegramBotModule;
const { askOllama, MODEL } = require("./services/ollama"); 
const bonus = require("./prompt/bonus");
const gameGacor = require("./prompt/game gacor");
const pola = require("./prompt/pola");
const withdraw = require("./prompt/withdraw");

const app = express();
const PORT = process.env.PORT || 3000;
const db = require("./services/database");
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: false
});

bot.on("polling_error", (error) => {
    console.error("TELEGRAM POLLING ERROR:", error.message);
});

bot.on("error", (error) => {
    console.error("TELEGRAM BOT ERROR:", error.message);
});

const pendingWithdraw = new Map();


app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "public")));

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
            await db.addMessage({
            telegram_id: chatId,
            sender: "admin",
            text: messageText,
            time: new Date()
        });

        res.json({
            success: true,
            message: "Pesan berhasil dikirim."
        });
        // Simpan pesan admin ke database
        

    } catch (err) {

        console.error("MANUAL CHAT ERROR:", err);

        res.status(500).json({
            success: false,
            message: "Gagal mengirim pesan ke Telegram."
        });
    }
});



bot.on("message", async (msg) => {
    console.log("==================================");
    console.log("TELEGRAM MESSAGE MASUK");
    console.log("Chat ID :", msg.chat.id);
    console.log("Text    :", msg.text || "(non-text)");
    console.log("From ID :", msg.from?.id);
    console.log("==================================");
    try {
        const chatId = msg.chat.id;
        const text = msg.text;

        // =========================
        // ADMIN SET BOCORAN
        // =========================
        if (
            msg.from.id.toString() === process.env.ADMIN_TELEGRAM_ID &&
            msg.photo
        ) {
            const photo = msg.photo[msg.photo.length - 1];

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
        // SIMPAN USER
        // =========================
        await db.addUser({
            telegram_id: chatId,
            username: msg.from.username || "",
            first_name: msg.from.first_name || "",
            last_name: msg.from.last_name || "",
            last_active: new Date()
        });

        // =========================
        // ABAIKAN PESAN TANPA TEXT
        // =========================
        if (!text) return;

        await db.addMessage({
    telegram_id: chatId,
    sender: "user",
    text,
    time: new Date()
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

         // =========================
// USER SUDAH DIMINTA USERNAME
// =========================
if (pendingWithdraw.has(chatId)) {

    const username = text.trim();

    pendingWithdraw.delete(chatId);

    console.log(
        `Withdraw ${chatId} - Username: ${username}`
    );

    await new Promise(resolve =>
        setTimeout(resolve, 2000)
    );

    await bot.sendMessage(
        chatId,
        withdraw.messages[0]
    );

    await new Promise(resolve =>
        setTimeout(resolve, 2000)
    );

    await bot.sendMessage(
        chatId,
        withdraw.messages[1]
    );

    return;
}

// =========================
// USER MEMINTA PROSES WITHDRAW
// =========================
if (
    withdraw.keywords.some(keyword =>
        lower.includes(keyword)
    )
) {

    pendingWithdraw.set(chatId, true);

    await bot.sendMessage(
        chatId,
        withdraw.askUsername
    );

    return;
}
         
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

    // =========================
// USER REQUEST BOCORAN
// =========================
if (
    [
        "bocoran",
        "bocoran game",
        "bocoran terbaru",
        "game lain",
        "game apa",
        "game bagus"
    ].some(keyword => lower.includes(keyword))
) {
    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );

    const bocoran = await db.getLatestBocoran();

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
            caption: bocoran.caption || ""
        }
    );

    return;
}

    const reply = await askOllama(text);

    await db.addMessage({
        telegram_id: chatId,
        sender: "bot",
        text: reply,
        time: new Date()
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

// =========================
// START TELEGRAM POLLING
// =========================
(async () => {
    try {
        await bot.deleteWebHook();

        const me = await bot.getMe();

        console.log("==================================");
        console.log(" TELEGRAM BOT CONNECTED");
        console.log(" BOT USERNAME :", me.username);
        console.log(" BOT ID       :", me.id);
        console.log("==================================");

        await bot.startPolling();

        console.log("Telegram polling started.");
    } catch (error) {
        console.error("TELEGRAM START ERROR:");
        console.error(error.message);
    }
})();

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

  testConnection();
});
