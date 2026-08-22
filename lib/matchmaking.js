/**
 * Kutish navbati va faol suhbat "xonalari"ni boshqaradi.
 * Xotirada saqlanadi (server qayta ishga tushsa tozalanadi) - bu shu turdagi
 * onlayn-navbat funksiyasi uchun yetarli.
 */
class Matchmaker {
  constructor() {
    this.queue = []; // kutayotgan clientlar
    this.rooms = new Map(); // roomId -> [clientA, clientB]
    this.clientRoom = new Map(); // clientId -> roomId
  }

  addToQueue(client) {
    // avval o'zini navbatdan tozalab qo'yish (qayta bosilsa ikki marta qo'shilmasin)
    this.queue = this.queue.filter((c) => c.id !== client.id);

    // navbatda kutayotgan, o'zi bo'lmagan va hali ulanishi ochiq bo'lgan birinchi clientni topish
    let partnerIndex = this.queue.findIndex(
      (c) => c.id !== client.id && c.ws.readyState === 1
    );

    if (partnerIndex !== -1) {
      const partner = this.queue.splice(partnerIndex, 1)[0];
      const roomId = `${partner.id}_${client.id}_${Date.now()}`;
      this.rooms.set(roomId, [partner, client]);
      this.clientRoom.set(partner.id, roomId);
      this.clientRoom.set(client.id, roomId);
      return { roomId, partner };
    }

    this.queue.push(client);
    return null;
  }

  removeFromQueue(clientId) {
    this.queue = this.queue.filter((c) => c.id !== clientId);
  }

  getRoomPartner(clientId) {
    const roomId = this.clientRoom.get(clientId);
    if (!roomId) return null;
    const participants = this.rooms.get(roomId);
    if (!participants) return null;
    const [a, b] = participants;
    return a.id === clientId ? b : a;
  }

  leaveRoom(clientId) {
    const roomId = this.clientRoom.get(clientId);
    if (!roomId) return;
    const participants = this.rooms.get(roomId) || [];
    participants.forEach((p) => this.clientRoom.delete(p.id));
    this.rooms.delete(roomId);
  }
}

module.exports = new Matchmaker();
