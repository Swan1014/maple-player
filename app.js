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
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
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

// ⭐️ 태그 팝업 요소들
const tagEditOverlay = document.getElementById('tagEditOverlay');
const tagEditMenu = document.getElementById('tagEditMenu');
const tagEditTitle = document.getElementById('tagEditTitle');
const tagCheckList = document.getElementById('tagCheckList');
const newTagColor = document.getElementById('newTagColor');
const newTagName = document.getElementById('newTagName');
const createNewTagBtn = document.getElementById('createNewTagBtn');
const tagEditCloseBtn = document.getElementById('tagEditCloseBtn');

let tracks = [];
let customQueue = []; 
let queueCursor = -1; 
let audioCtx = null;

let selectedTrackIndex = -1;
let selectedQueuePos = -1; 
let myPlaylists = [];
let isShuffle = false;
let originalQueue = []; 
let repeatMode = 0;

let currentOpenedPlaylistIndex = -1; // 팝업 닫을 때 화면 갱신용

// ⭐️ 커스텀 태그 데이터 구조 (장부)
let customTags = [];
let currentTaggingTrackTitle = ''; // 현재 태그 작업 중인 곡 제목

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

// ⭐️ 태그 데이터 불러오기/저장하기
function loadCustomTags() {
  const savedData = localStorage.getItem('maple_tags');
  customTags = savedData ? JSON.parse(savedData) : [];
}
function saveCustomTags() {
  localStorage.setItem('maple_tags', JSON.stringify(customTags));
}

// ⭐️ 향상된 검색 함수 (태그 장부까지 뒤짐)
function applySearch() {
  const query = searchInput.value.toLowerCase();
  const filteredTracks = tracks.filter(track => {
    const matchTitle = track.title.toLowerCase().includes(query);
    const matchDesc = track.description.toLowerCase().includes(query);
    const matchBaseTag = track.tags.some(tag => tag.toLowerCase().includes(query));
    
    // 이 곡이 속한 커스텀 태그 중 검색어와 일치하는 게 있는지 확인!
    const matchCustomTag = customTags.some(customTag => 
      customTag.tracks.includes(track.title) && customTag.name.toLowerCase().includes(query)
    );

    return matchTitle || matchDesc || matchBaseTag || matchCustomTag;
  });
  renderTracks(filteredTracks);
}

searchInput.addEventListener('input', applySearch);

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

shuffleBtn.onclick = () => {
  if (customQueue.length === 0) return; 
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
  if (isShuffle) {
    originalQueue = [...customQueue];
    const currentTrackId = customQueue[queueCursor];
    const remainingTracks = customQueue.filter((_, index) => index !== queueCursor);
    shuffleArray(remainingTracks);
    customQueue = [currentTrackId, ...remainingTracks];
    queueCursor = 0; 
  } else {
    const currentTrackId = customQueue[queueCursor];
    customQueue = [...originalQueue]; 
    queueCursor = customQueue.findIndex(id => id === currentTrackId);
    originalQueue = []; 
  }
  renderQueue(); 
};

repeatBtn.onclick = () => {
  repeatMode = (repeatMode + 1) % 3;
  if (repeatMode === 0) { repeatBtn.textContent = '🔁'; repeatBtn.classList.remove('active'); } 
  else if (repeatMode === 1) { repeatBtn.textContent = '🔁'; repeatBtn.classList.add('active'); } 
  else if (repeatMode === 2) { repeatBtn.textContent = '🔂'; repeatBtn.classList.add('active'); }
};

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

