const { Telegraf, Markup } = require('telegraf');

// ================== SOZLAMALAR ==================
const BOT_TOKEN = process.env.BOT_TOKEN || 'BU_YERGA_BOTFATHER_TOKENINI_QOYING';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://SIZNING-USERNAME.github.io/kvant-mushuklari/';
// ===============================================

const bot = new Telegraf(BOT_TOKEN);

// /start buyrug'i
bot.start(async (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    Markup.button.webApp('🐱 Kvant Mushuklarini o‘ynash', MINI_APP_URL)
  ]);

  await ctx.reply(
    `Salom, ${ctx.from.first_name}! 👋\n\n` +
    `Men noodatiy o‘yin botiman.\n` +
    `«Kvant Mushuklari» — g‘alati effektli mushuklarni tutish o‘yini.\n\n` +
    `Boshlash uchun tugmani bosing:`,
    keyboard
  );
});

// Mini App dan kelgan natija
bot.on('message', async (ctx) => {
  if (ctx.message.web_app_data) {
    try {
      const data = JSON.parse(ctx.message.web_app_data.data);
      const score = data.score || 0;

      let emoji = '👍';
      let text = 'Yaxshi natija!';

      if (score >= 300) {
        emoji = '🏆';
        text = 'Ajoyib! Siz haqiqiy Kvant Ustasisiz!';
      } else if (score >= 150) {
        emoji = '🔥';
        text = 'Zo‘r o‘ynadingiz!';
      } else if (score >= 80) {
        emoji = '✨';
        text = 'Yaxshi natija!';
      }

      await ctx.reply(
        `${emoji} ${text}\n\n` +
        `Sizning skor: *${score}* ball`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      await ctx.reply('Natija qabul qilindi! 🐱');
    }
  }
});

// Xatolarni ushlash
bot.catch((err, ctx) => {
  console.error('Xatolik:', err);
});

// Botni ishga tushirish
bot.launch().then(() => {
  console.log('🤖 Kvant Mushuklari bot ishga tushdi!');
});

// To'xtatish signallari
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
