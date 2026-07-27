// HTML 요소들 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

// ⭐️ 1. HTML에 박아둔 오디오 요소 가져오기 (new Audio() 사용 안 함)
const currentAudio = document.getElementById('mainAudio');

// 상태를 저장할 변수들
let tracks = [];
let currentIndex = -1;

// 오디오 상태 동기화
currentAudio.addEventListener('play', () => {
  playBtn.textContent = '⏸️'; 
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

  trackArray.forEach((track, index) => {
    const trackDiv = document.createElement('div');
    trackDiv.className = 'track-item';
    trackDiv.innerHTML = `
      <h3>${track.title}</h3>
      <p>${track.description}</p>
      <p>🏷️ ${track.tags.join(', ')}</p>
    `;
    
    // index가 아니라 전체 tracks 기준의 진짜 ID나 고유 번호로 재생하는 게 좋지만, 
    // 지금은 필터링 상태에서도 원본 배열(tracks)에서 곡을 찾도록 수정
    trackDiv.onclick = () => {
      // 필터링된 배열의 index가 아니라, 원본 tracks에서의 진짜 index를 찾아서 재생
      const realIndex = tracks.findIndex(t => t.title === track.title);
      playTrack(realIndex);
    };
    trackListContainer.appendChild(trackDiv);
  });
}

// ⭐️ 2. 잠금 화면/제어 센터 설정 (에러 처리 강화)
function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: '메이플스토리 BGM',
    });

    navigator.mediaSession.setActionHandler('play', () => {
      // 잠금화면에서 play 시도 시, 브라우저 정책 차단(NotAllowedError)을 방지하기 위한 강제 실행
      currentAudio.play().catch(error => {
        console.warn("잠금화면 재생 차단됨. 재시도합니다.", error);
        // 간혹 일시정지 후 버퍼가 끊기는 현상 방지를 위해 강제로 로드 후 재생
        currentAudio.load();
        currentAudio.play();
      });
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

  // ⭐️ 3. iOS 캐시 이슈 방지를 위해 쿼리 파라미터를 붙여보는 트릭 (선택사항이지만 안정성을 높임)
  // currentAudio.src = `assets/music/${track.filename}?t=${new Date().getTime()}`; 
  currentAudio.src = `assets/music/${track.filename}`;
  
  // play()는 비동기 프로미스를 반환하므로 에러 캐치
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