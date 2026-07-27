// HTML 요소 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

const currentAudio = document.getElementById('mainAudio');

// 상태 변수
let tracks = [];
let currentIndex = -1;

// ⭐️ 핵심: iOS 백그라운드 세션 끊김 자동 복구 재생 함수
async function safePlay() {
  try {
    // 1. 일반 재생 시도
    await currentAudio.play();
  } catch (error) {
    console.warn("iOS 백그라운드 세션 끊김 감지. 오디오 장치 재연결 시도:", error);
    
    // 2. iOS가 일시정지 중 오디오 세션을 끊었을 때: 현재 위치 기억 후 오디오 재로드
    const savedTime = currentAudio.currentTime;
    currentAudio.load(); // 하드웨어 오디오 세션 강제 재연결
    currentAudio.currentTime = savedTime; // 일시정지했던 시점으로 복구
    
    try {
      await currentAudio.play();
    } catch (retryError) {
      console.error("최종 재생 실패:", retryError);
    }
  }
}

// 오디오 상태 동기화
currentAudio.addEventListener('play', () => {
  playBtn.textContent = '⏸️'; 
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing';
  }
});

currentAudio.addEventListener('pause', () => {
  playBtn.textContent = '▶️';
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused';
  }
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

// 잠금 화면/제어 센터 설정
function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: '메이플스토리 BGM',
    });

    navigator.mediaSession.setActionHandler('play', () => {
      safePlay();
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

  currentAudio.src = `assets/music/${track.filename}`;
  safePlay();

  currentTitle.textContent = track.title;
  updateMediaSession(track);
}

// 재생 / 일시정지 토글 함수
function togglePlay() {
  if (currentIndex === -1) return;

  if (currentAudio.paused) {
    safePlay();
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

// 앱 시작 시 데이터 로드
loadTracks();