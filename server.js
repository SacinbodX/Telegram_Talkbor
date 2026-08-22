require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const TelegramBot = require('node-telegram-bot-api');

const validateInitData = require('./lib/validateInitData');
const db = require('./lib/db');
const matchmaker = require('./lib/matchmaking');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN topilmadi. .env fayliga yoki Render Environment sozlamalariga qo\'shing.');
  process.exit(1);
}
if (!WEBAPP_URL) {
  console.warn('⚠️  WEBAPP_URL berilmagan. /start tugmasi ishlamaydi. Render domeningizni qo\'shing.');
}

// ---------------------------------------------------------------------------
// EXPRESS + STATIC MINI APP
// ---------------------------------------------------------------------------
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.send('ok'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// ---------------------------------------------------------------------------
// TELEGRAM BOT
// ---------------------------------------------------------------------------
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on('polling_error', (err) => {
  console.error('Polling xatosi:', err.message);
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'do\'stim';

  const options = WEBAPP_URL
    ? {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💬 Suhbatni boshlash', web_app: { url: WEBAPP_URL } }],
          ],
        },
      }
    : undefined;

  bot.sendMessage(
    chatId,
    `Assalomu alaykum, ${name}! ✨\n\nBu yerda tasodifiy odamlar bilan 1ga1 suhbatlashishingiz mumkin. Yoqqan suhbatdoshni "❤️ Yoqtirish" tugmasi bilan do'stlar safiga qo'shib qo'yasiz (ikkalangiz ham bosishingiz kerak).\n\nBoshlash uchun pastdagi tugmani bosing 👇`,
    options
  );
});

// Admin (ADMIN_CHAT_ID) shikoyat xabariga REPLY qilsa - javob avtomatik
// shikoyatchi foydalanuvchiga Telegram orqali yuboriladi ("report-reply").
bot.on('message', (msg) => {
  if (!ADMIN_CHAT_ID) return;
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  if (!msg.reply_to_message || !msg.text) return;

  const report = db.findReportByAdminMessageId(msg.reply_to_message.message_id);
  if (!report) return;

  bot
    .sendMessage(report.reporterId, `📩 Admin javobi (shikoyatingiz bo'yicha):\n\n${msg.text}`)
    .then(() => bot.sendMessage(msg.chat.id, '✅ Javob foydalanuvchiga yuborildi.'))
    .catch((err) => {
      bot.sendMessage(msg.chat.id, `❌ Yuborib bo'lmadi: ${err.message}`);
    });
});

// ---------------------------------------------------------------------------
// WEBSOCKET - real-time suhbat, layk/do'st, shikoyat
// ---------------------------------------------------------------------------
function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

wss.on('connection', (ws, req) => {
  let client = null;

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const initData = url.searchParams.get('initData') || '';
    const tgUser = validateInitData(initData, BOT_TOKEN);

    if (!tgUser) {
      send(ws, { type: 'error', message: 'Telegram orqali tasdiqlanmadi. Ilovani Telegram bot ichidan oching.' });
      ws.close();
      return;
    }

    const dbUser = db.upsertUser(tgUser);
    client = {
      id: String(tgUser.id),
      ws,
      name: dbUser.firstName,
      username: dbUser.username,
      photoUrl: dbUser.photoUrl,
    };
  } catch (err) {
    ws.close();
    return;
  }

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    switch (data.type) {
      case 'find_partner': {
        const result = matchmaker.addToQueue(client);
        if (result) {
          const { partner } = result;
          send(partner.ws, {
            type: 'matched',
            partner: { name: client.name, photoUrl: client.photoUrl },
          });
          send(ws, {
            type: 'matched',
            partner: { name: partner.name, photoUrl: partner.photoUrl },
          });
        } else {
          send(ws, { type: 'waiting' });
        }
        break;
      }

      case 'send_message': {
        const text = String(data.text || '').slice(0, 2000).trim();
        if (!text) break;
        const partner = matchmaker.getRoomPartner(client.id);
        if (partner) {
          send(partner.ws, { type: 'message', from: 'partner', text, ts: Date.now() });
          send(ws, { type: 'message', from: 'me', text, ts: Date.now() });
        } else {
          send(ws, { type: 'error', message: 'Suhbatdosh topilmadi.' });
        }
        break;
      }

      case 'like_partner': {
        const partner = matchmaker.getRoomPartner(client.id);
        if (!partner) break;
        const { mutual } = db.likeUser(client.id, partner.id);
        send(ws, { type: 'like_ack' });
        if (mutual) {
          send(ws, { type: 'matched_friends', friend: { name: partner.name, photoUrl: partner.photoUrl } });
          send(partner.ws, { type: 'matched_friends', friend: { name: client.name, photoUrl: client.photoUrl } });
        }
        break;
      }

      case 'skip_partner':
      case 'leave_chat': {
        const partner = matchmaker.getRoomPartner(client.id);
        matchmaker.leaveRoom(client.id);
        matchmaker.removeFromQueue(client.id);
        if (partner) send(partner.ws, { type: 'partner_left' });
        send(ws, { type: 'left_ok' });
        break;
      }

      case 'report_partner': {
        const partner = matchmaker.getRoomPartner(client.id);
        if (!partner) break;
        const reason = String(data.reason || 'Sabab ko\'rsatilmagan').slice(0, 500);

        const report = db.addReport({
          reporterId: client.id,
          reporterName: client.name,
          reportedId: partner.id,
          reportedName: partner.name,
          reason,
        });

        if (ADMIN_CHAT_ID) {
          bot
            .sendMessage(
              ADMIN_CHAT_ID,
              `🚩 Yangi shikoyat\n\n👤 Shikoyatchi: ${client.name} (id: ${client.id})\n🙎 Kim haqida: ${partner.name} (id: ${partner.id})\n📝 Sabab: ${reason}\n\n↩️ Foydalanuvchiga javob yozish uchun shu xabarga "Reply" qiling.`
            )
            .then((sentMsg) => {
              db.setReportAdminMessage(report.id, sentMsg.message_id);
            })
            .catch((err) => console.error('Adminga yuborishda xato:', err.message));
        }

        send(ws, { type: 'report_sent' });
        break;
      }

      case 'get_friends': {
        const friends = db.getFriends(client.id);
        send(ws, {
          type: 'friends_list',
          friends: friends.map((f) => ({
            name: f.firstName,
            username: f.username,
            photoUrl: f.photoUrl,
          })),
        });
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    if (!client) return;
    const partner = matchmaker.getRoomPartner(client.id);
    matchmaker.leaveRoom(client.id);
    matchmaker.removeFromQueue(client.id);
    if (partner) send(partner.ws, { type: 'partner_left' });
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server ${PORT}-portda ishga tushdi`);
});
