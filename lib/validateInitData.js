const crypto = require('crypto');

/**
 * Telegram WebApp'dan kelgan initData'ni tekshiradi.
 * Bu funksiya foydalanuvchi haqiqatan ham Telegram orqali kirganini
 * kafolatlaydi (soxta so'rovlarning oldini oladi).
 *
 * @param {string} initData - Telegram.WebApp.initData qiymati
 * @param {string} botToken - .env dagi BOT_TOKEN
 * @returns {object|null} - tekshiruvdan o'tsa Telegram user obyekti, aks holda null
 */
function validateInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const pairs = [];
    for (const [key, value] of params.entries()) {
      pairs.push(`${key}=${value}`);
    }
    pairs.sort();
    const dataCheckString = pairs.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    // Ma'lumot juda eski bo'lmasligini tekshirish (24 soat)
    const authDate = Number(params.get('auth_date') || 0);
    const ageSeconds = Date.now() / 1000 - authDate;
    if (!authDate || ageSeconds > 60 * 60 * 24) {
      return null;
    }

    const userStr = params.get('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (err) {
    return null;
  }
}

module.exports = validateInitData;
