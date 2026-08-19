const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const stopBtn = document.getElementById('stopBtn');
const reportBtn = document.getElementById('reportBtn');
const statusEl = document.getElementById('status');

let localStream = null;
let pc = null;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function setButtons({ start, next, stop, report }) {
  startBtn.disabled = !start;
  nextBtn.disabled = !next;
  stopBtn.disabled = !stop;
  reportBtn.disabled = !report;
}

async function getLocalMedia() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  return localStream;
}

function createPeerConnection() {
  pc = new RTCPeerConnection(rtcConfig);
  localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

  pc.ontrack = (e) => { remoteVideo.srcObject = e.streams[0]; };

  pc.onicecandidate = (e) => {
    if (e.candidate) socket.emit('signal', { type: 'candidate', candidate: e.candidate });
  };
}

async function startAsInitiator() {
  createPeerConnection();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('signal', { type: 'offer', offer });
}

function closePeer() {
  if (pc) { pc.close(); pc = null; }
  remoteVideo.srcObject = null;
}

socket.on('waiting', () => {
  statusEl.textContent = 'Qidirilmoqda...';
  setButtons({ start: false, next: false, stop: true, report: false });
});

socket.on('matched', async ({ initiator }) => {
  statusEl.textContent = 'Ulandi';
  setButtons({ start: false, next: true, stop: true, report: true });
  if (initiator) await startAsInitiator();
  else createPeerConnection();
});

socket.on('signal', async (data) => {
  if (!pc) return;
  if (data.type === 'offer') {
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('signal', { type: 'answer', answer });
  } else if (data.type === 'answer') {
    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  } else if (data.type === 'candidate') {
    try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {}
  }
});

socket.on('partner-left', () => {
  statusEl.textContent = 'Suhbatdosh chiqdi, qidirilmoqda...';
  closePeer();
  setButtons({ start: false, next: false, stop: true, report: false });
  socket.emit('find-partner');
});

startBtn.onclick = async () => {
  try {
    await getLocalMedia();
  } catch (e) {
    statusEl.textContent = 'Kamera/mikrofon ruxsati kerak';
    return;
  }
  socket.emit('find-partner');
  setButtons({ start: false, next: false, stop: true, report: false });
};

nextBtn.onclick = () => {
  closePeer();
  statusEl.textContent = 'Keyingisi qidirilmoqda...';
  setButtons({ start: false, next: false, stop: true, report: false });
  socket.emit('next');
};

stopBtn.onclick = () => {
  closePeer();
  socket.emit('stop');
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  localVideo.srcObject = null;
  statusEl.textContent = 'Tayyor';
  setButtons({ start: true, next: false, stop: false, report: false });
};

reportBtn.onclick = () => {
  socket.emit('report');
  reportBtn.textContent = 'Yuborildi';
  setTimeout(() => { reportBtn.textContent = 'Shikoyat'; }, 1500);
};
