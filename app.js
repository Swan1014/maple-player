// HTML 요소들 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

const currentAudio = document.getElementById('mainAudio');

// ⭐️ 바텀 시트 관련 요소들
const bottomSheet = document.getElementById('bottomSheet');
const nowPlayingArea = document.getElementById('nowPlayingArea');
const queueList = document.getElementById('queueList');
const clearQueueBtn = document.getElementById('clearQueueBtn');

let tracks = [];
let currentIndex = -1;
let customQueue = []; 
let playHistory = []; 
let audioCtx = null;

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
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

currentAudio.addEventListener('play', () => {
  playBtn.textContent = '⏸️'; 
  keepAudioAlive(); 
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

currentAudio.addEventListener('pause', () => {
  playBtn.textContent = '▶️';
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});

currentAudio.addEventListener('ended', playNext);

// ⭐️ 1. 바텀 시트 열고 닫기
nowPlayingArea.onclick = () => {
  bottomSheet.classList.toggle('expanded');
};

// ⭐️ 2. 대기열 화면에 그리기 함수
function renderQueue() {
  queueList.innerHTML = '';

  if (customQueue.length === 0) {
    queueList.innerHTML = '<div class="empty-queue">대기열이 비어있습니다.</div>';
    return;
  }

  customQueue.forEach((trackIndex, queuePosition) => {
    const track = tracks[trackIndex];
    const qDiv = document.createElement('div');
    qDiv.className = 'queue-item';

    qDiv.innerHTML = `
      <div class="queue-info">
        <h4>${track.title}</h4>
        <p>${track.description}</p>
      </div>
      <button class="add-queue-btn">➕</button>
    `;

    // 1) 대기열에서 곡을 누르면 중간 건너뛰기 실행
    qDiv.querySelector('.queue-info').onclick = () => {
      jumpToQueueTrack(queuePosition);
    };

    // 2) 대기열 안의 ➕ 버튼: 대기열 맨 끝에 한 번 더 추가
    qDiv.querySelector('.add-queue-btn').onclick = () => {
      customQueue.push(trackIndex);
      alert(`'${track.title}' 곡이 대기열에 한 번 더 추가되었습니다!`);
      renderQueue(); // UI 갱신
    };

    queueList.appendChild(qDiv);
  });
}

// ⭐️ 3. 대기열 비우기 기능
clearQueueBtn.onclick = () => {
  customQueue = [];
  renderQueue();
};

// ⭐️ 4. 중간 곡 건너뛰고 바로 이동하는 함수
function jumpToQueueTrack(queuePosition) {
  if (currentIndex !== -1) playHistory.push(currentIndex);
  
  // 클릭한 곡의 실제 번호 가져오기
  const targetIndex = customQueue[queuePosition];
  
  // 핵심 로직: 큐에서 첫 번째 곡부터 내가 클릭한 곡까지 싹 잘라버림(삭제)
  customQueue.splice(0, queuePosition + 1);

  // 시트를 자동으로 내려줌 (음악 감상을 위해)
  bottomSheet.classList.remove('expanded');

  // UI 새로고침 후 노래 재생
  renderQueue();
  loadAndPlay(targetIndex);
}

async function loadTracks() {
  try {
    const response = await fetch('data.json');
    tracks = await response.json();
    renderTracks(tracks);
  } catch (error) {
    console.error("데이터 불러오기 실패:", error);
  }
}

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
      <div class="track-info">
        <h3>${track.title}</h3>
        <p>${track.description}</p>
        <p>🏷️ ${track.tags.join(', ')}</p>
      </div>
      <button class="add-queue-btn">➕</button>
    `;
    
    trackDiv.querySelector('.track-info').onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      playTrack(realIndex);
    };

    trackDiv.querySelector('.add-queue-btn').onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      customQueue.push(realIndex);
      alert(`'${track.title}' 곡이 재생 대기열에 추가되었습니다!`);
      renderQueue(); // ⭐️ 대기열이 추가될 때마다 UI 즉시 갱신
    };

    trackListContainer.appendChild(trackDiv);
  });
}

function loadAndPlay(index) {
  currentIndex = index;
  const track = tracks[index];
  keepAudioAlive();
  currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play().catch(e => console.error("재생 실패:", e));
  currentTitle.textContent = track.title;
  updateMediaSession(track);
}

function playTrack(index) {
  if (currentIndex !== -1) playHistory.push(currentIndex);
  loadAndPlay(index);
}

function playNext() {
  if (customQueue.length > 0) {
    if (currentIndex !== -1) playHistory.push(currentIndex);
    const nextIndex = customQueue.shift();
    loadAndPlay(nextIndex);
    renderQueue(); // 대기열에서 곡이 빠졌으니 UI 갱신
  } else {
    if (currentIndex === -1) return;
    currentAudio.pause();
    currentAudio.currentTime = 0;
    playBtn.textContent = '▶️';
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
}

function playPrev() {
  if (currentIndex === -1) return;
  if (currentAudio.currentTime > 3) {
    currentAudio.currentTime = 0;
    return;
  }
  if (playHistory.length > 0) {
    const prevIndex = playHistory.pop();
    loadAndPlay(prevIndex);
  } else {
    currentAudio.currentTime = 0;
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
prevBtn.onclick = playPrev;
nextBtn.onclick = playNext;

loadTracks();