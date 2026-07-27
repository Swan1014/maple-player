// HTML 요소들 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

// HTML의 메인 오디오 요소
const currentAudio = document.getElementById('mainAudio');

// ⭐️ 1. iOS PWA 백그라운드 프로세스 재움 방지용 무음(Silent) 오디오 생성
// 아주 짧은 무음 데이터(Base64)를 가진 가상의 오디오 객체야.
const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
silentAudio.loop = true; // 무한 반복 설정

// 상태 변수
let tracks = [];
let currentIndex = -1;

// ⭐️ 2. 오디오 상태 감지 및 프로세스 유지 로직
currentAudio.addEventListener('play', () => {
  // 진짜 노래가 틀어지면 무음 오디오는 끈다
  silentAudio.pause();
  playBtn.textContent = '⏸️'; 
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

currentAudio.addEventListener('pause', () => {
  // 진짜 노래가 멈추면 iOS가 앱을 재우지 못하도록 무음 오디오를 몰래 실행한다!
  silentAudio.play().catch(() => {});
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

// 잠금 화면/제어 센터 설정
function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: '메이플스토리 BGM',
    });

    // ⭐️ 3. 잠금화면 제어 명령 처리
    navigator.mediaSession.setActionHandler('play', () => {
      silentAudio.pause(); // 무음 끄고
      currentAudio.play().catch(e => console.error("재생 에러:", e)); // 진짜 노래 재생
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      currentAudio.pause(); // 진짜 노래 멈춤 (pause 이벤트가 발생하면서 무음 오디오가 켜짐)
    });
  }
}

// 음악 재생 함수
function playTrack(index) {
  currentIndex = index;
  const track = tracks[index];

  currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play().catch(e => console.error("재생 실패:", e));

  currentTitle.textContent = track.title;
  updateMediaSession(track);
}

// 재생 / 일시정지 토글 함수
function togglePlay() {
  if (currentIndex === -1) return;

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