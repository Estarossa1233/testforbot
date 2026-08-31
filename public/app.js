const serverStatus = document.getElementById("serverStatus");
const pageContent = document.getElementById("pageContent");
const pageTitle = document.getElementById("pageTitle");
const menuItems = document.querySelectorAll("#sidebarMenu li");


// ==============================
// CLICK USER CHAT
// ==============================

pageContent.addEventListener("click", function (event) {

    const button = event.target.closest(".viewChatBtn");

    if (!button) return;

    const telegramId = button.dataset.telegramId;

    console.log("CHAT USER DIKLIK:", telegramId);

    if (!telegramId) {
        console.error("Telegram ID tidak ditemukan");
        return;
    }

    viewUser(telegramId);

});


// ==============================
// CEK STATUS SERVER
// ==============================

async function checkStatus() {

    try {

        const res = await fetch("/api/status");
        const data = await res.json();

        serverStatus.innerHTML = "🟢 " + data.server;

    } catch (error) {

        serverStatus.innerHTML = "🔴 Offline";

    }

}

checkStatus();


// ==============================
// MENU SIDEBAR
// ==============================

menuItems.forEach(item => {

    item.addEventListener("click", () => {

        menuItems.forEach(menu => {
            menu.classList.remove("active");
        });

        item.classList.add("active");

        const page = item.dataset.page;

        showPage(page);

    });

});


// ==============================
// GANTI HALAMAN
// ==============================

function showPage(page) {

    // ==========================
    // DASHBOARD
    // ==========================

    if (page === "dashboard") {

        pageTitle.textContent = "Dashboard";

        pageContent.innerHTML = `

            <div class="dashboardPage">

                <h2>Dashboard</h2>

                <div class="stats">

                    <div class="card">
                        <h3>👥 Total Users</h3>
                        <p id="totalUsers">Loading...</p>
                    </div>

                    <div class="card">
                        <h3>💬 Total Chat</h3>
                        <p id="totalChats">Loading...</p>
                    </div>

                    <div class="card">
                        <h3>🟢 Server</h3>
                        <p>Online</p>
                    </div>

                </div>

            </div>

        `;

        loadDashboard();

    }


    // ==========================
    // AI CHAT
    // ==========================

    if (page === "ai-chat") {

        pageTitle.textContent = "AI Chat";

        pageContent.innerHTML = `

            <div class="chatBox">

                <div id="messages" class="messages"></div>

                <div class="inputArea">

                    <textarea
                        id="prompt"
                        placeholder="Tanyakan sesuatu ke Lany..."
                    ></textarea>

                    <button id="sendBtn">
                        Kirim
                    </button>

                </div>

            </div>

        `;

        setupAIChat();

    }


    // ==========================
    // CHAT HISTORY
    // ==========================

    if (page === "chat-history") {

        pageTitle.textContent = "Chat History";

        pageContent.innerHTML = `

            <div class="historyPage">

                <h2>📋 Chat History</h2>

                <div id="historyList">
                    Loading...
                </div>

            </div>

        `;

        loadChatHistory();

    }


    // ==========================
    // USERS
    // ==========================

    if (page === "users") {

        pageTitle.textContent = "Users";

        pageContent.innerHTML = `

            <div class="usersPage">

                <h2>👥 Users</h2>

                <div id="usersList">
                    Loading...
                </div>

            </div>

        `;

        loadUsers();

    }


    // ==========================
    // SETTINGS
    // ==========================

    if (page === "settings") {

        pageTitle.textContent = "Settings";

        pageContent.innerHTML = `

            <div class="settingsPage">

                <h2>⚙ Settings</h2>

                <p>Pengaturan bot akan dibuat di sini.</p>

            </div>

        `;

    }

}


// ==============================
// AI CHAT
// ==============================

