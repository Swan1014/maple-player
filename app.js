// HTML 요소들 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

// 상태를 저장할 변수들
let tracks = [];
let currentAudio = new Audio();
let currentIndex = -1;

currentAudio.preload = 'metadata';

// ⭐️ 1. 오디오 상태 완벽 동기화 (앱 화면 & 아이폰 시스템)
// 오디오가 진짜로 '재생'될 때 자동으로 실행됨
currentAudio.addEventListener('play', () => {
  playBtn.textContent = '⏸️'; 
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'playing'; // 아이폰 시스템에 '재생 중' 상태 보고
  }
});

// 오디오가 진짜로 '일시정지'될 때 자동으로 실행됨
currentAudio.addEventListener('pause', () => {
  playBtn.textContent = '▶️';
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'paused'; // 아이폰 시스템에 '멈춤' 상태 보고
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

  trackArray.forEach((track, index) => {
    const trackDiv = document.createElement('div');
    trackDiv.className = 'track-item';
    trackDiv.innerHTML = `
      <h3>${track.title}</h3>
      <p>${track.description}</p>
      <p>🏷️ ${track.tags.join(', ')}</p>
    `;
    
    trackDiv.onclick = () => playTrack(index, trackArray);
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

    // ⭐️ 2. 잠금 화면 버튼의 명령을 더 안전하게 처리
    navigator.mediaSession.setActionHandler('play', async () => {
      try {
        await currentAudio.play();
      } catch (e) {
        console.error("잠금화면 재생 실패:", e);
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      currentAudio.pause();
    });
  }
}

// 음악 재생 함수
function playTrack(index, trackArray) {
  currentIndex = index;
  const track = trackArray[index];

  currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play();

  currentTitle.textContent = track.title;
  updateMediaSession(track);
}

// 재생 / 일시정지 토글 함수
function togglePlay() {
  if (currentIndex === -1) return;

  // ⭐️ 3. 복잡한 변수 대신 내장된 paused 속성을 사용해 상태 확인
  if (currentAudio.paused) {
    currentAudio.play();
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