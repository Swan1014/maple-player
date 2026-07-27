// HTML 요소들 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

const currentAudio = document.getElementById('mainAudio');

// 상태를 저장할 변수들
let tracks = [];
let currentIndex = -1;

// ⭐️ 1. iOS 홈 화면 앱(PWA) 전용 백그라운드 동결 방지 (Web Audio API)
let audioCtx = null;

function keepAudioAlive() {
  // 아이폰 오디오 세션이 잠들지 않도록 백그라운드 무음 신호 유지
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
      const buffer = audioCtx.createBuffer(1, 1, 22050);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(0);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 오디오 상태 동기화
currentAudio.addEventListener('play', () => {
  playBtn.textContent = '⏸️'; 
  keepAudioAlive(); // 재생될 때 무음 세션 활성화
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

currentAudio.addEventListener('pause', () => {
  playBtn.textContent = '▶️';
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});

// data.json 파일 읽어오기
async function loadTracks() {
  try {
    const response = await fetch('data.json');
    tracks = await response.json();
    renderTracks(tracks);
  } catch (error) {
    console.error("데이터를 불러오는데 실패했습니다:", error);
    trackListContainer.innerHTML = "<p>곡 정보를 불러오지 못했습니다.</p>";
  }
}

// 화면에 곡 목록 그리기
function renderTracks(trackArray) {
  trackListContainer.innerHTML = ''; 

  if (trackArray.length === 0) {
    trackListContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">검색 결과가 없습니다 😢</p>';
    return;
  }

  trackArray.forEach((track) => {
    const trackDiv = document.createElement('div');
    trackDiv.className = 'track-item';
    trackDiv.innerHTML = `
      <h3>${track.title}</h3>
      <p>${track.description}</p>
      <p>🏷️ ${track.tags.join(', ')}</p>
    `;
    
    trackDiv.onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      playTrack(realIndex);
    };
    trackListContainer.appendChild(trackDiv);
  });
}

// ⭐️ 2. 잠금 화면/제어 센터 설정 (백그라운드 깨우기 보정 추가)
function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: '메이플스토리 BGM',
    });

    navigator.mediaSession.setActionHandler('play', async () => {
      keepAudioAlive();
      const saveTime = currentAudio.currentTime; // 깨어나기 전 재생 시간 저장
      try {
        await currentAudio.play();
        // 오디오 장치가 잠에서 깼을 때 시점을 강제 재설정하여 멈춤 현상 방지
        currentAudio.currentTime = saveTime;
      } catch (error) {
        console.warn("재생 실패, 소스 재로드:", error);
        currentAudio.load();
        currentAudio.currentTime = saveTime;
        currentAudio.play();
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      currentAudio.pause();
    });
  }
}

// 음악 재생 함수
function playTrack(index) {
  currentIndex = index;
  const track = tracks[index];

  keepAudioAlive(); // 첫 재생 시 무음 세션 깨우기
  currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play().catch(e => console.error("재생 실패:", e));

  currentTitle.textContent = track.title;
  updateMediaSession(track);
}

// 재생 / 일시정지 토글 함수
function togglePlay() {
  if (currentIndex === -1) return;

  if (currentAudio.paused) {
    keepAudioAlive();
    currentAudio.play().catch(e => console.error(e));
  } else {
    currentAudio.pause();
  }
}

// 검색 기능
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filteredTracks = tracks.filter(track => {
    const matchTitle = track.title.toLowerCase().includes(query);
    const matchDesc = track.description.toLowerCase().includes(query);
    const matchTag = track.tags.some(tag => tag.toLowerCase().includes(query));
    return matchTitle || matchDesc || matchTag;
  });
  renderTracks(filteredTracks);
});

// 플레이 버튼에 클릭 이벤트 달기
playBtn.onclick = togglePlay;

// 앱이 시작되면 데이터 불러오기
loadTracks();