function setupAIChat() {

    const messages = document.getElementById("messages");
    const prompt = document.getElementById("prompt");
    const sendBtn = document.getElementById("sendBtn");


    function addMessage(text, type) {

        const div = document.createElement("div");

        div.className = "message " + type;

        div.innerHTML = text.replace(/\n/g, "<br>");

        messages.appendChild(div);

        messages.scrollTop = messages.scrollHeight;

    }


    sendBtn.onclick = async () => {

        if (prompt.value.trim() === "") return;

        const text = prompt.value;

        addMessage(text, "user");

        prompt.value = "";

        addMessage("⏳ Lany sedang mengetik...", "ai");

        const loading = messages.lastChild;


        try {

            const res = await fetch("/api/chat", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    prompt: text
                })

            });


            const data = await res.json();

            loading.innerHTML = data.reply;


        } catch (error) {

            console.error(error);

            loading.innerHTML =
                "❌ Tidak dapat terhubung ke server.";

        }

    };

}


// ==============================
// LOAD USERS
// ==============================

async function loadUsers() {

    const container = document.getElementById("usersList");

    try {

        const response = await fetch("/api/users");

        const data = await response.json();

        console.log("DATA USERS:", data);

        if (!data.success) {
            throw new Error("API users gagal");
        }

        const users = data.users;

        if (!Array.isArray(users)) {
            throw new Error("Data users bukan array");
        }

        if (users.length === 0) {

            container.innerHTML = `
                <p>Belum ada user.</p>
            `;

            return;
        }

        container.innerHTML = users.map(user => `

            <div class="userCard">

                <div>
                    <strong>
                        👤 ${user.username || user.first_name || "Tanpa username"}
                    </strong>
                </div>

                <div>
                    Telegram ID:
                    ${user.telegram_id}
                </div>

                <div>
                    Nama:
                    ${user.first_name || ""}
                    ${user.last_name || ""}
                </div>

                <div>
                    Last Active:
                    ${user.last_active || "-"}
                </div>

                <button
                     class="viewChatBtn"
                     data-telegram-id="${user.telegram_id}"
                    >
                    💬 Lihat Chat
                                    </button>

            </div>

        `).join("");

    } catch (error) {

        console.error("ERROR USERS:", error);

        container.innerHTML = `
            <p>❌ Gagal mengambil data users.</p>
        `;

    }

}


// ==============================
// LOAD DASHBOARD
// ==============================

async function loadDashboard() {

    try {

        const usersResponse =
            await fetch("/database/users.json");

        const messagesResponse =
            await fetch("/database/messages.json");


        const users =
            await usersResponse.json();

        const messages =
            await messagesResponse.json();


        document.getElementById("totalUsers")
            .textContent = users.length;


        document.getElementById("totalChats")
            .textContent = messages.length;


    } catch (error) {

        console.error(error);

    }

}


// ==============================
// CHAT HISTORY
// ==============================

async function loadChatHistory() {

    const container =
        document.getElementById("historyList");


    try {

        const response =
            await fetch("/database/messages.json");

        const messages =
            await response.json();


        if (messages.length === 0) {

            container.innerHTML =
                "<p>Belum ada chat.</p>";

            return;

        }


        container.innerHTML = messages.map(chat => `

            <div class="historyCard">

                <div class="historyHeader">

                    <strong>
                        ${chat.username || chat.telegram_id || "User"}
                    </strong>

                    <span>
                        ${chat.timestamp || ""}
                    </span>

                </div>

                <div class="userMessage">
                    👤 ${chat.message || ""}
                </div>

                <div class="aiMessage">
                    🤖 ${chat.reply || ""}
                </div>

            </div>

        `).join("");


    } catch (error) {

        console.error(error);

        container.innerHTML =
            "<p>❌ Gagal membaca chat history.</p>";

    }

}


// ==============================
// VIEW USER
// ==============================

// ==============================
// VIEW USER / MANUAL CHAT
// ==============================

