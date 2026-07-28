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
const optRemoveQueue = document.getElementById('optRemoveQueue'); // ⭐️ 추가됨
const optAddPlaylist = document.getElementById('optAddPlaylist');
const optEditTag = document.getElementById('optEditTag');

let tracks = [];
let customQueue = []; 
let queueCursor = -1; 
let audioCtx = null;

let selectedTrackIndex = -1;
let selectedQueuePos = -1; // ⭐️ 대기열 안에서 선택한 곡인지 구분하기 위한 변수

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

// ⭐️ 옵션 메뉴 열기 (대기열에서 열었는지, 메인에서 열었는지 구분)
function openOptionMenu(trackIndex, queuePos = -1) {
  selectedTrackIndex = trackIndex;
  selectedQueuePos = queuePos;
  
  const track = tracks[trackIndex];
  optionTitle.textContent = track.title;
  optionDesc.textContent = track.description;
  
  // ⭐️ 메인 리스트에서 열었으면 '대기열에서 삭제' 버튼 숨기기
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

// ⭐️ [옵션] 대기열에서 삭제 로직
optRemoveQueue.onclick = () => {
  if (selectedQueuePos !== -1) {
    customQueue.splice(selectedQueuePos, 1); // 배열에서 해당 곡 삭제

    if (selectedQueuePos < queueCursor) {
      // 내 앞의 곡이 삭제되면 내 커서를 한 칸 당겨옴
      queueCursor--;
    } else if (selectedQueuePos === queueCursor) {
      // ⭐️ 지금 재생 중인 곡을 삭제해버렸을 때의 예외 처리
      if (customQueue.length === 0) {
        pausePlayback();
        queueCursor = -1;
        currentTitle.textContent = "재생 중인 곡이 없습니다";
      } else {
        // 다음 곡이 이어서 재생되도록 함 (마지막 곡이었다면 정지)
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

// ⭐️ 드래그를 위한 임시 변수
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
    qDiv.dataset.pos = queuePosition; // 원래 위치를 기억해두기
    
    if (queuePosition === queueCursor) qDiv.classList.add('active');

    // ⭐️ 우측 끝에 드래그 손잡이(≡) 추가
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

    // ⭐️ 아이폰 터치 드래그 기능 구현 (Vanilla JS)
    const dragHandle = qDiv.querySelector('.drag-handle');
    
    dragHandle.addEventListener('touchstart', (e) => {
      e.preventDefault(); // 화면 스크롤 방지
      draggingElement = qDiv;
      draggingElement.classList.add('dragging');
    }, { passive: false });

    dragHandle.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!draggingElement) return;

      const touchY = e.touches[0].clientY;
      const siblings = [...queueList.querySelectorAll('.queue-item:not(.dragging)')];
      
      // 손가락 위치에 따라 어느 요소 앞에 끼워넣을지 계산
      let nextSibling = siblings.find(sibling => {
        const rect = sibling.getBoundingClientRect();
        return touchY < rect.top + rect.height / 2;
      });
      queueList.insertBefore(draggingElement, nextSibling);
    }, { passive: false });

    dragHandle.addEventListener('touchend', () => {
      if (!draggingElement) return;
      draggingElement.classList.remove('dragging');

      // 요소들의 바뀐 순서를 읽어서 customQueue 배열과 커서 위치 재조립
      const newQueue = [];
      let newCursor = -1;
      
      const items = queueList.querySelectorAll('.queue-item');
      items.forEach((item, index) => {
        const oldPos = parseInt(item.dataset.pos);
        newQueue.push(customQueue[oldPos]);
        
        // 재생 중이던 곡이 어디로 이동했는지 추적
        if (oldPos === queueCursor) {
          newCursor = index;
        }
      });

      customQueue = newQueue;
      queueCursor = newCursor;
      draggingElement = null;
      renderQueue(); // UI 갱신
    });

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

    // 메인 리스트에서 열 때는 queuePos를 안 보냄 (-1)
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