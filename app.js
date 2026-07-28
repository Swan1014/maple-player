const trackListContainer = document.getElementById('trackList');
const playlistView = document.getElementById('playlistView');
const playlistDetailView = document.getElementById('playlistDetailView');
const tabAll = document.getElementById('tabAll');
const tabPlaylist = document.getElementById('tabPlaylist');

const detailTitle = document.getElementById('detailTitle');
const detailCount = document.getElementById('detailCount');
const detailTrackList = document.getElementById('detailTrackList');
const backToPlaylistBtn = document.getElementById('backToPlaylistBtn');
const playAllBtn = document.getElementById('playAllBtn');

const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn'); // ⭐️ 추가됨
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

const playlistSelectOverlay = document.getElementById('playlistSelectOverlay');
const playlistSelectMenu = document.getElementById('playlistSelectMenu');
const playlistSelectList = document.getElementById('playlistSelectList');
const playlistSelectCloseBtn = document.getElementById('playlistSelectCloseBtn');

// 상태 변수들
let tracks = [];
let customQueue = []; 
let queueCursor = -1; 
let audioCtx = null;

let selectedTrackIndex = -1;
let selectedQueuePos = -1; 
let myPlaylists = [];

// ⭐️ 셔플 관리를 위한 새로운 변수
let isShuffle = false;
let originalQueue = []; // 셔플을 끄면 돌아갈 '원래 대기열' 백업 공간

// 탭 전환
tabAll.onclick = () => {
  tabAll.classList.add('active');
  tabPlaylist.classList.remove('active');
  trackListContainer.classList.add('active'); 
  playlistView.classList.remove('active'); 
  playlistDetailView.classList.remove('active');
  searchInput.style.display = 'block'; 
};

tabPlaylist.onclick = () => {
  tabPlaylist.classList.add('active');
  tabAll.classList.remove('active');
  playlistView.classList.add('active'); 
  trackListContainer.classList.remove('active'); 
  playlistDetailView.classList.remove('active');
  searchInput.style.display = 'none'; 
};

// ⭐️ 배열을 랜덤하게 섞는 함수 (Fisher-Yates 알고리즘)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ⭐️ 셔플 버튼 토글 로직 (유튜브 뮤직 스타일)
shuffleBtn.onclick = () => {
  if (customQueue.length === 0) return; // 대기열 비어있으면 무시

  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);

  if (isShuffle) {
    // 셔플 켜기: 현재 대기열 백업
    originalQueue = [...customQueue];

    // 지금 듣고 있는 곡 번호 저장
    const currentTrackId = customQueue[queueCursor];

    // 현재 듣고 있는 곡을 제외한 나머지 곡들만 분리
    const remainingTracks = customQueue.filter((_, index) => index !== queueCursor);

    // 나머지 곡들 마구 섞기
    shuffleArray(remainingTracks);

    // 새 대기열 = [현재 듣고 있는 곡] + [섞인 나머지 곡들]
    customQueue = [currentTrackId, ...remainingTracks];
    queueCursor = 0; // 현재 곡이 맨 앞으로 왔으므로 커서는 0
  } else {
    // 셔플 끄기: 원본 대기열로 복구
    const currentTrackId = customQueue[queueCursor];
    customQueue = [...originalQueue]; // 원본으로 덮어쓰기

    // 원본 대기열에서 지금 듣고 있는 곡이 원래 몇 번이었는지 찾아내기
    queueCursor = customQueue.findIndex(id => id === currentTrackId);
    originalQueue = []; // 백업 초기화
  }
  
  renderQueue(); // 섞인(또는 복구된) 대기열 화면 새로고침
};

// --- 이 아래부터는 기존 기능 유지 (오디오, 재생, 팝업, 렌더링 등) ---
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

nowPlayingArea.onclick = () => { bottomSheet.classList.toggle('expanded'); };

// 옵션 메뉴 처리
function openOptionMenu(trackIndex, queuePos = -1) {
  selectedTrackIndex = trackIndex;
  selectedQueuePos = queuePos;
  const track = tracks[trackIndex];
  optionTitle.textContent = track.title;
  optionDesc.textContent = track.description;
  optRemoveQueue.style.display = queuePos === -1 ? 'none' : 'block';
  optionOverlay.classList.remove('hidden');
  optionMenu.classList.remove('hidden');
}

function closeOptionMenu() {
  optionOverlay.classList.add('hidden');
  optionMenu.classList.add('hidden');
}

optionOverlay.onclick = closeOptionMenu;
optionCloseBtn.onclick = closeOptionMenu;

function closePlaylistSelectMenu() {
  playlistSelectOverlay.classList.add('hidden');
  playlistSelectMenu.classList.add('hidden');
}
playlistSelectOverlay.onclick = closePlaylistSelectMenu;
playlistSelectCloseBtn.onclick = closePlaylistSelectMenu;