async function viewUser(telegramId) {

    console.log("Membuka chat user:", telegramId);

    pageTitle.textContent = "Chat User";

    pageContent.innerHTML = `

        <div class="userChatPage">

            <div class="userChatHeader">

                <div>
                    <h2>💬 Chat User</h2>
                    <p>Telegram ID: ${telegramId}</p>
                </div>

                <button
                    class="backButton"
                    id="backToUsersBtn"
                >
                    ← Kembali
                </button>

            </div>


            <div
                id="userMessages"
                class="messages userMessages"
            >
                <div class="chatLoading">
                    ⏳ Memuat chat...
                </div>
            </div>


            <div class="manualInputArea">

                <textarea
                    id="manualMessage"
                    placeholder="Ketik balasan manual..."
                ></textarea>

                <button
                    id="manualSendBtn"
                >
                    📤 Kirim
                </button>

            </div>

        </div>
    `;


    // =========================
    // TOMBOL KEMBALI
    // =========================

    document
        .getElementById("backToUsersBtn")
        .addEventListener("click", function () {

            showPage("users");

        });


    // =========================
    // TOMBOL KIRIM
    // =========================

    document
        .getElementById("manualSendBtn")
        .addEventListener("click", function () {

            sendManualMessage(telegramId);

        });


    // =========================
    // ENTER UNTUK KIRIM
    // =========================

    document
        .getElementById("manualMessage")
        .addEventListener("keydown", function (event) {

            if (event.key === "Enter" && !event.shiftKey) {

                event.preventDefault();

                sendManualMessage(telegramId);

            }

        });


    // =========================
    // LOAD CHAT
    // =========================

    await loadUserMessages(telegramId);

}
    // ==============================
// LOAD CHAT USER
// ==============================

async function loadUserMessages(telegramId) {

    const container = document.getElementById("userMessages");

    try {

        const response = await fetch(
            `/api/messages/${telegramId}`
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error("Gagal mengambil pesan");
        }

        const messages = data.messages || [];

        if (messages.length === 0) {

            container.innerHTML = `
                <div class="emptyChat">
                    💬 Belum ada percakapan.
                </div>
            `;

            return;
        }


        container.innerHTML = messages.map(message => {

            let messageClass = "ai";
            let senderName = "🤖 Lany";

            if (message.sender === "user") {

                messageClass = "user";
                senderName = "👤 User";

            } else if (message.sender === "admin") {

                messageClass = "admin";
                senderName = "👨‍💻 Admin";

            }

            return `

                <div class="chatMessage ${messageClass}">

                    <div class="messageSender">
                        ${senderName}
                    </div>

                    <div class="messageText">
                        ${escapeHTML(message.text || "")}
                    </div>

                    <div class="messageTime">
                        ${message.time || ""}
                    </div>

                </div>

            `;

        }).join("");


        // Scroll ke pesan paling bawah
        container.scrollTop = container.scrollHeight;


    } catch (error) {

        console.error("CHAT ERROR:", error);

        container.innerHTML = `
            <div class="emptyChat">
                ❌ Gagal mengambil chat.
            </div>
        `;
    }
}

// ==============================
// KIRIM PESAN MANUAL
// ==============================

async function sendManualMessage(telegramId) {

    const input = document.getElementById("manualMessage");
    const button = document.getElementById("manualSendBtn");

    const text = input.value.trim();

    if (!text) {
        return;
    }


    // Disable tombol sementara
    button.disabled = true;
    button.textContent = "⏳ Mengirim...";


    try {

        const response = await fetch(
            `/api/messages/${telegramId}/send`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    text: text
                })
            }
        );


        const data = await response.json();


        if (!data.success) {

            throw new Error(
                data.message || "Gagal mengirim pesan"
            );

        }


        // Kosongkan input
        input.value = "";


        // Reload chat
        await loadUserMessages(telegramId);


    } catch (error) {

        console.error("SEND ERROR:", error);

        alert(
            "❌ Gagal mengirim pesan.\n" +
            error.message
        );

    } finally {

        button.disabled = false;
        button.textContent = "📤 Kirim";

    }
}

// ==============================
// ESCAPE HTML
// ==============================

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

// ==============================
// TAMPILKAN DASHBOARD SAAT AWAL
// ==============================

showPage("dashboard");