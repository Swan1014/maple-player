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

// ⭐️ 옵션 메뉴 관련 요소들
const optionOverlay = document.getElementById('optionOverlay');
const optionMenu = document.getElementById('optionMenu');
const optionTitle = document.getElementById('optionTitle');
const optionDesc = document.getElementById('optionDesc');
const optionCloseBtn = document.getElementById('optionCloseBtn');
const optPlayNext = document.getElementById('optPlayNext');
const optPlayLast = document.getElementById('optPlayLast');
const optAddPlaylist = document.getElementById('optAddPlaylist');
const optEditTag = document.getElementById('optEditTag');

let tracks = [];
let customQueue = []; 
let queueCursor = -1; 
let audioCtx = null;

// 옵션 메뉴에서 선택된 곡의 진짜 ID(인덱스)를 임시로 저장해둘 변수
let selectedTrackIndex = -1;

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

// ⭐️ 옵션 메뉴 열기 함수
function openOptionMenu(trackIndex) {
  selectedTrackIndex = trackIndex;
  const track = tracks[trackIndex];
  
  optionTitle.textContent = track.title;
  optionDesc.textContent = track.description;
  
  optionOverlay.classList.remove('hidden');
  optionMenu.classList.remove('hidden');
}

// ⭐️ 옵션 메뉴 닫기 함수
function closeOptionMenu() {
  optionOverlay.classList.add('hidden');
  optionMenu.classList.add('hidden');
}

optionOverlay.onclick = closeOptionMenu;
optionCloseBtn.onclick = closeOptionMenu;

// ⭐️ [옵션] 다음에 재생 기능 로직
optPlayNext.onclick = () => {
  if (selectedTrackIndex !== -1) {
    if (customQueue.length === 0) {
      // 대기열이 비어있으면 그냥 추가 후 즉시 재생
      customQueue.push(selectedTrackIndex);
      queueCursor = 0;
      loadAndPlay(customQueue[queueCursor]);
    } else {
      // 현재 재생 중인 커서 '바로 다음'에 끼워넣기 (splice 활용)
      customQueue.splice(queueCursor + 1, 0, selectedTrackIndex);
    }
    renderQueue();
  }
  closeOptionMenu();
};

// ⭐️ [옵션] 마지막에 재생 기능 로직
optPlayLast.onclick = () => {
  if (selectedTrackIndex !== -1) {
    if (customQueue.length === 0) {
      customQueue.push(selectedTrackIndex);
      queueCursor = 0;
      loadAndPlay(customQueue[queueCursor]);
    } else {
      // 대기열의 맨 끝에 추가 (기존 방식)
      customQueue.push(selectedTrackIndex);
    }
    renderQueue();
  }
  closeOptionMenu();
};

// [옵션] 껍데기 기능들
optAddPlaylist.onclick = () => {
  alert("플레이리스트에 추가 기능은 곧 업데이트됩니다!");
  closeOptionMenu();
};

optEditTag.onclick = () => {
  alert("태그 편집 기능은 곧 업데이트됩니다!");
  closeOptionMenu();
};

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
    
    if (queuePosition === queueCursor) qDiv.classList.add('active');

    // 대기열 내부의 버튼도 ➕에서 ⋮로 변경
    qDiv.innerHTML = `
      <div class="queue-info">
        <h4>${track.title}</h4>
        <p>${track.description}</p>
      </div>
      <button class="option-btn">⋮</button>
    `;

    qDiv.querySelector('.queue-info').onclick = () => {
      jumpToQueueTrack(queuePosition);
    };

    // 대기열에서 옵션 버튼을 눌러도 똑같이 메뉴 팝업이 뜸
    qDiv.querySelector('.option-btn').onclick = () => {
      openOptionMenu(trackIndex);
    };

    queueList.appendChild(qDiv);
  });
}

clearQueueBtn.onclick = () => {
  customQueue = [];
  queueCursor = -1;
  pausePlayback();
  currentTitle.textContent = "재생 중인 곡이 없습니다";
  renderQueue();
};

function jumpToQueueTrack(queuePosition) {
  queueCursor = queuePosition;
  bottomSheet.classList.remove('expanded');
  loadAndPlay(customQueue[queueCursor]);
  renderQueue(); 
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
    // 메인 리스트 버튼 ➕ -> ⋮ 변경
    trackDiv.innerHTML = `
      <div class="track-info">
        <h3>${track.title}</h3>
        <p>${track.description}</p>
        <p>🏷️ ${track.tags.join(', ')}</p>
      </div>
      <button class="option-btn">⋮</button>
    `;
    
    trackDiv.querySelector('.track-info').onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      customQueue = [realIndex]; 
      queueCursor = 0; 
      loadAndPlay(customQueue[queueCursor]);
      renderQueue(); 
    };

    trackDiv.querySelector('.option-btn').onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      openOptionMenu(realIndex);
    };

    trackListContainer.appendChild(trackDiv);
  });
}

function loadAndPlay(index) {
  const track = tracks[index];
  keepAudioAlive();
  currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play().catch(e => console.error("재생 실패:", e));
  currentTitle.textContent = track.title;
  updateMediaSession(track);
}

function playNext() {
  if (customQueue.length > 0 && queueCursor < customQueue.length - 1) {
    queueCursor++;
    loadAndPlay(customQueue[queueCursor]);
    renderQueue();
  } else {
    pausePlayback();
  }
}

function playPrev() {
  if (customQueue.length === 0) return;
  if (currentAudio.currentTime > 3) {
    currentAudio.currentTime = 0;
    return;
  }
  if (queueCursor > 0) {
    queueCursor--;
    loadAndPlay(customQueue[queueCursor]);
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
  if (customQueue.length === 0) return; 
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