require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---- statik fayllarni to'g'ridan-to'g'ri shu papkadan beramiz (public shart emas) ----
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/client.js', (req, res) => res.sendFile(path.join(__dirname, 'client.js')));
app.get('/health', (req, res) => res.send('ok'));

// ---- TELEGRAM BOT ----
let bot;
if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN, { polling: true });
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Talkvor'ga xush kelibsiz! 🎥", {
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 Ochish', web_app: { url: WEBAPP_URL } }]]
      }
    });
  });
  bot.on('polling_error', (e) => console.error('Polling error:', e.message));
} else {
  console.error('XATOLIK: BOT_TOKEN topilmadi. Render -> Environment ga qo\'shing.');
}

// ---- TASODIFIY JUFTLASH + WEBRTC SIGNALING ----
let waitingQueue = [];
const activePairs = new Map();

function removeFromQueue(id) {
  waitingQueue = waitingQueue.filter((s) => s.id !== id);
}

function endPair(socket, notify = true) {
  const partnerId = activePairs.get(socket.id);
  if (partnerId) {
    activePairs.delete(socket.id);
    activePairs.delete(partnerId);
    if (notify) {
      const p = io.sockets.sockets.get(partnerId);
      if (p) p.emit('partner-left');
    }
  }
  removeFromQueue(socket.id);
}

function tryMatch(socket) {
  removeFromQueue(socket.id);
  while (waitingQueue.length > 0) {
    const partner = waitingQueue.shift();
    if (partner.id === socket.id || !partner.connected) continue;
    activePairs.set(socket.id, partner.id);
    activePairs.set(partner.id, socket.id);
    socket.emit('matched', { initiator: true });
    partner.emit('matched', { initiator: false });
    return;
  }
  waitingQueue.push(socket);
  socket.emit('waiting');
}

io.on('connection', (socket) => {
  socket.on('find-partner', () => tryMatch(socket));

  socket.on('signal', (data) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) io.to(partnerId).emit('signal', data);
  });

  socket.on('next', () => {
    endPair(socket);
    tryMatch(socket);
  });

  socket.on('stop', () => endPair(socket));

  socket.on('report', () => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) console.log('Report qilindi:', partnerId);
  });

  socket.on('disconnect', () => endPair(socket));
});

server.listen(PORT, () => console.log(`Talkvor ${PORT}-portda ishga tushdi`));
