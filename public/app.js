(() => {
  'use strict';

  // -------------------------------------------------------------------
  // TELEGRAM WEBAPP INIT
  // -------------------------------------------------------------------
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#1b0e2e'); } catch (e) {}
    try { tg.setBackgroundColor('#1b0e2e'); } catch (e) {}
  }

  const haptic = (type) => {
    try {
      if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(type);
    } catch (e) {}
  };

  // -------------------------------------------------------------------
  // DOM REFS
  // -------------------------------------------------------------------
  const screens = {
    home: document.getElementById('screen-home'),
    search: document.getElementById('screen-search'),
    chat: document.getElementById('screen-chat'),
    friends: document.getElementById('screen-friends'),
  };

  const messagesEl = document.getElementById('messages');
  const reportModal = document.getElementById('reportModal');
  const matchToast = document.getElementById('matchToast');

  let currentChatScreen = 'home'; // 'home' | 'search' | 'chat' — do'stlar tabidan qaytish uchun

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function setChatFlowScreen(name) {
    currentChatScreen = name;
    showScreen(name);
  }

  // -------------------------------------------------------------------
  // TAB BAR
  // -------------------------------------------------------------------
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.tab === 'home') {
        showScreen(currentChatScreen);
      } else {
        showScreen('friends');
        requestFriends();
      }
    });
  });

  // -------------------------------------------------------------------
  // WEBSOCKET
  // -------------------------------------------------------------------
  let ws;
  let wsReady = false;

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const initData = tg ? tg.initData || '' : '';
    ws = new WebSocket(`${proto}://${location.host}/ws?initData=${encodeURIComponent(initData)}`);

    ws.onopen = () => {
      wsReady = true;
    };
    ws.onclose = () => {
      wsReady = false;
    };
    ws.onerror = () => {};
    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      handleServerEvent(data);
    };
  }

  function wsSend(obj) {
    if (wsReady && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  connect();

  function handleServerEvent(data) {
    switch (data.type) {
      case 'error':
        addSystemMessage(`⚠️ ${data.message}`);
        break;

      case 'waiting':
        setChatFlowScreen('search');
        break;

      case 'matched':
        messagesEl.innerHTML = '';
        renderPartnerHeader(data.partner);
        setChatFlowScreen('chat');
        addSystemMessage(`✨ ${escapeHtml(data.partner.name)} bilan ulandingiz. Salom deng! 👋`);
        break;

      case 'message':
        addMessage(data.text, data.from === 'me' ? 'sent' : 'received');
        break;

      case 'partner_left':
        addSystemMessage('🚪 Suhbatdosh chiqib ketdi. Yangisini topish uchun ⏭️ ni bosing.');
        break;

      case 'like_ack':
        flashHeart();
        break;

      case 'matched_friends':
        showMatchToast(data.friend);
        break;

      case 'report_sent':
        addSystemMessage('✅ Shikoyatingiz adminga yuborildi. Javob shu yerga kelmaydi, admin sizga botdan yozadi.');
        break;

      case 'left_ok':
        break;

      case 'friends_list':
        renderFriends(data.friends);
        break;

      default:
        break;
    }
  }

  // -------------------------------------------------------------------
  // HOME / SEARCH
  // -------------------------------------------------------------------
  document.getElementById('btnFind').addEventListener('click', () => {
    wsSend({ type: 'find_partner' });
    setChatFlowScreen('search');
  });

  document.getElementById('btnCancelSearch').addEventListener('click', () => {
    wsSend({ type: 'leave_chat' });
    setChatFlowScreen('home');
  });

  // -------------------------------------------------------------------
  // CHAT ACTIONS
  // -------------------------------------------------------------------
  document.getElementById('btnSkip').addEventListener('click', () => {
    wsSend({ type: 'skip_partner' });
    wsSend({ type: 'find_partner' });
    setChatFlowScreen('search');
  });

  document.getElementById('btnLike').addEventListener('click', () => {
    wsSend({ type: 'like_partner' });
    haptic('success');
  });

  document.getElementById('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    sendMsg();
  });

  function sendMsg() {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text) return;
    wsSend({ type: 'send_message', text });
    input.value = '';
  }

  function renderPartnerHeader(p) {
    document.getElementById('partnerName').textContent = p.name || 'Notanish';
    document.getElementById('partnerAvatar').textContent = (p.name || '?').trim().charAt(0).toUpperCase() || '?';
  }

  function addMessage(text, type) {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${type}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addSystemMessage(text) {
    const el = document.createElement('div');
    el.className = 'system-msg';
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function flashHeart() {
    const btn = document.getElementById('btnLike');
    btn.classList.add('pulse');
    setTimeout(() => btn.classList.remove('pulse'), 600);
  }

  // -------------------------------------------------------------------
  // REPORT MODAL
  // -------------------------------------------------------------------
  document.getElementById('btnReport').addEventListener('click', () => {
    reportModal.classList.add('open');
  });
  document.getElementById('btnReportCancel').addEventListener('click', () => {
    reportModal.classList.remove('open');
  });
  document.getElementById('btnReportSend').addEventListener('click', () => {
    const reasonEl = document.getElementById('reportReason');
    const reason = reasonEl.value.trim();
    wsSend({ type: 'report_partner', reason: reason || "Sabab ko'rsatilmagan" });
    reasonEl.value = '';
    reportModal.classList.remove('open');
    haptic('warning');
  });

  // -------------------------------------------------------------------
  // MATCH TOAST
  // -------------------------------------------------------------------
  let toastTimer = null;
  function showMatchToast(friend) {
    document.getElementById('toastSub').textContent = `${friend.name} endi do'stlaringiz safida! 🎉`;
    matchToast.classList.add('show');
    haptic('success');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => matchToast.classList.remove('show'), 3500);
  }

  // -------------------------------------------------------------------
  // FRIENDS
  // -------------------------------------------------------------------
  function requestFriends() {
    wsSend({ type: 'get_friends' });
  }

  function renderFriends(friends) {
    const list = document.getElementById('friendsList');
    if (!friends || !friends.length) {
      list.innerHTML =
        '<p class="empty-hint">Hali do\'stlaringiz yo\'q.<br>Suhbatda ❤️ tugmasini bosib do\'st qo\'shing!</p>';
      return;
    }
    list.innerHTML = '';
    friends.forEach((f) => {
      const card = document.createElement('div');
      card.className = 'friend-card';
      const initial = (f.name || '?').trim().charAt(0).toUpperCase() || '?';
      card.innerHTML = `
        <div class="avatar">${initial}</div>
        <div>
          <div class="friend-name">${escapeHtml(f.name || 'Foydalanuvchi')}</div>
          <div class="friend-username">${f.username ? '@' + escapeHtml(f.username) : ''}</div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // -------------------------------------------------------------------
  // AMBIENT SPARKLE DECOR
  // -------------------------------------------------------------------
  function spawnDecor() {
    const decor = document.getElementById('bgDecor');
    const emojis = ['✨', '🌸', '💫', '⭐', '🌟'];
    for (let i = 0; i < 16; i++) {
      const span = document.createElement('span');
      span.className = 'floaty';
      span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      span.style.left = Math.random() * 100 + 'vw';
      span.style.animationDuration = 9 + Math.random() * 10 + 's';
      span.style.animationDelay = Math.random() * 12 + 's';
      span.style.fontSize = 12 + Math.random() * 16 + 'px';
      decor.appendChild(span);
    }
  }
  spawnDecor();
})();