currentAudio.addEventListener('play', () => { playBtn.textContent = '⏸️'; keepAudioAlive(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });
currentAudio.addEventListener('pause', () => { playBtn.textContent = '▶️'; if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
currentAudio.addEventListener('ended', () => {
  if (repeatMode === 2 && customQueue.length > 0) { currentAudio.currentTime = 0; currentAudio.play().catch(e => console.error(e)); } 
  else { playNext(); }
});

nowPlayingArea.onclick = () => { bottomSheet.classList.toggle('expanded'); };

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

function closeOptionMenu() { optionOverlay.classList.add('hidden'); optionMenu.classList.add('hidden'); }
optionOverlay.onclick = closeOptionMenu; optionCloseBtn.onclick = closeOptionMenu;

function closePlaylistSelectMenu() { playlistSelectOverlay.classList.add('hidden'); playlistSelectMenu.classList.add('hidden'); }
playlistSelectOverlay.onclick = closePlaylistSelectMenu; playlistSelectCloseBtn.onclick = closePlaylistSelectMenu;

// ⭐️ 태그 팝업 열기 & 로직
optEditTag.onclick = () => {
  if (selectedTrackIndex === -1) return;
  const track = tracks[selectedTrackIndex];
  currentTaggingTrackTitle = track.title; // 현재 곡 기억
  tagEditTitle.textContent = `'${track.title}' 태그 편집`;
  
  closeOptionMenu();
  renderTagCheckList();
  
  tagEditOverlay.classList.remove('hidden');
  tagEditMenu.classList.remove('hidden');
};

function closeTagEditMenu() {
  tagEditOverlay.classList.add('hidden');
  tagEditMenu.classList.add('hidden');
  
  // 팝업 닫을 때 화면 갱신 (메인 화면이냐 플레이리스트 상세 화면이냐에 따라 다르게)
  if (playlistDetailView.classList.contains('active')) {
    openPlaylistDetail(currentOpenedPlaylistIndex);
  } else {
    applySearch(); 
  }
}
tagEditOverlay.onclick = closeTagEditMenu;
tagEditCloseBtn.onclick = closeTagEditMenu;

// ⭐️ 태그 리스트 그리기
function renderTagCheckList() {
  tagCheckList.innerHTML = '';
  if (customTags.length === 0) {
    tagCheckList.innerHTML = '<li style="color:#888; justify-content:center;">만들어진 커스텀 태그가 없습니다.</li>';
  }
  
  customTags.forEach(tag => {
    const li = document.createElement('li');
    const isChecked = tag.tracks.includes(currentTaggingTrackTitle);
    
    li.innerHTML = `
      <div class="tag-label">
        <div class="tag-color-dot" style="background-color: ${tag.color};"></div>
        <span>${tag.name}</span>
      </div>
      <div style="display:flex; align-items:center; gap:15px;">
        <input type="checkbox" class="tag-checkbox" ${isChecked ? 'checked' : ''}>
        <button class="delete-tag-btn" style="background:none; border:none; color:#ff4444; font-size:18px; cursor:pointer;">✖</button>
      </div>
    `;
    
    // 1. 체크박스 껐다 켜기 로직
    li.querySelector('.tag-checkbox').onchange = (e) => {
      if (e.target.checked) { tag.tracks.push(currentTaggingTrackTitle); } 
      else { tag.tracks = tag.tracks.filter(t => t !== currentTaggingTrackTitle); }
      saveCustomTags();
    };
    
    // 2. 태그 완전 삭제 버튼
    li.querySelector('.delete-tag-btn').onclick = () => {
      if(confirm(`'${tag.name}' 태그를 완전히 삭제할까요?`)) {
        customTags = customTags.filter(t => t.id !== tag.id);
        saveCustomTags();
        renderTagCheckList();
      }
    };
    
    tagCheckList.appendChild(li);
  });
}

// ⭐️ 새 태그 만들기 버튼
createNewTagBtn.onclick = () => {
  const name = newTagName.value.trim();
  const color = newTagColor.value;
  
  if (!name) return;
  if (customTags.some(t => t.name === name)) {
    alert("이미 존재하는 태그 이름입니다.");
    return;
  }
  
  customTags.push({
    id: Date.now(),
    name: name,
    color: color,
    tracks: [currentTaggingTrackTitle] // 만들자마자 바로 이 곡에 소속시킴 (UX 디테일!)
  });
  
  saveCustomTags();
  newTagName.value = ''; 
  renderTagCheckList(); 
};

optPlayNext.onclick = () => {
  if (selectedTrackIndex !== -1) {
    if (customQueue.length === 0) {
      customQueue.push(selectedTrackIndex); queueCursor = 0; loadAndPlay(customQueue[queueCursor]);
    } else { customQueue.splice(queueCursor + 1, 0, selectedTrackIndex); }
    if (isShuffle && originalQueue.length > 0) originalQueue.push(selectedTrackIndex); 
    renderQueue();
  }
  closeOptionMenu();
};

optPlayLast.onclick = () => {
  if (selectedTrackIndex !== -1) {
    if (customQueue.length === 0) {
      customQueue.push(selectedTrackIndex); queueCursor = 0; loadAndPlay(customQueue[queueCursor]);
    } else { customQueue.push(selectedTrackIndex); }
    if (isShuffle && originalQueue.length > 0) originalQueue.push(selectedTrackIndex); 
    renderQueue();
  }
  closeOptionMenu();
};

optRemoveQueue.onclick = () => {
  if (selectedQueuePos !== -1) {
    const removingTrackId = customQueue[selectedQueuePos];
    customQueue.splice(selectedQueuePos, 1); 
    if (isShuffle && originalQueue.length > 0) {
      const orgIdx = originalQueue.indexOf(removingTrackId);
      if (orgIdx !== -1) originalQueue.splice(orgIdx, 1);
    }
    if (selectedQueuePos < queueCursor) { queueCursor--; } 
    else if (selectedQueuePos === queueCursor) {
      if (customQueue.length === 0) { pausePlayback(); queueCursor = -1; currentTitle.textContent = "재생 중인 곡이 없습니다"; } 
      else {
        if (queueCursor >= customQueue.length) { pausePlayback(); queueCursor = -1; currentTitle.textContent = "재생 중인 곡이 없습니다"; } 
        else { loadAndPlay(customQueue[queueCursor]); }
      }
    }
    renderQueue();
  }
  closeOptionMenu();
};

optAddPlaylist.onclick = () => {
  if (selectedTrackIndex === -1) return;
  closeOptionMenu();
  if (myPlaylists.length === 0) { alert("만들어진 플레이리스트가 없습니다. [내 플레이리스트] 탭에서 먼저 만들어주세요!"); return; }
  playlistSelectList.innerHTML = '';
  myPlaylists.forEach((playlist) => {
    const li = document.createElement('li');
    li.textContent = `📁 ${playlist.name} (${playlist.tracks.length}곡)`;
    li.onclick = () => {
      if (playlist.tracks.includes(selectedTrackIndex)) { alert("이미 이 플레이리스트에 들어있는 곡입니다."); } 
      else { playlist.tracks.push(selectedTrackIndex); savePlaylists(); renderPlaylists(); alert(`'${playlist.name}'에 곡이 추가되었습니다!`); }
      closePlaylistSelectMenu();
    };
    playlistSelectList.appendChild(li);
  });
  playlistSelectOverlay.classList.remove('hidden');
  playlistSelectMenu.classList.remove('hidden');
};

let draggingElement = null;
function renderQueue() {
  queueList.innerHTML = '';
  if (customQueue.length === 0) { queueList.innerHTML = '<div class="empty-queue">대기열이 비어있습니다.</div>'; return; }
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
      e.preventDefault(); draggingElement = qDiv; draggingElement.classList.add('dragging');
      if (e.type === 'mousedown') { document.addEventListener('mousemove', dragMove, { passive: false }); document.addEventListener('mouseup', dragEnd); }
    };
    const dragMove = (e) => {
      if (!draggingElement) return; e.preventDefault();
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      const siblings = [...queueList.querySelectorAll('.queue-item:not(.dragging)')];
      let nextSibling = siblings.find(sibling => { const rect = sibling.getBoundingClientRect(); return clientY < rect.top + rect.height / 2; });
      queueList.insertBefore(draggingElement, nextSibling);
    };
    const dragEnd = (e) => {
      if (!draggingElement) return; draggingElement.classList.remove('dragging');
      if (e.type === 'mouseup') { document.removeEventListener('mousemove', dragMove); document.removeEventListener('mouseup', dragEnd); }
      const newQueue = []; let newCursor = -1; const items = queueList.querySelectorAll('.queue-item');
      items.forEach((item, index) => { const oldPos = parseInt(item.dataset.pos); newQueue.push(customQueue[oldPos]); if (oldPos === queueCursor) newCursor = index; });
      customQueue = newQueue; queueCursor = newCursor; draggingElement = null; renderQueue(); 
    };
    dragHandle.addEventListener('touchstart', dragStart, { passive: false }); dragHandle.addEventListener('touchmove', dragMove, { passive: false }); dragHandle.addEventListener('touchend', dragEnd); dragHandle.addEventListener('mousedown', dragStart);
    queueList.appendChild(qDiv);
  });
}

