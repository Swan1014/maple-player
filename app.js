// HTML 요소들 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

const currentAudio = document.getElementById('mainAudio');
const silentAudio = document.getElementById('silentAudio'); // ⭐️ 무음 오디오 요소

let tracks = [];
let currentIndex = -1;

// ⭐️ 오디오 세션 유지 함수 (일시정지 시 무음 재생, 재생 시 무음 정지)
function handleSilentAudio(shouldPlaySilent) {
  if (shouldPlaySilent) {
    // 일시정지 상태일 때: 무음을 틀어 아이폰이 백그라운드 오디오를 끄지 못하게 방지
    silentAudio.play().catch(() => {});
  } else {
    // 실제 음악이 나올 때: 무음 정지
    silentAudio.pause();
  }
}

// 오디오 상태 동기화
currentAudio.addEventListener('play', () => {
  playBtn.textContent = '⏸️'; 
  handleSilentAudio(false); // 진짜 음악이 나오면 무음 끄기
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

currentAudio.addEventListener('pause', () => {
  playBtn.textContent = '▶️';
  handleSilentAudio(true); // 음악이 멈추면 무음을 틀어 오디오 세션 살려두기
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
      handleSilentAudio(false);
      try {
        await currentAudio.play();
      } catch (error) {
        currentAudio.load();
        currentAudio.play();
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      currentAudio.pause();
      // pause 이벤트 리스너에서 handleSilentAudio(true)가 자동으로 실행됨
    });
  }
}

// 음악 재생 함수
function playTrack(index) {
  currentIndex = index;
  const track = tracks[index];

  // 사용자 터치가 일어났을 때 무음 오디오 권한도 함께 획득
  silentAudio.play().then(() => silentAudio.pause()).catch(() => {});

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

playBtn.onclick = togglePlay;

// 앱 시작
loadTracks();