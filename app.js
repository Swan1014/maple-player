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
let isPlaying = false;
let currentIndex = -1;

// ⭐️ 1. 백그라운드 재생을 위한 필수 설정: Audio 객체가 백그라운드에서도 죽지 않도록 설정
// iOS 웹 앱에서 백그라운드 오디오를 유지하기 위한 꼼수(트릭) 중 하나야.
// (다만, 완벽한 백그라운드 유지는 브라우저 정책상 제약이 있을 수 있어서 실제 폰에서 테스트가 중요해!)
currentAudio.preload = 'metadata';

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

// ⭐️ 2. 잠금 화면/제어 센터에 곡 정보 등록하기 함수
function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: '메이플스토리 BGM',
      // 나중에 앨범 아트도 넣고 싶으면 여기에 이미지 URL을 추가할 수 있어.
      // artwork: [{ src: 'assets/images/maple_cover.png', sizes: '512x512', type: 'image/png' }]
    });

    // 잠금 화면에서 재생/일시정지 버튼을 눌렀을 때 실행될 동작 연결
    navigator.mediaSession.setActionHandler('play', () => {
      currentAudio.play();
      isPlaying = true;
      playBtn.textContent = '⏸️';
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      currentAudio.pause();
      isPlaying = false;
      playBtn.textContent = '▶️';
    });
    
    // 이전 곡 / 다음 곡 액션도 나중에 여기에 추가할 수 있어!
  }
}

// 음악 재생 함수
function playTrack(index, trackArray) {
  currentIndex = index;
  const track = trackArray[index];

  currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play();
  isPlaying = true;

  currentTitle.textContent = track.title;
  playBtn.textContent = '⏸️';

  // ⭐️ 3. 곡이 바뀔 때마다 미디어 세션(잠금 화면 정보) 업데이트
  updateMediaSession(track);
}

// 재생 / 일시정지 토글 함수
function togglePlay() {
  if (currentIndex === -1) return;

  if (isPlaying) {
    currentAudio.pause();
    playBtn.textContent = '▶️';
  } else {
    currentAudio.play();
    playBtn.textContent = '⏸️';
  }
  isPlaying = !isPlaying;
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