clearQueueBtn.onclick = () => {
  customQueue = []; queueCursor = -1; isShuffle = false; shuffleBtn.classList.remove('active'); originalQueue = [];
  pausePlayback(); currentTitle.textContent = "재생 중인 곡이 없습니다"; renderQueue();
};

function jumpToQueueTrack(queuePosition) { queueCursor = queuePosition; bottomSheet.classList.remove('expanded'); loadAndPlay(customQueue[queueCursor]); renderQueue(); }

async function loadTracks() {
  try {
    const response = await fetch('data.json');
    tracks = await response.json();
    applySearch(); // 초기 렌더링을 검색 함수를 통해 호출 (장부 연동)
  } catch (error) { console.error("데이터 불러오기 실패:", error); }
}

// ⭐️ 뱃지를 포함한 리스트 렌더링
function renderTracks(trackArray) {
  trackListContainer.innerHTML = ''; 
  if (trackArray.length === 0) { trackListContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">검색 결과가 없습니다 😢</p>'; return; }
  
  trackArray.forEach((track) => {
    const trackDiv = document.createElement('div');
    trackDiv.className = 'track-item';
    
    // 1. 기본 태그 뱃지 만들기 (회색)
    let tagsHTML = track.tags.map(tag => 
      `<span class="tag-badge" style="background-color: #aaa;" data-tag="${tag}">${tag}</span>`
    ).join('');

    // 2. 이 곡이 속한 내 커스텀 태그 뱃지 만들기 (지정한 색상)
    const myTags = customTags.filter(ct => ct.tracks.includes(track.title));
    myTags.forEach(ct => {
      tagsHTML += `<span class="tag-badge" style="background-color: ${ct.color};" data-tag="${ct.name}">${ct.name}</span>`;
    });

    trackDiv.innerHTML = `
      <div class="track-info">
        <h3>${track.title}</h3>
        <p>${track.description}</p>
        <div class="track-tags">${tagsHTML}</div>
      </div>
      <button class="option-btn">⋮</button>
    `;
    
    // 3. 태그를 클릭했을 때 검색창으로 점프!
    trackDiv.querySelectorAll('.tag-badge').forEach(badge => {
      badge.onclick = (e) => {
        e.stopPropagation(); // 곡 재생 방지
        tabAll.click(); // 무조건 전체 탭으로 이동해서 필터링
        searchInput.value = badge.dataset.tag;
        applySearch(); // 즉시 검색 실행
        window.scrollTo(0, 0); // 화면 맨 위로
      };
    });

    trackDiv.querySelector('.track-info').onclick = () => {
      isShuffle = false; shuffleBtn.classList.remove('active'); originalQueue = [];
      customQueue = [tracks.findIndex(t => t.title === track.title)]; 
      queueCursor = 0; loadAndPlay(customQueue[queueCursor]); renderQueue(); 
    };
    trackDiv.querySelector('.option-btn').onclick = () => openOptionMenu(tracks.findIndex(t => t.title === track.title));
    trackListContainer.appendChild(trackDiv);
  });
}

function loadAndPlay(index) {
  const track = tracks[index]; keepAudioAlive(); currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play().catch(e => console.error("재생 실패:", e)); currentTitle.textContent = track.title; updateMediaSession(track);
}

function playNext() {
  if (customQueue.length > 0) {
    if (queueCursor < customQueue.length - 1) { queueCursor++; loadAndPlay(customQueue[queueCursor]); renderQueue(); } 
    else { if (repeatMode === 1) { queueCursor = 0; loadAndPlay(customQueue[queueCursor]); renderQueue(); } else { pausePlayback(); } }
  } else { pausePlayback(); }
}

function playPrev() {
  if (customQueue.length === 0) return;
  if (currentAudio.currentTime > 3) { currentAudio.currentTime = 0; return; }
  if (queueCursor > 0) { queueCursor--; loadAndPlay(customQueue[queueCursor]); renderQueue(); } 
  else { if (repeatMode === 1) { queueCursor = customQueue.length - 1; loadAndPlay(customQueue[queueCursor]); renderQueue(); } else { currentAudio.currentTime = 0; } }
}

function pausePlayback() { currentAudio.pause(); currentAudio.currentTime = 0; playBtn.textContent = '▶️'; if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; }

function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: '메이플스토리 BGM' });
    navigator.mediaSession.setActionHandler('play', async () => { keepAudioAlive(); const saveTime = currentAudio.currentTime; try { await currentAudio.play(); currentAudio.currentTime = saveTime; } catch (error) { currentAudio.load(); currentAudio.currentTime = saveTime; currentAudio.play(); } });
    navigator.mediaSession.setActionHandler('pause', () => currentAudio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', playPrev); navigator.mediaSession.setActionHandler('nexttrack', playNext);
  }
}

