// HTML 요소들 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

const currentAudio = document.getElementById('mainAudio');

// ⭐️ 1. iOS 오디오 세션을 영구 유지하기 위한 무음(Silent) 오디오 생성 (Base64 무음 데이터)
const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
const silentAudio = new Audio(SILENT_WAV);
silentAudio.loop = true; // 무한 반복 설정

let isSilentAudioStarted = false;

// 무음 오디오 가동 함수 (iOS가 오디오 채널을 닫지 못하게 막음)
function startSilentAudio() {
  if (!isSilentAudioStarted) {
    silentAudio.play().then(() => {
      isSilentAudioStarted = true;
    }).catch(e => console.warn("무음 오디오 가동 대기 중:", e));
  }
}

// 상태를 저장할 변수들
let tracks = [];
let currentIndex = -1;

// 오디오 상태 동기화
currentAudio.addEventListener('play', () => {
  playBtn.textContent = '⏸️'; 
  startSilentAudio(); // 메인 노래가 재생될 때 무음 앵커도 함께 실행
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

currentAudio.addEventListener('pause', () => {
  playBtn.textContent = '▶️';
  // 메인 노래가 일시정지되어도 silentAudio는 계속 백그라운드에서 도는 중이므로
  // iOS가 오디오 세션을 강제로 끌 수 없음!
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

// 잠금 화면/제어 센터 설정
function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: '메이플스토리 BGM',
    });

    navigator.mediaSession.setActionHandler('play', async () => {
      startSilentAudio();
      try {
        await currentAudio.play();
      } catch (error) {
        console.warn("재생 실패, 소스 재로드:", error);
        currentAudio.load();
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

  startSilentAudio(); // 재생 시 무음 세션 깨우기
  currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play().catch(e => console.error("재생 실패:", e));

  currentTitle.textContent = track.title;
  updateMediaSession(track);
}

// 재생 / 일시정지 토글 함수
function togglePlay() {
  if (currentIndex === -1) return;

  startSilentAudio();
  if (currentAudio.paused) {
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