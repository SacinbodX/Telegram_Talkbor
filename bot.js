const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("BOT_TOKEN muhit o'zgaruvchisi topilmadi!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// ---------- Ma'lumotlar ----------
const jokes = [
  "Nega dasturchi doim sovuq qoladi? Chunki u doim Windows derazasini ochiq qoldiradi 😄",
  "Kompyuter qanday choy ichadi? Cookies bilan 🍪",
  "Dasturchining eng yaxshi do'sti kim? Google 😎",
  "Nega dasturchilar ishdan kech qolishadi? Chunki ular kechasi kod yozishadi 😴",
  "Hayotdagi eng katta xato — bu xato qilishdan qo'rqish"
];

const facts = [
  "Asal qadimiy Misrda pul sifatida ishlatilgan 🍯",
  "Barmoq izlari har bir odamda, hatto egizaklarda ham farq qiladi 👆",
  "Yer Quyosh atrofida soatiga 107 000 km tezlikda aylanadi 🌍",
  "O'rgimchak ipi po'latdan ham kuchliroq 🕸️",
  "Inson miyasi taxminan 20 vatt quvvat sarflaydi 🧠"
];

const quotes = [
  "Muvaffaqiyat — bu qulaganingizda qanchalik baland sakray olishingizdir.",
  "Harakat qilmaslik — muvaffaqiyatsizlikning yagona yo'li.",
  "Kechagi kundan saboq ol, bugun yasha, ertangi kunga umid qil.",
  "Bilim — bu kuch.",
  "Orzularingizga erishish uchun avval uyg'onishingiz kerak."
];

// ---------- Yordamchi funksiyalar ----------
function sendJoke(chatId) {
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  bot.sendMessage(chatId, `😄 ${joke}`);
}

function sendFact(chatId) {
  const fact = facts[Math.floor(Math.random() * facts.length)];
  bot.sendMessage(chatId, `💡 ${fact}`);
}

function sendQuote(chatId) {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  bot.sendMessage(chatId, `📜 ${quote}`);
}

function sendDice(chatId) {
  bot.sendDice(chatId, { emoji: '🎲' }).catch(console.error);
}

function sendHelp(chatId) {
  bot.sendMessage(chatId, `ℹ️ <b>Yordam</b>\n\nQuyidagi buyruqlardan foydalanishingiz mumkin:\n/start - Botni boshlash\n/help - Yordam\n/joke - Hazil\n/fact - Qiziqarli fakt\n/quote - Motivatsion iqtibos\n/dice - Zar tashlash\n/coin - Tanga tashlash\n/random 100 - Tasodifiy son\n/poll - So'rovnoma\n/cat - Mushuk rasmi\n/dog - Kuchuk rasmi\n/info - Siz haqingizda\n/echo matn - Matnni qaytarish`, { parse_mode: 'HTML' });
}

// ---------- Buyruqlar ro'yxati ----------
bot.setMyCommands([
  { command: 'start', description: '🤖 Botni boshlash' },
  { command: 'help', description: 'ℹ️ Yordam' },
  { command: 'joke', description: '😄 Hazil' },
  { command: 'fact', description: '💡 Qiziqarli fakt' },
  { command: 'quote', description: '📜 Motivatsion iqtibos' },
  { command: 'dice', description: '🎲 Zar tashlash' },
  { command: 'coin', description: '🪙 Tanga tashlash' },
  { command: 'random', description: '🔢 Tasodifiy son (masalan /random 100)' },
  { command: 'poll', description: "📊 So'rovnoma" },
  { command: 'cat', description: '🐱 Mushuk rasmi' },
  { command: 'dog', description: '🐶 Kuchuk rasmi' },
  { command: 'info', description: "👤 Siz haqingizda ma'lumot" },
  { command: 'echo', description: '🗣️ Matnni qaytarish' },
]).catch(console.error);

// ---------- Start ----------
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || "do'stim";
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '😄 Hazil', callback_data: 'joke' }, { text: '💡 Fakt', callback_data: 'fact' }],
        [{ text: '📜 Iqtibos', callback_data: 'quote' }, { text: '🎲 Zar', callback_data: 'dice' }],
        [{ text: 'ℹ️ Yordam', callback_data: 'help' }]
      ]
    }
  };
  bot.sendMessage(chatId, `Assalomu alaykum, ${userName}! 👋\nMen qiziqarli botman. Quyidagi tugmalar orqali meni sinab ko'ring:\n\nYoki /help buyrug'ini yuboring.`, opts);
});