optPlayNext.onclick = () => {
  if (selectedTrackIndex !== -1) {
    if (customQueue.length === 0) {
      customQueue.push(selectedTrackIndex);
      queueCursor = 0;
      loadAndPlay(customQueue[queueCursor]);
    } else {
      customQueue.splice(queueCursor + 1, 0, selectedTrackIndex);
    }
    // ⭐️ 셔플 중일 땐 원본 백업 배열에도 살짝 끼워넣어줌
    if (isShuffle && originalQueue.length > 0) {
       originalQueue.push(selectedTrackIndex); 
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
    // ⭐️ 셔플 중일 땐 원본 백업 배열 맨 끝에 넣음
    if (isShuffle && originalQueue.length > 0) {
       originalQueue.push(selectedTrackIndex); 
    }
    renderQueue();
  }
  closeOptionMenu();
};

optRemoveQueue.onclick = () => {
  if (selectedQueuePos !== -1) {
    const removingTrackId = customQueue[selectedQueuePos];
    customQueue.splice(selectedQueuePos, 1); 

    // ⭐️ 셔플 중일 땐 원본 백업 배열에서도 찾아서 지움
    if (isShuffle && originalQueue.length > 0) {
      const orgIdx = originalQueue.indexOf(removingTrackId);
      if (orgIdx !== -1) originalQueue.splice(orgIdx, 1);
    }

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
  if (selectedTrackIndex === -1) return;
  closeOptionMenu();
  if (myPlaylists.length === 0) {
    alert("만들어진 플레이리스트가 없습니다. [내 플레이리스트] 탭에서 먼저 만들어주세요!");
    return;
  }
  playlistSelectList.innerHTML = '';
  myPlaylists.forEach((playlist) => {
    const li = document.createElement('li');
    li.textContent = `📁 ${playlist.name} (${playlist.tracks.length}곡)`;
    li.onclick = () => {
      if (playlist.tracks.includes(selectedTrackIndex)) {
        alert("이미 이 플레이리스트에 들어있는 곡입니다.");
      } else {
        playlist.tracks.push(selectedTrackIndex);
        savePlaylists();
        renderPlaylists();
        alert(`'${playlist.name}'에 곡이 추가되었습니다!`);
      }
      closePlaylistSelectMenu();
    };
    playlistSelectList.appendChild(li);
  });
  playlistSelectOverlay.classList.remove('hidden');
  playlistSelectMenu.classList.remove('hidden');
};

optEditTag.onclick = () => { alert("태그 편집 기능은 곧 업데이트됩니다!"); closeOptionMenu(); };

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
    
    const dragStart = (e) => {
      e.preventDefault();
      draggingElement = qDiv;
      draggingElement.classList.add('dragging');
      if (e.type === 'mousedown') {
        document.addEventListener('mousemove', dragMove, { passive: false });
        document.addEventListener('mouseup', dragEnd);
      }
    };

    const dragMove = (e) => {
      if (!draggingElement) return;
      e.preventDefault();
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      const siblings = [...queueList.querySelectorAll('.queue-item:not(.dragging)')];
      let nextSibling = siblings.find(sibling => {
        const rect = sibling.getBoundingClientRect();
        return clientY < rect.top + rect.height / 2;
      });
      queueList.insertBefore(draggingElement, nextSibling);
    };

    const dragEnd = (e) => {
      if (!draggingElement) return;
      draggingElement.classList.remove('dragging');
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
        if (oldPos === queueCursor) newCursor = index;
      });

      customQueue = newQueue;
      queueCursor = newCursor;
      
      // ⭐️ 셔플 중에 직접 드래그해서 위치를 바꿨다면?
      // 원본 백업(originalQueue)은 유지하되, 이 섞인 상태를 유저의 '의도'로 존중
      
      draggingElement = null;
      renderQueue(); 
    };

    dragHandle.addEventListener('touchstart', dragStart, { passive: false });
    dragHandle.addEventListener('touchmove', dragMove, { passive: false });
    dragHandle.addEventListener('touchend', dragEnd);
    dragHandle.addEventListener('mousedown', dragStart);
    queueList.appendChild(qDiv);
  });
}

clearQueueBtn.onclick = () => {
  customQueue = [];
  queueCursor = -1;
  isShuffle = false; 
  shuffleBtn.classList.remove('active');
  originalQueue = [];
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
      // ⭐️ 메인에서 누르면 셔플 모드 강제 해제 (기성 앱 국룰)
      isShuffle = false;
      shuffleBtn.classList.remove('active');
      originalQueue = [];

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
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: '메이플스토리 BGM' });
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
    return track.title.toLowerCase().includes(query) || 
           track.description.toLowerCase().includes(query) || 
           track.tags.some(tag => tag.toLowerCase().includes(query));
  });
  renderTracks(filteredTracks);
});

