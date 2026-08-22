const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function ensureDb() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, reports: {} }, null, 2));
  }
}

function load() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

/** Telegramdan kelgan foydalanuvchini bazaga yozadi / yangilaydi */
function upsertUser(tgUser) {
  const db = load();
  const id = String(tgUser.id);
  if (!db.users[id]) {
    db.users[id] = {
      id,
      firstName: tgUser.first_name || 'Foydalanuvchi',
      lastName: tgUser.last_name || '',
      username: tgUser.username || '',
      photoUrl: tgUser.photo_url || '',
      friends: [],
      likesSent: [],
      createdAt: Date.now(),
    };
  } else {
    db.users[id].firstName = tgUser.first_name || db.users[id].firstName;
    db.users[id].lastName = tgUser.last_name || db.users[id].lastName;
    db.users[id].username = tgUser.username || db.users[id].username;
    db.users[id].photoUrl = tgUser.photo_url || db.users[id].photoUrl;
  }
  save(db);
  return db.users[id];
}

function getUser(id) {
  const db = load();
  return db.users[String(id)] || null;
}

/**
 * fromId, toId'ni yoqtiradi. Agar toId ham fromId'ni ilgari yoqtirgan bo'lsa,
 * ikkalasi bir-birining do'stlar ro'yxatiga qo'shiladi (o'zaro moslik).
 *
 * @returns {{mutual: boolean, newMatch: boolean}} mutual - hozir ikkalasi ham
 *   bir-birini yoqtiradimi; newMatch - aynan SHU chaqiriq natijasida yangi
 *   moslik yuzaga keldimi (allaqachon do'st bo'lgan ikki kishi qayta bossa,
 *   newMatch=false bo'ladi — shu orqali "do'st qo'shildi" xabari faqat
 *   BIR MARTA chiqishi ta'minlanadi).
 */
function likeUser(fromId, toId) {
  const db = load();
  fromId = String(fromId);
  toId = String(toId);
  if (!db.users[fromId] || !db.users[toId]) return { mutual: false, newMatch: false };

  const alreadyLikedBefore = db.users[fromId].likesSent.includes(toId);
  if (!alreadyLikedBefore) {
    db.users[fromId].likesSent.push(toId);
  }

  const mutual = db.users[toId].likesSent.includes(fromId);
  const newMatch = mutual && !alreadyLikedBefore;

  if (mutual) {
    if (!db.users[fromId].friends.includes(toId)) db.users[fromId].friends.push(toId);
    if (!db.users[toId].friends.includes(fromId)) db.users[toId].friends.push(fromId);
  }

  save(db);
  return { mutual, newMatch };
}

function getFriends(id) {
  const db = load();
  const user = db.users[String(id)];
  if (!user) return [];
  return user.friends.map((fid) => db.users[fid]).filter(Boolean);
}

function addReport(report) {
  const db = load();
  const id = `r_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  db.reports[id] = { id, ...report, createdAt: Date.now(), resolved: false };
  save(db);
  return db.reports[id];
}

function setReportAdminMessage(id, adminMessageId) {
  const db = load();
  if (db.reports[id]) {
    db.reports[id].adminMessageId = adminMessageId;
    save(db);
  }
}

function findReportByAdminMessageId(adminMessageId) {
  const db = load();
  return (
    Object.values(db.reports).find((r) => r.adminMessageId === adminMessageId) || null
  );
}

module.exports = {
  upsertUser,
  getUser,
  likeUser,
  getFriends,
  addReport,
  setReportAdminMessage,
  findReportByAdminMessageId,
};
