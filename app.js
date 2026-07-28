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

const optionOverlay = document.getElementById('optionOverlay');
const optionMenu = document.getElementById('optionMenu');
const optionTitle = document.getElementById('optionTitle');
const optionDesc = document.getElementById('optionDesc');
const optionCloseBtn = document.getElementById('optionCloseBtn');
const optPlayNext = document.getElementById('optPlayNext');
const optPlayLast = document.getElementById('optPlayLast');
const optRemoveQueue = document.getElementById('optRemoveQueue'); 
const optAddPlaylist = document.getElementById('optAddPlaylist');
const optEditTag = document.getElementById('optEditTag');

let tracks = [];
let customQueue = []; 
let queueCursor = -1; 
let audioCtx = null;

let selectedTrackIndex = -1;
let selectedQueuePos = -1; 

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

function openOptionMenu(trackIndex, queuePos = -1) {
  selectedTrackIndex = trackIndex;
  selectedQueuePos = queuePos;
  
  const track = tracks[trackIndex];
  optionTitle.textContent = track.title;
  optionDesc.textContent = track.description;
  
  if (queuePos === -1) {
    optRemoveQueue.style.display = 'none';
  } else {
    optRemoveQueue.style.display = 'block';
  }
  
  optionOverlay.classList.remove('hidden');
  optionMenu.classList.remove('hidden');
}

function closeOptionMenu() {
  optionOverlay.classList.add('hidden');
  optionMenu.classList.add('hidden');
}

optionOverlay.onclick = closeOptionMenu;
optionCloseBtn.onclick = closeOptionMenu;

optPlayNext.onclick = () => {
  if (selectedTrackIndex !== -1) {
    if (customQueue.length === 0) {
      customQueue.push(selectedTrackIndex);
      queueCursor = 0;
      loadAndPlay(customQueue[queueCursor]);
    } else {
      customQueue.splice(queueCursor + 1, 0, selectedTrackIndex);
    }
    renderQueue();
  }
  closeOptionMenu();
};

optPlayLast.onclick = () => {
  if (selectedTrackIndex !== -1) {
    if (customQueue.length === 0) {
      customQueue.push(selectedTrackIndex);
      queueCursor = 0;
      loadAndPlay(customQueue[queueCursor]);
    } else {
      customQueue.push(selectedTrackIndex);
    }
    renderQueue();
  }
  closeOptionMenu();
};

optRemoveQueue.onclick = () => {
  if (selectedQueuePos !== -1) {
    customQueue.splice(selectedQueuePos, 1); 

    if (selectedQueuePos < queueCursor) {
      queueCursor--;
    } else if (selectedQueuePos === queueCursor) {
      if (customQueue.length === 0) {
        pausePlayback();
        queueCursor = -1;
        currentTitle.textContent = "재생 중인 곡이 없습니다";
      } else {
        if (queueCursor >= customQueue.length) {
          pausePlayback();
          queueCursor = -1;
          currentTitle.textContent = "재생 중인 곡이 없습니다";
        } else {
          loadAndPlay(customQueue[queueCursor]);
        }
      }
    }
    renderQueue();
  }
  closeOptionMenu();
};

optAddPlaylist.onclick = () => {
  alert("플레이리스트에 추가 기능은 곧 업데이트됩니다!");
  closeOptionMenu();
};

optEditTag.onclick = () => {
  alert("태그 편집 기능은 곧 업데이트됩니다!");
  closeOptionMenu();
};

let draggingElement = null;

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
    qDiv.dataset.pos = queuePosition; 
    
    if (queuePosition === queueCursor) qDiv.classList.add('active');

    qDiv.innerHTML = `
      <div class="queue-info">
        <h4>${track.title}</h4>
        <p>${track.description}</p>
      </div>
      <button class="option-btn">⋮</button>
      <div class="drag-handle">≡</div>
    `;

    qDiv.querySelector('.queue-info').onclick = () => jumpToQueueTrack(queuePosition);
    qDiv.querySelector('.option-btn').onclick = () => openOptionMenu(trackIndex, queuePosition);

    const dragHandle = qDiv.querySelector('.drag-handle');
    
    // ⭐️ PC(마우스)와 모바일(터치) 모두 지원하는 드래그 시작 로직
    const dragStart = (e) => {
      e.preventDefault(); // 텍스트 드래그 선택 방지
      draggingElement = qDiv;
      draggingElement.classList.add('dragging');

      // PC 마우스용 전역 이벤트 등록 (마우스가 손잡이를 벗어나도 드래그 유지)
      if (e.type === 'mousedown') {
        document.addEventListener('mousemove', dragMove, { passive: false });
        document.addEventListener('mouseup', dragEnd);
      }
    };

    // ⭐️ 드래그 중 로직
    const dragMove = (e) => {
      if (!draggingElement) return;
      e.preventDefault();

      // 모바일은 touches[0]에서, PC는 직접 clientY 추출
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      const siblings = [...queueList.querySelectorAll('.queue-item:not(.dragging)')];
      
      let nextSibling = siblings.find(sibling => {
        const rect = sibling.getBoundingClientRect();
        return clientY < rect.top + rect.height / 2;
      });
      queueList.insertBefore(draggingElement, nextSibling);
    };

    // ⭐️ 드래그 끝 로직
    const dragEnd = (e) => {
      if (!draggingElement) return;
      draggingElement.classList.remove('dragging');

      // PC 마우스용 전역 이벤트 해제
      if (e.type === 'mouseup') {
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', dragEnd);
      }

      const newQueue = [];
      let newCursor = -1;
      
      const items = queueList.querySelectorAll('.queue-item');
      items.forEach((item, index) => {
        const oldPos = parseInt(item.dataset.pos);
        newQueue.push(customQueue[oldPos]);
        
        if (oldPos === queueCursor) {
          newCursor = index;
        }
      });

      customQueue = newQueue;
      queueCursor = newCursor;
      draggingElement = null;
      renderQueue(); 
    };

    // 모바일 터치 이벤트 리스너
    dragHandle.addEventListener('touchstart', dragStart, { passive: false });
    dragHandle.addEventListener('touchmove', dragMove, { passive: false });
    dragHandle.addEventListener('touchend', dragEnd);

    // PC 마우스 이벤트 리스너
    dragHandle.addEventListener('mousedown', dragStart);

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