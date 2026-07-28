const trackListContainer = document.getElementById('trackList');
const playlistView = document.getElementById('playlistView'); // ⭐️ 추가됨
const tabAll = document.getElementById('tabAll'); // ⭐️ 추가됨
const tabPlaylist = document.getElementById('tabPlaylist'); // ⭐️ 추가됨

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

// ⭐️ 방금 추가한 플레이리스트 선택 팝업 요소들 가져오기
const playlistSelectOverlay = document.getElementById('playlistSelectOverlay');
const playlistSelectMenu = document.getElementById('playlistSelectMenu');
const playlistSelectList = document.getElementById('playlistSelectList');
const playlistSelectCloseBtn = document.getElementById('playlistSelectCloseBtn');

function closePlaylistSelectMenu() {
  playlistSelectOverlay.classList.add('hidden');
  playlistSelectMenu.classList.add('hidden');
}
playlistSelectOverlay.onclick = closePlaylistSelectMenu;
playlistSelectCloseBtn.onclick = closePlaylistSelectMenu;

// ⭐️ 탭 전환 기능 로직 추가
tabAll.onclick = () => {
  tabAll.classList.add('active');
  tabPlaylist.classList.remove('active');
  trackListContainer.classList.add('active'); // 전체 곡 화면 보이기
  playlistView.classList.remove('active'); // 플레이리스트 화면 숨기기
  searchInput.style.display = 'block'; // 검색창 켜기
};

tabPlaylist.onclick = () => {
  tabPlaylist.classList.add('active');
  tabAll.classList.remove('active');
  playlistView.classList.add('active'); // 플레이리스트 화면 보이기
  trackListContainer.classList.remove('active'); // 전체 곡 화면 숨기기
  searchInput.style.display = 'none'; // 검색창 끄기
};

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
  if (selectedTrackIndex === -1) return;

  // 1. 기존 옵션 메뉴 닫기
  closeOptionMenu();

  // 2. 만들어둔 플레이리스트가 없으면 알림 띄우기
  if (myPlaylists.length === 0) {
    alert("만들어진 플레이리스트가 없습니다. [내 플레이리스트] 탭에서 먼저 만들어주세요!");
    return;
  }

  // 3. 내 플레이리스트 폴더 목록을 팝업에 그리기
  playlistSelectList.innerHTML = '';
  myPlaylists.forEach((playlist, plIndex) => {
    const li = document.createElement('li');
    li.textContent = `📁 ${playlist.name} (${playlist.tracks.length}곡)`;
    
    // 폴더를 클릭하면 그 안에 곡 집어넣기
    li.onclick = () => {
      // 이미 들어있는 곡인지 중복 체크
      if (playlist.tracks.includes(selectedTrackIndex)) {
        alert("이미 이 플레이리스트에 들어있는 곡입니다.");
      } else {
        playlist.tracks.push(selectedTrackIndex); // 곡 번호 추가
        savePlaylists(); // LocalStorage에 저장
        renderPlaylists(); // 폴더 곡 수 업데이트
        alert(`'${playlist.name}'에 곡이 추가되었습니다!`);
      }
      closePlaylistSelectMenu();
    };
    playlistSelectList.appendChild(li);
  });

  // 4. 팝업 띄우기
  playlistSelectOverlay.classList.remove('hidden');
  playlistSelectMenu.classList.remove('hidden');
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

// 플레이리스트를 저장할 변수 (배열 안에 객체가 들어가는 구조)
let myPlaylists = [];

// 요소 가져오기
const playlistContainer = document.getElementById('playlistContainer');
const createNewPlaylistBtn = document.getElementById('createNewPlaylistBtn');

// 1. LocalStorage에서 플레이리스트 데이터 불러오기
function loadPlaylists() {
  const savedData = localStorage.getItem('maple_playlists');
  if (savedData) {
    myPlaylists = JSON.parse(savedData);
  } else {
    myPlaylists = [];
  }
  renderPlaylists();
}

// 2. LocalStorage에 데이터 저장하기 (바뀔 때마다 실행)
function savePlaylists() {
  localStorage.setItem('maple_playlists', JSON.stringify(myPlaylists));
}

// 3. 새 플레이리스트 만들기 버튼 클릭 시
createNewPlaylistBtn.onclick = () => {
  const title = prompt("새 플레이리스트의 이름을 입력하세요:");
  
  if (title === null || title.trim() === "") return; // 취소하거나 빈 칸이면 무시

  // 새로운 폴더 객체 생성 (곡은 아직 비어있음)
  const newPlaylist = {
    id: Date.now(), // 고유 번호 (생성 시간 기준)
    name: title.trim(),
    tracks: [] // 곡의 Index 번호를 저장할 배열
  };

  myPlaylists.push(newPlaylist);
  savePlaylists(); // 저장
  renderPlaylists(); // 화면 다시 그리기
};

// 4. 플레이리스트 목록 화면에 그리기
function renderPlaylists() {
  playlistContainer.innerHTML = '';

  if (myPlaylists.length === 0) {
    playlistContainer.innerHTML = '<p style="text-align:center; color:#888; padding:30px;">만들어진 플레이리스트가 없습니다.<br>위 버튼을 눌러 새 플레이리스트를 만들어보세요!</p>';
    return;
  }

  myPlaylists.forEach((playlist, index) => {
    const plDiv = document.createElement('div');
    plDiv.className = 'playlist-item';

    // 화면 구조: 폴더 아이콘 + 이름/곡 수 + 삭제 버튼
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

    // 폴더를 클릭했을 때 (나중에 4단계에서 구현할 영역)
    plDiv.querySelector('.track-info').onclick = () => {
      alert(`'${playlist.name}' 안으로 들어가는 기능은 다음 단계에서 만들게요!`);
    };

    // 우측 삭제 버튼 클릭 시
    plDiv.querySelector('.option-btn').onclick = (e) => {
      e.stopPropagation(); // 폴더 클릭 이벤트가 같이 실행되는 것 방지
      const confirmDelete = confirm(`'${playlist.name}' 플레이리스트를 정말 삭제할까요?`);
      if (confirmDelete) {
        myPlaylists.splice(index, 1); // 배열에서 삭제
        savePlaylists(); // 변경사항 저장
        renderPlaylists(); // 화면 다시 그리기
      }
    };

    playlistContainer.appendChild(plDiv);
  });
}

// 앱 시작 시 플레이리스트 데이터도 같이 불러오기
loadPlaylists();

loadTracks();