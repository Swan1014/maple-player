const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');
const currentAudio = document.getElementById('mainAudio');
const bottomSheet = document.getElementById('bottomSheet');
const nowPlayingArea = document.getElementById('nowPlayingArea');
const queueList = document.getElementById('queueList');
const clearQueueBtn = document.getElementById('clearQueueBtn');

let tracks = [];
let currentIndex = -1;
let customQueue = []; 

// ⭐️ 대기열 커서 관리를 위한 새로운 변수들
let queueCursor = -1; 
let isPlayingQueue = false; 

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

nowPlayingArea.onclick = () => {
  bottomSheet.classList.toggle('expanded');
};

// ⭐️ 대기열 화면 그리기 (하이라이트 기능 추가)
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
    
    // 현재 대기열에서 재생 중인 곡이면 active 클래스 붙이기
    if (isPlayingQueue && queuePosition === queueCursor) {
      qDiv.classList.add('active');
    }

    qDiv.innerHTML = `
      <div class="queue-info">
        <h4>${track.title}</h4>
        <p>${track.description}</p>
      </div>
      <button class="add-queue-btn">➕</button>
    `;

    // 대기열의 곡을 누르면 커서를 그 위치로 이동 (삭제 안 함)
    qDiv.querySelector('.queue-info').onclick = () => {
      jumpToQueueTrack(queuePosition);
    };

    // 대기열 안의 ➕ 버튼 (알림창 제거)
    qDiv.querySelector('.add-queue-btn').onclick = () => {
      customQueue.push(trackIndex);
      renderQueue(); 
    };

    queueList.appendChild(qDiv);
  });
}

clearQueueBtn.onclick = () => {
  customQueue = [];
  isPlayingQueue = false;
  queueCursor = -1;
  renderQueue();
};

// ⭐️ 대기열 건너뛰기 함수 (커서만 이동)
function jumpToQueueTrack(queuePosition) {
  if (currentIndex !== -1 && !isPlayingQueue) playHistory.push(currentIndex);
  
  isPlayingQueue = true;
  queueCursor = queuePosition; // 커서를 클릭한 곡의 위치로 변경
  
  bottomSheet.classList.remove('expanded');
  
  loadAndPlay(customQueue[queueCursor]);
  renderQueue(); // 하이라이트 위치 갱신
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
    
    // 메인 리스트에서 곡을 누르면 큐 모드 해제
    trackDiv.querySelector('.track-info').onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      isPlayingQueue = false;
      queueCursor = -1;
      playTrack(realIndex);
      renderQueue(); // 하이라이트 제거
    };

    // ➕ 버튼 (알림창 제거)
    trackDiv.querySelector('.add-queue-btn').onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      customQueue.push(realIndex);
      renderQueue(); // 조용히 UI만 갱신
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
  if (currentIndex !== -1 && !isPlayingQueue) playHistory.push(currentIndex);
  loadAndPlay(index);
}

// ⭐️ 정교해진 다음 곡 로직
function playNext() {
  if (isPlayingQueue) {
    // 대기열 재생 중일 때: 다음 커서로 이동
    if (queueCursor < customQueue.length - 1) {
      queueCursor++;
      loadAndPlay(customQueue[queueCursor]);
      renderQueue();
    } else {
      // 대기열 끝까지 다 들었을 때
      isPlayingQueue = false;
      queueCursor = -1;
      renderQueue();
      pausePlayback();
    }
  } else {
    // 메인 리스트 재생 중이거나 정지 상태일 때
    if (customQueue.length > 0) {
      if (currentIndex !== -1) playHistory.push(currentIndex);
      isPlayingQueue = true;
      queueCursor = 0; // 대기열의 첫 곡부터 시작
      loadAndPlay(customQueue[queueCursor]);
      renderQueue();
    } else {
      pausePlayback();
    }
  }
}

// ⭐️ 정교해진 이전 곡 로직
function playPrev() {
  if (currentIndex === -1) return;
  if (currentAudio.currentTime > 3) {
    currentAudio.currentTime = 0;
    return;
  }

  // 대기열 안에서 이전 곡으로 이동
  if (isPlayingQueue && queueCursor > 0) {
    queueCursor--;
    loadAndPlay(customQueue[queueCursor]);
    renderQueue();
    return;
  }

  // 대기열의 맨 처음이거나 메인 리스트일 때, 과거에 들었던 곡으로 돌아가기
  if (playHistory.length > 0) {
    isPlayingQueue = false;
    queueCursor = -1;
    const prevIndex = playHistory.pop();
    loadAndPlay(prevIndex);
    renderQueue();
  } else {
    currentAudio.currentTime = 0;
  }
}

function pausePlayback() {
  currentAudio.pause();
  currentAudio.currentTime = 0;
  playBtn.textContent = '▶️';
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
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