function togglePlay() { if (customQueue.length === 0) return; if (currentAudio.paused) { keepAudioAlive(); currentAudio.play().catch(e => console.error(e)); } else { currentAudio.pause(); } }

playBtn.onclick = togglePlay; prevBtn.onclick = playPrev; nextBtn.onclick = playNext;

const playlistContainer = document.getElementById('playlistContainer');
const createNewPlaylistBtn = document.getElementById('createNewPlaylistBtn');

function loadPlaylists() { const savedData = localStorage.getItem('maple_playlists'); myPlaylists = savedData ? JSON.parse(savedData) : []; renderPlaylists(); }
function savePlaylists() { localStorage.setItem('maple_playlists', JSON.stringify(myPlaylists)); }

createNewPlaylistBtn.onclick = () => {
  const title = prompt("새 플레이리스트의 이름을 입력하세요:");
  if (title === null || title.trim() === "") return;
  myPlaylists.push({ id: Date.now(), name: title.trim(), tracks: [] });
  savePlaylists(); renderPlaylists(); 
};

function renderPlaylists() {
  playlistContainer.innerHTML = '';
  if (myPlaylists.length === 0) { playlistContainer.innerHTML = '<p style="text-align:center; color:#888; padding:30px;">만들어진 플레이리스트가 없습니다.</p>'; return; }
  myPlaylists.forEach((playlist, index) => {
    const plDiv = document.createElement('div'); plDiv.className = 'playlist-item';
    plDiv.innerHTML = `
      <div class="track-info" style="display:flex; align-items:center;">
        <span style="font-size:24px; margin-right:15px;">📁</span>
        <div><h3>${playlist.name}</h3><p>${playlist.tracks.length}곡</p></div>
      </div>
      <button class="option-btn" style="color:red; font-size:14px;">삭제</button>
    `;
    plDiv.querySelector('.track-info').onclick = () => openPlaylistDetail(index);
    plDiv.querySelector('.option-btn').onclick = (e) => {
      e.stopPropagation(); if (confirm(`'${playlist.name}' 플레이리스트를 정말 삭제할까요?`)) { myPlaylists.splice(index, 1); savePlaylists(); renderPlaylists(); }
    };
    playlistContainer.appendChild(plDiv);
  });
}