// ---------- Oddiy buyruqlar ----------
bot.onText(/\/help/, (msg) => sendHelp(msg.chat.id));
bot.onText(/\/joke/, (msg) => sendJoke(msg.chat.id));
bot.onText(/\/fact/, (msg) => sendFact(msg.chat.id));
bot.onText(/\/quote/, (msg) => sendQuote(msg.chat.id));
bot.onText(/\/dice/, (msg) => sendDice(msg.chat.id));

// ---------- Tanga tashlash ----------
bot.onText(/\/coin/, (msg) => {
  const chatId = msg.chat.id;
  const side = Math.random() < 0.5 ? 'Boshlar 🪙' : 'Dumlar 🪙';
  bot.sendMessage(chatId, `Tanga tashlandi: <b>${side}</b>`, { parse_mode: 'HTML' });
});

// ---------- Tasodifiy son ----------
bot.onText(/\/random(?:\s+(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const max = parseInt(match[1]);
  if (!max || max <= 0 || max > 1000000) {
    return bot.sendMessage(chatId, 'Foydalanish: /random 100');
  }
  const num = Math.floor(Math.random() * max) + 1;
  bot.sendMessage(chatId, `🔢 Tasodifiy son (1-${max}): <b>${num}</b>`, { parse_mode: 'HTML' });
});

// ---------- So'rovnoma ----------
bot.onText(/\/poll/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendPoll(chatId, 'Bugun kayfiyatingiz qanday?', ["Ajoyib 😃", "Yaxshi 🙂", "O'rtacha 😐", "Yomon 😞"], { is_anonymous: false });
});

// ---------- Mushuk rasmi ----------
bot.onText(/\/cat/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await fetch('https://api.thecatapi.com/v1/images/search');
    const data = await res.json();
    if (data && data[0] && data[0].url) {
      bot.sendPhoto(chatId, data[0].url, { caption: '🐱 Mana mushuk!' });
    } else {
      bot.sendMessage(chatId, 'Mushuk topilmadi.');
    }
  } catch (err) {
    bot.sendMessage(chatId, 'Mushuk rasmni olishda xatolik yuz berdi.');
  }
});

// ---------- Kuchuk rasmi ----------
bot.onText(/\/dog/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await fetch('https://dog.ceo/api/breeds/image/random');
    const data = await res.json();
    if (data && data.message) {
      bot.sendPhoto(chatId, data.message, { caption: '🐶 Mana kuchuk!' });
    } else {
      bot.sendMessage(chatId, 'Kuchuk topilmadi.');
    }
  } catch (err) {
    bot.sendMessage(chatId, 'Kuchuk rasmni olishda xatolik yuz berdi.');
  }
});

// ---------- Foydalanuvchi ma'lumoti ----------
bot.onText(/\/info/, (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  bot.sendMessage(chatId, `👤 Siz haqingizda:\n\nIsm: ${user.first_name || '—'}\nFamiliya: ${user.last_name || '—'}\nUsername: ${user.username ? '@' + user.username : '—'}\nID: ${user.id}\nChat ID: ${chatId}`);
});

// ---------- Echo (matnni qaytarish) ----------
bot.onText(/\/echo(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1] ? match[1].trim() : '';
  if (!text) {
    return bot.sendMessage(chatId, 'Foydalanish: /echo matn');
  }
  bot.sendMessage(chatId, text);
});

// ---------- Tugmalar ----------
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  bot.answerCallbackQuery(query.id).catch(() => {});
  switch (data) {
    case 'joke': sendJoke(chatId); break;
    case 'fact': sendFact(chatId); break;
    case 'quote': sendQuote(chatId); break;
    case 'dice': sendDice(chatId); break;
    case 'help': sendHelp(chatId); break;
  }
});

// ---------- Xatolik ----------
bot.on('polling_error', (error) => console.error(error));
