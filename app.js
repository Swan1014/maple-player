// HTML 요소들 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

const currentAudio = document.getElementById('mainAudio');

// ⭐️ 1. 대기열(Queue)과 기록(History)을 저장할 변수 추가
let tracks = [];
let currentIndex = -1;
let customQueue = []; // 사용자가 ➕ 버튼으로 추가한 '다음에 재생할 곡들'
let playHistory = []; // '이전 곡' 버튼을 위한 기록

let audioCtx = null;

// iOS 백그라운드 동결 방지
function keepAudioAlive() {
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

// 오디오 상태 동기화 및 ⭐️ 자동 다음 곡 재생 로직 추가
currentAudio.addEventListener('play', () => {
  playBtn.textContent = '⏸️'; 
  keepAudioAlive(); 
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

currentAudio.addEventListener('pause', () => {
  playBtn.textContent = '▶️';
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});

// ⭐️ 곡이 끝났을 때 자동으로 다음 곡 틀기
currentAudio.addEventListener('ended', playNext);

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

// ⭐️ 2. 화면 그리기 (리스트와 추가 버튼 기능 분리)
function renderTracks(trackArray) {
  trackListContainer.innerHTML = ''; 

  if (trackArray.length === 0) {
    trackListContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">검색 결과가 없습니다 😢</p>';
    return;
  }

  trackArray.forEach((track) => {
    const trackDiv = document.createElement('div');
    trackDiv.className = 'track-item';
    
    // HTML 구조: 왼쪽 정보 영역 + 오른쪽 추가 버튼
    trackDiv.innerHTML = `
      <div class="track-info">
        <h3>${track.title}</h3>
        <p>${track.description}</p>
        <p>🏷️ ${track.tags.join(', ')}</p>
      </div>
      <button class="add-queue-btn">➕</button>
    `;
    
    // 1) 곡 정보 영역을 누르면 -> 즉시 그 곡을 재생
    trackDiv.querySelector('.track-info').onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      playTrack(realIndex);
    };

    // 2) ➕ 버튼을 누르면 -> 재생 대기열에 추가만 함
    trackDiv.querySelector('.add-queue-btn').onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      customQueue.push(realIndex); // 대기열 맨 뒤에 넣기
      alert(`'${track.title}' 곡이 재생 대기열에 추가되었습니다!`);
    };

    trackListContainer.appendChild(trackDiv);
  });
}

// ⭐️ 3. 코어 재생 엔진 (중복 코드 제거)
function loadAndPlay(index) {
  currentIndex = index;
  const track = tracks[index];

  keepAudioAlive();
  currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play().catch(e => console.error("재생 실패:", e));

  currentTitle.textContent = track.title;
  updateMediaSession(track);
}

// 리스트에서 곡을 누를 때 실행되는 함수 (히스토리 저장 포함)
function playTrack(index) {
  if (currentIndex !== -1) {
    playHistory.push(currentIndex); // 지금 듣고 있는 곡을 과거 기록에 저장
  }
  loadAndPlay(index);
}

// ⭐️ 4. 다음 곡 재생 로직 (대기열 우선)
function playNext() {
  if (tracks.length === 0) return;

  if (currentIndex !== -1) {
    playHistory.push(currentIndex); // 현재 곡을 기록에 저장
  }

  if (customQueue.length > 0) {
    // 사용자가 추가해 둔 대기열이 있다면 거기서 꺼내서 재생
    const nextIndex = customQueue.shift();
    loadAndPlay(nextIndex);
  } else {
    // 대기열이 비어있으면 기본 목록의 다음 곡 재생 (끝이면 처음으로)
    let nextIndex = currentIndex + 1;
    if (nextIndex >= tracks.length) nextIndex = 0;
    loadAndPlay(nextIndex);
  }
}

// ⭐️ 5. 이전 곡 재생 로직 (기록 기반)
function playPrev() {
  if (tracks.length === 0) return;

  if (playHistory.length > 0) {
    // 최근에 들었던 곡이 있으면 그걸 꺼내서 재생
    const prevIndex = playHistory.pop();
    loadAndPlay(prevIndex);
  } else {
    // 기록이 없으면 기본 목록의 이전 곡 재생 (처음이면 맨 뒤로)
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = tracks.length - 1;
    loadAndPlay(prevIndex);
  }
}

function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: '메이플스토리 BGM',
    });

    navigator.mediaSession.setActionHandler('play', async () => {
      keepAudioAlive();
      const saveTime = currentAudio.currentTime;
      try {
        await currentAudio.play();
        currentAudio.currentTime = saveTime;
      } catch (error) {
        currentAudio.load();
        currentAudio.currentTime = saveTime;
        currentAudio.play();
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => currentAudio.pause());
    
    // ⭐️ 잠금화면의 이전/다음 버튼과 연결
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
  }
}

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

// 앱 하단 바 버튼들 클릭 이벤트 연결
playBtn.onclick = togglePlay;
prevBtn.onclick = playPrev;
nextBtn.onclick = playNext;

loadTracks();