function openPlaylistDetail(playlistIndex) {
  currentOpenedPlaylistIndex = playlistIndex;
  const playlist = myPlaylists[playlistIndex];
  playlistView.classList.remove('active'); playlistDetailView.classList.add('active');
  detailTitle.textContent = playlist.name; detailCount.textContent = `${playlist.tracks.length}곡`; detailTrackList.innerHTML = '';
  
  if (playlist.tracks.length === 0) { detailTrackList.innerHTML = '<p style="text-align:center; padding:30px; color:#888;">비어있습니다.</p>'; } 
  else {
    playlist.tracks.forEach((trackIndex) => {
      const track = tracks[trackIndex]; const trackDiv = document.createElement('div'); trackDiv.className = 'track-item';
      
      // ⭐️ 상세 화면에서도 뱃지 출력 & 클릭 검색 지원!
      let tagsHTML = track.tags.map(tag => `<span class="tag-badge" style="background-color: #aaa;" data-tag="${tag}">${tag}</span>`).join('');
      const myTags = customTags.filter(ct => ct.tracks.includes(track.title));
      myTags.forEach(ct => { tagsHTML += `<span class="tag-badge" style="background-color: ${ct.color};" data-tag="${ct.name}">${ct.name}</span>`; });

      trackDiv.innerHTML = `
        <div class="track-info">
          <h3>${track.title}</h3><p>${track.description}</p>
          <div class="track-tags">${tagsHTML}</div>
        </div>
        <button class="option-btn">⋮</button>
      `;

      trackDiv.querySelectorAll('.tag-badge').forEach(badge => {
        badge.onclick = (e) => { e.stopPropagation(); tabAll.click(); searchInput.value = badge.dataset.tag; applySearch(); window.scrollTo(0, 0); };
      });

      trackDiv.querySelector('.track-info').onclick = () => {
        isShuffle = false; shuffleBtn.classList.remove('active'); originalQueue = [];
        customQueue = [...playlist.tracks]; queueCursor = playlist.tracks.indexOf(trackIndex); loadAndPlay(customQueue[queueCursor]); renderQueue(); 
      };
      trackDiv.querySelector('.option-btn').onclick = () => openOptionMenu(trackIndex);
      detailTrackList.appendChild(trackDiv);
    });
  }
  playAllBtn.onclick = () => {
    if (playlist.tracks.length === 0) { alert("재생할 곡이 없습니다."); return; }
    isShuffle = false; shuffleBtn.classList.remove('active'); originalQueue = [];
    customQueue = [...playlist.tracks]; queueCursor = 0; loadAndPlay(customQueue[queueCursor]); renderQueue();
  };
}

backToPlaylistBtn.onclick = () => { playlistDetailView.classList.remove('active'); playlistView.classList.add('active'); };

loadCustomTags();
loadPlaylists();
loadTracks();