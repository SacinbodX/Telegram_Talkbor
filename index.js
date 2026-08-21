const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Telegraf } = require('telegraf');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" } 
});

// ⚠️ DIQQAT: 'SIZNING_BOT_TOKENINGIZ' o'rniga BotFather bergan tokenni yozing!
const BOT_TOKEN = 
8881017810:AAGgyqXaeYxx3k4S-lqZzLz5Sa57SpGIQ6c;
const bot = new Telegraf(BOT_TOKEN);

// Render platformasi loyihaga beradigan avtomatik URL manzil
const MINI_APP_URL = process.env.RENDER_EXTERNAL_URL || 'https://onrender.com';

// Botga /start buyrug'i berilganda Mini Appni ochuvchi tugma chiqarish
bot.start((ctx) => {
    ctx.reply('👋 TalkBor Video Chatga xush kelibsiz!\nSuhbatdosh topish uchun quyidagi tugmani bosing:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Video Chatni boshlash', web_app: { url: MINI_APP_URL } }]
            ]
        }
    });
});

bot.launch().then(() => console.log("Telegram Bot muvaffaqiyatli ishga tushdi!"));

// Static veb-fayllarni ulash (public papkasidagi index.html uchun)
app.use(express.static(path.join(__dirname, 'public')));

// Tasodifiy juftliklarni ulash mantig'i
let waitingUser = null;

io.on('connection', (socket) => {
    console.log('Foydalanuvchi serverga ulandi:', socket.id);

    // Foydalanuvchi qidiruv tugmasini bosganda
    socket.on('join-search', () => {
        if (waitingUser && waitingUser.id !== socket.id) {
            // Agar navbatda odam bo'lsa, ikkisini bir-biriga bog'laymiz
            socket.emit('matched', { partnerId: waitingUser.id, initiator: true });
            waitingUser.emit('matched', { partnerId: socket.id, initiator: false });
            waitingUser = null;
        } else {
            // Navbat bo'sh bo'lsa, kutish rejimiga o'tkazamiz
            waitingUser = socket;
            socket.emit('waiting');
        }
    });

    // WebRTC signallarini uzatish (Kamera oqimini ulash)
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });

    // Foydalanuvchi chatdan chiqib ketsa yoki uzilsa
    socket.on('disconnect', () => {
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }
        console.log('Foydalanuvchi uzildi:', socket.id);
    });
});

// Render uchun kerakli portni aniqlash (3000 port zaxira sifatida)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server ${PORT}-portda muvaffaqiyatli ishlamoqda`);
});