playBtn.onclick = togglePlay;
prevBtn.onclick = playPrev;
nextBtn.onclick = playNext;

// 플레이리스트 LocalStorage 기능
const playlistContainer = document.getElementById('playlistContainer');
const createNewPlaylistBtn = document.getElementById('createNewPlaylistBtn');

function loadPlaylists() {
  const savedData = localStorage.getItem('maple_playlists');
  myPlaylists = savedData ? JSON.parse(savedData) : [];
  renderPlaylists();
}

function savePlaylists() {
  localStorage.setItem('maple_playlists', JSON.stringify(myPlaylists));
}

createNewPlaylistBtn.onclick = () => {
  const title = prompt("새 플레이리스트의 이름을 입력하세요:");
  if (title === null || title.trim() === "") return;
  myPlaylists.push({ id: Date.now(), name: title.trim(), tracks: [] });
  savePlaylists(); 
  renderPlaylists(); 
};

function renderPlaylists() {
  playlistContainer.innerHTML = '';
  if (myPlaylists.length === 0) {
    playlistContainer.innerHTML = '<p style="text-align:center; color:#888; padding:30px;">만들어진 플레이리스트가 없습니다.<br>위 버튼을 눌러 새 플레이리스트를 만들어보세요!</p>';
    return;
  }
  myPlaylists.forEach((playlist, index) => {
    const plDiv = document.createElement('div');
    plDiv.className = 'playlist-item';
    plDiv.innerHTML = `
      <div class="track-info" style="display:flex; align-items:center;">
        <span style="font-size:24px; margin-right:15px;">📁</span>
        <div>
          <h3>${playlist.name}</h3>
          <p>${playlist.tracks.length}곡</p>
        </div>
      </div>
      <button class="option-btn" style="color:red; font-size:14px;">삭제</button>
    `;
    plDiv.querySelector('.track-info').onclick = () => openPlaylistDetail(index);
    plDiv.querySelector('.option-btn').onclick = (e) => {
      e.stopPropagation();
      if (confirm(`'${playlist.name}' 플레이리스트를 정말 삭제할까요?`)) {
        myPlaylists.splice(index, 1); 
        savePlaylists(); 
        renderPlaylists(); 
      }
    };
    playlistContainer.appendChild(plDiv);
  });
}

function openPlaylistDetail(playlistIndex) {
  const playlist = myPlaylists[playlistIndex];
  playlistView.classList.remove('active');
  playlistDetailView.classList.add('active');
  detailTitle.textContent = playlist.name;
  detailCount.textContent = `${playlist.tracks.length}곡`;
  detailTrackList.innerHTML = '';
  
  if (playlist.tracks.length === 0) {
    detailTrackList.innerHTML = '<p style="text-align:center; padding:30px; color:#888;">이 플레이리스트는 비어있습니다.</p>';
  } else {
    playlist.tracks.forEach((trackIndex) => {
      const track = tracks[trackIndex];
      const trackDiv = document.createElement('div');
      trackDiv.className = 'track-item';
      trackDiv.innerHTML = `
        <div class="track-info">
          <h3>${track.title}</h3>
          <p>${track.description}</p>
        </div>
        <button class="option-btn">⋮</button>
      `;
      trackDiv.querySelector('.track-info').onclick = () => {
        // ⭐️ 플리에서 누를 때도 셔플 강제 해제
        isShuffle = false;
        shuffleBtn.classList.remove('active');
        originalQueue = [];

        customQueue = [...playlist.tracks]; 
        queueCursor = playlist.tracks.indexOf(trackIndex); 
        loadAndPlay(customQueue[queueCursor]);
        renderQueue(); 
      };
      trackDiv.querySelector('.option-btn').onclick = () => openOptionMenu(trackIndex);
      detailTrackList.appendChild(trackDiv);
    });
  }

  playAllBtn.onclick = () => {
    if (playlist.tracks.length === 0) { alert("재생할 곡이 없습니다."); return; }
    
    // ⭐️ 전체 재생 시에도 셔플 해제
    isShuffle = false;
    shuffleBtn.classList.remove('active');
    originalQueue = [];

    customQueue = [...playlist.tracks]; 
    queueCursor = 0; 
    loadAndPlay(customQueue[queueCursor]);
    renderQueue();
  };
}

backToPlaylistBtn.onclick = () => {
  playlistDetailView.classList.remove('active');
  playlistView.classList.add('active');
};

loadPlaylists();
loadTracks();