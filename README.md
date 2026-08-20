# 🐱 Kvant Mushuklari — Telegram Mini App + Bot

Noodatiy effektli mushuk tutish o‘yini.

## Fayllar

- `index.html` — Mini App (o‘yin)
- `bot.js` — Node.js Telegram bot (Telegraf)
- `package.json` — kerakli paketlar

---

## 1. Mini App ni joylash (GitHub Pages)

1. Yangi GitHub repository oching (masalan: `kvant-mushuklari`)
2. `index.html` faylni yuklang
3. **Settings → Pages** ga kiring
4. Source: **Deploy from a branch** → `main` → `/ (root)` ni tanlang
5. Save qiling
6. Bir necha daqiqadan keyin manzil chiqadi:
   `https://SIZNING-USERNAME.github.io/kvant-mushuklari/`

---

## 2. Bot yaratish (BotFather)

1. Telegramda [@BotFather](https://t.me/BotFather) ga kiring
2. `/newbot` deb yozing va bot yarating
3. Tokenni saqlang
4. Keyin `/newapp` deb yozing
5. Botni tanlang
6. Title: `Kvant Mushuklari`
7. Description: `Noodatiy effektli mushuk tutish o‘yini`
8. Photo yuklang (ixtiyoriy)
9. **Web App URL** ga GitHub Pages manzilini yozing

---

## 3. Botni Render.com da ishga tushirish

1. [render.com](https://render.com) ga kiring va hisob oching
2. **New → Web Service**
3. GitHub repositoryngizni ulang
4. Sozlamalar:
   - **Name**: `kvant-mushuklari-bot`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **Environment** bo‘limiga ikkita o‘zgaruvchi qo‘shing:

| Key            | Value                                      |
|----------------|--------------------------------------------|
| `BOT_TOKEN`    | BotFather dan olgan token                  |
| `MINI_APP_URL` | `https://username.github.io/kvant-mushuklari/` |

6. **Create Web Service** bosing

Bot ishga tushgandan keyin Telegramda `/start` yozib sinab ko‘ring!

---

## Mahalliy ishga tushirish (test uchun)

```bash
npm install
export BOT_TOKEN="sizning_token"
export MINI_APP_URL="https://..."
npm start
```

---

Omad! 🚀
