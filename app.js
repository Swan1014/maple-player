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
const optRemoveFromPlaylist = document.getElementById('optRemoveFromPlaylist');
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

const createPlaylistDialog = document.getElementById('createPlaylistDialog');
const createPlaylistInput = document.getElementById('createPlaylistInput');
const createPlaylistCancelBtn = document.getElementById('createPlaylistCancelBtn');
const createPlaylistConfirmBtn = document.getElementById('createPlaylistConfirmBtn');

const restoreDialog = document.getElementById('restoreDialog');
const restoreCancelBtn = document.getElementById('restoreCancelBtn');
const restoreConfirmBtn = document.getElementById('restoreConfirmBtn');
const searchBarContainer = document.getElementById('searchBarContainer');
const playAllShuffleBtn = document.getElementById('playAllShuffleBtn');
const playAllShufflePlaylistBtn = document.getElementById('playAllShufflePlaylistBtn');

const tagDeleteDialog = document.getElementById('tagDeleteDialog');
const tagDeleteConfirmText = document.getElementById('tagDeleteConfirmText');
const tagDeleteCancelBtn = document.getElementById('tagDeleteCancelBtn');
const tagDeleteConfirmBtn = document.getElementById('tagDeleteConfirmBtn');

const clearSearchBtn = document.getElementById('clearSearchBtn');

let currentDisplayedTracks = []; // ⭐️ 현재 화면에 보이는(검색된) 곡들을 기억할 장부

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
  tabAll.classList.add('active'); tabPlaylist.classList.remove('active');
  trackListContainer.classList.add('active'); playlistView.classList.remove('active'); playlistDetailView.classList.remove('active');
  searchBarContainer.style.display = 'flex'; // ⭐️ block에서 flex로, searchInput에서 Container로 변경!
};

tabPlaylist.onclick = () => {
  tabPlaylist.classList.add('active'); tabAll.classList.remove('active');
  playlistView.classList.add('active'); trackListContainer.classList.remove('active'); playlistDetailView.classList.remove('active');
  searchBarContainer.style.display = 'none'; // ⭐️ Container 숨기기
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
  // 유저가 입력한 검색어에서 공백(\s)과 콜론(:)을 모두 제거
  const rawQuery = searchInput.value.toLowerCase();
  const cleanQuery = rawQuery.replace(/[\s:]/g, '');

  const filteredTracks = tracks.filter(track => {
    // 원본 데이터(제목, 설명)에서도 공백과 콜론을 제거 후 비교
    const cleanTitle = track.title.toLowerCase().replace(/[\s:]/g, '');
    const cleanDesc = track.description.toLowerCase().replace(/[\s:]/g, '');
    
    // 기본 태그도 띄어쓰기 무시
    const matchBaseTag = track.tags.some(tag => 
      tag.toLowerCase().replace(/[\s:]/g, '').includes(cleanQuery)
    );
    
    // 커스텀 태그도 띄어쓰기 무시
    const matchCustomTag = customTags.some(customTag => 
      customTag.tracks.includes(track.title) && 
      customTag.name.toLowerCase().replace(/[\s:]/g, '').includes(cleanQuery)
    );

    return cleanTitle.includes(cleanQuery) || 
           cleanDesc.includes(cleanQuery) || 
           matchBaseTag || 
           matchCustomTag;
  });
  
  currentDisplayedTracks = filteredTracks;
  renderTracks(filteredTracks);
}

playAllShuffleBtn.onclick = () => {
  if (currentDisplayedTracks.length === 0) {
    showToast("재생할 곡이 없습니다.");
    return;
  }

  // 1. 현재 화면에 보이는 곡들의 원본 번호(index)를 찾아 배열로 만듦
  const targetIndices = currentDisplayedTracks.map(t => tracks.findIndex(orig => orig.title === t.title));

  // 2. 셔플 모드 강제 켜기 (하단 플레이어 바의 셔플 버튼도 주황색으로 불 들어오게 연동!)
  isShuffle = true;
  shuffleBtn.classList.add('active');

  // 3. 대기열 백업 (나중에 셔플 풀 때 돌아갈 원래 순서)
  originalQueue = [...targetIndices];
  
  // 4. 셔플 적용 (위에서 만들어뒀던 shuffleArray 함수 사용)
  let shuffled = [...targetIndices];
  shuffleArray(shuffled);
  
  // 5. 대기열 덮어쓰고 재생!
  customQueue = shuffled;
  queueCursor = 0; // 첫 번째 곡부터 시작

  loadAndPlay(customQueue[queueCursor]);
  renderQueue();
  
  showToast(`검색된 ${customQueue.length}곡이 셔플 재생됩니다.`);
};

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

function openOptionMenu(trackIndex, queuePos = -1, isFromPlaylist = false) {
  selectedTrackIndex = trackIndex;
  selectedQueuePos = queuePos;
  const track = tracks[trackIndex];
  
  optionTitle.textContent = track.title;
  optionDesc.textContent = track.description;
  
  const optionIcon = document.getElementById('optionIcon');
  if (track.icon) {
    optionIcon.src = `assets/icon/${track.icon}`;
    optionIcon.style.display = 'block';
  } else {
    optionIcon.style.display = 'none';
  }

  // ⭐️ 상황에 맞게 버튼 숨기고 켜기
  optRemoveQueue.style.display = queuePos === -1 ? 'none' : 'block';
  optRemoveFromPlaylist.style.display = isFromPlaylist ? 'block' : 'none';

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
tagEditCloseBtn.onclick = () => {
  closeTagEditMenu();
  showToast("태그 편집이 완료되었습니다.");
};

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
    
    // 2. ⭐️ 태그 완전 삭제 버튼 (브라우저 기본 팝업 -> 커스텀 팝업으로 교체!)
    li.querySelector('.delete-tag-btn').onclick = () => {
      
      // ① 먼저 우리가 만든 예쁜 팝업을 띄운다
      tagDeleteConfirmText.innerHTML = `'<strong>${tag.name}</strong>' 태그를 완전히 삭제할까요?<br>이 작업은 되돌릴 수 없습니다.`;
      customDialogOverlay.classList.remove('hidden');
      tagDeleteDialog.classList.remove('hidden');
      
      // ② 팝업 안의 '삭제' 버튼을 눌렀을 때 진짜로 삭제되게 연결!
      tagDeleteConfirmBtn.onclick = () => {
        customTags = customTags.filter(t => t.id !== tag.id); // 태그 데이터 날리기
        saveCustomTags(); // 장부에 저장
        renderTagCheckList(); // 화면 다시 그리기
        showToast("태그가 삭제되었습니다."); // ⭐️ 성공 토스트 알림!
        closeCustomDialogs(); // 팝업 닫기
      };
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
    showToast("곡이 다음에 재생됩니다.");
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
    showToast("곡이 마지막에 재생됩니다.");
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

optRemoveFromPlaylist.onclick = () => {
  // 현재 열려있는 플레이리스트가 있고, 선택된 곡이 정상일 때만 실행
  if (currentOpenedPlaylistIndex !== -1 && selectedTrackIndex !== -1) {
    const playlist = myPlaylists[currentOpenedPlaylistIndex];
    
    // 플레이리스트 배열에서 해당 곡 번호를 찾아 삭제 (필터링)
    playlist.tracks = playlist.tracks.filter(t => t !== selectedTrackIndex);
    
    savePlaylists(); // LocalStorage에 저장
    
    // 삭제된 후의 상태로 플레이리스트 상세 화면을 다시 그림!
    openPlaylistDetail(currentOpenedPlaylistIndex);
    
    // 뒷배경에 있는 플레이리스트 목록(곡 수 표시)도 갱신
    renderPlaylists();
    showToast(`'${playlist.name}'에서 곡이 삭제되었습니다.`);
  }
  closeOptionMenu(); // 팝업 닫기
};

// ⭐️ 플레이리스트에 추가 기능 (토스트 알림으로 업그레이드!)
optAddPlaylist.onclick = () => {
  if (selectedTrackIndex === -1) return;
  closeOptionMenu();
  
  if (myPlaylists.length === 0) { 
    showToast("만들어진 플레이리스트가 없습니다."); // alert -> showToast
    return; 
  }
  
  playlistSelectList.innerHTML = '';
  myPlaylists.forEach((playlist) => {
    const li = document.createElement('li');
    li.textContent = `📁 ${playlist.name} (${playlist.tracks.length}곡)`;
    
    li.onclick = () => {
      if (playlist.tracks.includes(selectedTrackIndex)) { 
        showToast("이미 이 플레이리스트에 들어있는 곡입니다."); // alert -> showToast
      } else { 
        playlist.tracks.push(selectedTrackIndex); 
        savePlaylists(); 
        renderPlaylists(); 
        // ⭐️ 기본 팝업(alert) 대신 우리가 만든 예쁜 토스트 팝업 띄우기!
        showToast(`'${playlist.name}'에 곡이 추가되었습니다.`); 
      }
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

    // ⭐️ 아이콘 추가
    const iconHTML = track.icon ? `<img src="assets/icon/${track.icon}" class="track-icon" onerror="this.style.display='none'">` : '';

    qDiv.innerHTML = `
      <div class="queue-info">
        ${iconHTML}
        <div class="track-text-wrap">
          <h4>${track.title}</h4>
          <p>${track.description}</p>
        </div>
      </div>
      <button class="option-btn">⋮</button>
      <div class="drag-handle">≡</div>
    `;
    qDiv.querySelector('.queue-info').onclick = () => jumpToQueueTrack(queuePosition);
    qDiv.querySelector('.option-btn').onclick = () => openOptionMenu(trackIndex, queuePosition);
    
    // 드래그 로직 유지...
    const dragHandle = qDiv.querySelector('.drag-handle');
    const dragStart = (e) => { e.preventDefault(); draggingElement = qDiv; draggingElement.classList.add('dragging'); if (e.type === 'mousedown') { document.addEventListener('mousemove', dragMove, { passive: false }); document.addEventListener('mouseup', dragEnd); } };
    const dragMove = (e) => { if (!draggingElement) return; e.preventDefault(); const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY; const siblings = [...queueList.querySelectorAll('.queue-item:not(.dragging)')]; let nextSibling = siblings.find(sibling => { const rect = sibling.getBoundingClientRect(); return clientY < rect.top + rect.height / 2; }); queueList.insertBefore(draggingElement, nextSibling); };
    const dragEnd = (e) => { if (!draggingElement) return; draggingElement.classList.remove('dragging'); if (e.type === 'mouseup') { document.removeEventListener('mousemove', dragMove); document.removeEventListener('mouseup', dragEnd); } const newQueue = []; let newCursor = -1; const items = queueList.querySelectorAll('.queue-item'); items.forEach((item, index) => { const oldPos = parseInt(item.dataset.pos); newQueue.push(customQueue[oldPos]); if (oldPos === queueCursor) newCursor = index; }); customQueue = newQueue; queueCursor = newCursor; draggingElement = null; renderQueue(); };
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
    
    let tagsHTML = track.tags.map(tag => `<span class="tag-badge" style="background-color: #aaa;" data-tag="${tag}">${tag}</span>`).join('');
    const myTags = customTags.filter(ct => ct.tracks.includes(track.title));
    myTags.forEach(ct => { tagsHTML += `<span class="tag-badge" style="background-color: ${ct.color};" data-tag="${ct.name}">${ct.name}</span>`; });

    // ⭐️ 아이콘 이미지 태그 생성
    const iconHTML = track.icon ? `<img src="assets/icon/${track.icon}" class="track-icon" onerror="this.style.display='none'">` : '';

    trackDiv.innerHTML = `
      <div class="track-info">
        ${iconHTML}
        <div class="track-text-wrap">
          <h3>${track.title}</h3>
          <p>${track.description}</p>
          <div class="track-tags">${tagsHTML}</div>
        </div>
      </div>
      <button class="option-btn">⋮</button>
    `;
    
    trackDiv.querySelectorAll('.tag-badge').forEach(badge => {
      badge.onclick = (e) => { e.stopPropagation(); tabAll.click(); searchInput.value = badge.dataset.tag; applySearch(); window.scrollTo(0, 0); };
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
  const track = tracks[index]; 
  keepAudioAlive(); 
  currentAudio.src = `assets/music/${track.filename}`;
  currentAudio.play().catch(e => console.error("재생 실패:", e)); 
  
  currentTitle.textContent = track.title; 
  // ⭐️ 재생 바 UI에 곡 설명 뜨게 연결
  document.getElementById('currentDesc').textContent = track.description || "메이플스토리 BGM"; 
  
  // ⭐️ 하단 재생 바에 아이콘 띄우기
  const currentIcon = document.getElementById('currentIcon');
  if (track.icon) {
    currentIcon.src = `assets/icon/${track.icon}`;
    currentIcon.style.display = 'block';
  } else {
    currentIcon.style.display = 'none';
  }

  updateMediaSession(track);
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
    // ⭐️ 잠금화면 위젯(앨범 커버)에 띄울 아이콘 이미지 경로 설정
    let artworkArray = [];
    if (track.icon) {
      // 모바일 OS가 이미지를 확실하게 불러오도록 절대 경로(Absolute URL)로 변환
      const iconAbsoluteUrl = new URL(`assets/icon/${track.icon}`, window.location.href).href;
      artworkArray = [
        { src: iconAbsoluteUrl, sizes: '256x256', type: 'image/png' },
        { src: iconAbsoluteUrl, sizes: '512x512', type: 'image/png' }
      ];
    }

    navigator.mediaSession.metadata = new MediaMetadata({ 
      title: track.title, 
      artist: track.description || '메이플스토리 BGM', // ⭐️ 아티스트 란에 곡 설명 넣기! (설명이 없으면 기본값)
      artwork: artworkArray // ⭐️ 아이콘(앨범 커버) 연결!
    });

    // ⭐️ 아래는 기존에 잡아둔 오류 방지 및 재생 컨트롤 로직 (건드리지 않음!)
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

function togglePlay() { if (customQueue.length === 0) return; if (currentAudio.paused) { keepAudioAlive(); currentAudio.play().catch(e => console.error(e)); } else { currentAudio.pause(); } }

playBtn.onclick = togglePlay; prevBtn.onclick = playPrev; nextBtn.onclick = playNext;

const playlistContainer = document.getElementById('playlistContainer');
const createNewPlaylistBtn = document.getElementById('createNewPlaylistBtn');

function loadPlaylists() { const savedData = localStorage.getItem('maple_playlists'); myPlaylists = savedData ? JSON.parse(savedData) : []; renderPlaylists(); }
function savePlaylists() { localStorage.setItem('maple_playlists', JSON.stringify(myPlaylists)); }

createNewPlaylistBtn.onclick = () => {
  createPlaylistInput.value = ''; // 텍스트창 비우기
  customDialogOverlay.classList.remove('hidden');
  createPlaylistDialog.classList.remove('hidden');
  setTimeout(() => createPlaylistInput.focus(), 100); // 텍스트창 자동 포커스
};

createPlaylistConfirmBtn.onclick = () => {
  const title = createPlaylistInput.value.trim();
  if (title !== "") {
    myPlaylists.push({ id: Date.now(), name: title, tracks: [] });
    savePlaylists(); 
    renderPlaylists(); 
    showToast("플레이리스트가 생성되었습니다."); // ⭐️ 토스트 띄우기!
  }
  closeCustomDialogs();
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
      <!-- ⭐️ 빨간 삭제 버튼 대신 ⋮ 옵션 버튼으로 변경 -->
      <button class="playlist-option-btn" style="background:none; border:none; font-size:20px; cursor:pointer; color:#888; padding: 10px;">⋮</button>
    `;
    
    plDiv.querySelector('.track-info').onclick = () => openPlaylistDetail(index);
    
    // ⭐️ ⋮ 버튼을 누르면 팝업 열기!
    plDiv.querySelector('.playlist-option-btn').onclick = (e) => {
      e.stopPropagation();
      editingPlaylistIndex = index; // 지금 누른 폴더 번호 기억하기
      document.getElementById('playlistEditTitle').textContent = playlist.name; // 팝업 제목을 폴더 이름으로!
      document.getElementById('playlistEditOverlay').classList.remove('hidden');
      document.getElementById('playlistEditModal').classList.remove('hidden');
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
      
      let tagsHTML = track.tags.map(tag => `<span class="tag-badge" style="background-color: #aaa;" data-tag="${tag}">${tag}</span>`).join('');
      const myTags = customTags.filter(ct => ct.tracks.includes(track.title));
      myTags.forEach(ct => { tagsHTML += `<span class="tag-badge" style="background-color: ${ct.color};" data-tag="${ct.name}">${ct.name}</span>`; });

      // ⭐️ 아이콘 추가
      const iconHTML = track.icon ? `<img src="assets/icon/${track.icon}" class="track-icon" onerror="this.style.display='none'">` : '';

      trackDiv.innerHTML = `
        <div class="track-info">
          ${iconHTML}
          <div class="track-text-wrap">
            <h3>${track.title}</h3>
            <p>${track.description}</p>
            <div class="track-tags">${tagsHTML}</div>
          </div>
        </div>
        <button class="option-btn">⋮</button>
      `;

      trackDiv.querySelectorAll('.tag-badge').forEach(badge => { badge.onclick = (e) => { e.stopPropagation(); tabAll.click(); searchInput.value = badge.dataset.tag; applySearch(); window.scrollTo(0, 0); }; });
      trackDiv.querySelector('.track-info').onclick = () => { isShuffle = false; shuffleBtn.classList.remove('active'); originalQueue = []; customQueue = [...playlist.tracks]; queueCursor = playlist.tracks.indexOf(trackIndex); loadAndPlay(customQueue[queueCursor]); renderQueue(); };
      trackDiv.querySelector('.option-btn').onclick = () => openOptionMenu(trackIndex, -1, true);
      detailTrackList.appendChild(trackDiv);
    });
  }
  playAllBtn.onclick = () => { 
    if (playlist.tracks.length === 0) { showToast("재생할 곡이 없습니다."); return; } 
    isShuffle = false; 
    shuffleBtn.classList.remove('active'); 
    originalQueue = []; 
    customQueue = [...playlist.tracks]; 
    queueCursor = 0; 
    loadAndPlay(customQueue[queueCursor]); 
    renderQueue(); 
    showToast(`'${playlist.name}' ${customQueue.length}곡이 재생됩니다.`);
  };

  // ⭐️ 새로 추가된 플레이리스트 셔플 재생 로직
  playAllShufflePlaylistBtn.onclick = () => {
    if (playlist.tracks.length === 0) { 
      showToast("재생할 곡이 없습니다."); 
      return; 
    }
    
    // 1. 하단 플레이어 바의 셔플 모드 강제 ON
    isShuffle = true;
    shuffleBtn.classList.add('active');
    
    // 2. 대기열 백업 및 섞기
    originalQueue = [...playlist.tracks];
    let shuffled = [...playlist.tracks];
    shuffleArray(shuffled);
    
    // 3. 섞인 곡들을 대기열에 덮어쓰고 재생!
    customQueue = shuffled;
    queueCursor = 0;
    
    loadAndPlay(customQueue[queueCursor]);
    renderQueue();
    
    // 4. 기분 좋은 토스트 알림!
    showToast(`'${playlist.name}' ${customQueue.length}곡이 셔플 재생됩니다.`);
  };
}

backToPlaylistBtn.onclick = () => { playlistDetailView.classList.remove('active'); playlistView.classList.add('active'); };

loadCustomTags();
loadPlaylists();
loadTracks();

// --- ⭐️ 데이터 백업 및 복원 (설정) 기능 로직 ---
const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsModal = document.getElementById('settingsModal');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
const backupDataBtn = document.getElementById('backupDataBtn');
const restoreDataBtn = document.getElementById('restoreDataBtn');
const restoreFileInput = document.getElementById('restoreFileInput');

// 팝업 열고 닫기
settingsBtn.onclick = () => {
  settingsOverlay.classList.remove('hidden');
  settingsModal.classList.remove('hidden');
};
const closeSettings = () => {
  settingsOverlay.classList.add('hidden');
  settingsModal.classList.add('hidden');
};
settingsCloseBtn.onclick = closeSettings;
settingsOverlay.onclick = closeSettings;

// 1. 데이터 백업 (다운로드)
backupDataBtn.onclick = () => {
  // 우리가 만든 두 개의 저장소를 하나의 객체로 묶음
  const backupData = {
    maple_playlists: myPlaylists,
    maple_tags: customTags
  };
  
  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  
  // 백업 파일명에 오늘 날짜 추가 (예: MaplePlayer_Backup_20240315.json)
  const date = new Date();
  const dateString = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`;
  a.download = `MaplePlayer_Backup_${dateString}.json`;
  
  a.click();
  URL.revokeObjectURL(url);
};

// 2. 데이터 복원 (파일 불러오기)
restoreDataBtn.onclick = () => {
  restoreFileInput.click(); // 숨겨둔 file input 강제 클릭
};

// ⭐️ 데이터 복원 로직 (안전 확인 팝업 추가)
let pendingRestoreData = null; // 복원할 데이터를 임시 저장할 변수

restoreFileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      
      if (importedData.maple_playlists !== undefined && importedData.maple_tags !== undefined) {
        // 바로 복원하지 않고 일단 임시 보관!
        pendingRestoreData = importedData; 
        
        // 뒤에 있는 설정 창은 닫고, 복원 확인 팝업 띄우기
        closeSettings();
        customDialogOverlay.classList.remove('hidden');
        restoreDialog.classList.remove('hidden');
      } else {
        showToast("올바른 Maple Player 백업 파일이 아닙니다.");
      }
    } catch (err) {
      showToast("파일을 읽는 중 오류가 발생했습니다.");
    }
  };
  reader.readAsText(file);
  restoreFileInput.value = ''; // 동일 파일 재선택 가능하게 초기화
};

// 복원 확인 팝업에서 '확인 및 새로고침'을 눌렀을 때만 진짜 덮어쓰기!
restoreConfirmBtn.onclick = () => {
  if (pendingRestoreData) {
    localStorage.setItem('maple_playlists', JSON.stringify(pendingRestoreData.maple_playlists));
    localStorage.setItem('maple_tags', JSON.stringify(pendingRestoreData.maple_tags));
    location.reload(); // 새로고침해서 적용 완료!
  }
};

// --- ⭐️ 향상된 플레이리스트 편집(이름 변경/삭제) 기능 로직 ---
const playlistEditOverlay = document.getElementById('playlistEditOverlay');
const playlistEditModal = document.getElementById('playlistEditModal');
const playlistEditCloseBtn = document.getElementById('playlistEditCloseBtn');
const renamePlaylistBtn = document.getElementById('renamePlaylistBtn');
const deletePlaylistBtn = document.getElementById('deletePlaylistBtn');

// 새로 추가된 커스텀 모달 변수들
const customDialogOverlay = document.getElementById('customDialogOverlay');
const renameDialog = document.getElementById('renameDialog');
const deleteDialog = document.getElementById('deleteDialog');
const renameInput = document.getElementById('renameInput');
const deleteConfirmText = document.getElementById('deleteConfirmText');

const renameCancelBtn = document.getElementById('renameCancelBtn');
const renameConfirmBtn = document.getElementById('renameConfirmBtn');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');

let editingPlaylistIndex = -1; 

// 기존 옵션 모달 닫기
const closePlaylistEdit = () => {
  playlistEditOverlay.classList.add('hidden');
  playlistEditModal.classList.add('hidden');
};
playlistEditOverlay.onclick = closePlaylistEdit;
playlistEditCloseBtn.onclick = closePlaylistEdit;

const closeCustomDialogs = () => {
  customDialogOverlay.classList.add('hidden');
  renameDialog.classList.add('hidden');
  deleteDialog.classList.add('hidden');
  createPlaylistDialog.classList.add('hidden'); // ⭐️ 추가됨
  restoreDialog.classList.add('hidden'); // ⭐️ 추가됨
  tagDeleteDialog.classList.add('hidden');
};
customDialogOverlay.onclick = closeCustomDialogs;
renameCancelBtn.onclick = closeCustomDialogs;
deleteCancelBtn.onclick = closeCustomDialogs;
createPlaylistCancelBtn.onclick = closeCustomDialogs; // ⭐️ 추가됨
restoreCancelBtn.onclick = closeCustomDialogs; // ⭐️ 추가됨
tagDeleteCancelBtn.onclick = closeCustomDialogs;

// 1. 이름 변경 버튼 눌렀을 때 -> 이름 변경 팝업 띄우기
renamePlaylistBtn.onclick = () => {
  if (editingPlaylistIndex === -1) return;
  const playlist = myPlaylists[editingPlaylistIndex];
  
  closePlaylistEdit(); // 기존 메뉴 창은 닫고
  
  renameInput.value = playlist.name; // 원래 이름 텍스트창에 미리 써두기
  customDialogOverlay.classList.remove('hidden');
  renameDialog.classList.remove('hidden');
  setTimeout(() => renameInput.focus(), 100); // 텍스트창 자동 선택(커서 깜빡임)
};

// 1-1. 이름 변경 창에서 '확인' 눌렀을 때
renameConfirmBtn.onclick = () => {
  const newName = renameInput.value.trim();
  const playlist = myPlaylists[editingPlaylistIndex];
  
  if (newName !== "" && newName !== playlist.name) {
    playlist.name = newName;
    savePlaylists();
    renderPlaylists();
    showToast("플레이리스트 이름이 변경되었습니다."); // ⭐️ 성공 토스트
  }
  closeCustomDialogs();
};

// 2. 삭제 버튼 눌렀을 때 -> 삭제 확인 팝업 띄우기
deletePlaylistBtn.onclick = () => {
  if (editingPlaylistIndex === -1) return;
  const playlist = myPlaylists[editingPlaylistIndex];
  
  closePlaylistEdit(); 
  
  deleteConfirmText.innerHTML = `'<strong>${playlist.name}</strong>' 플레이리스트를 정말 삭제할까요?<br>이 작업은 되돌릴 수 없습니다.`;
  customDialogOverlay.classList.remove('hidden');
  deleteDialog.classList.remove('hidden');
};

// 2-1. 삭제 창에서 '삭제' 눌렀을 때
deleteConfirmBtn.onclick = () => {
  myPlaylists.splice(editingPlaylistIndex, 1);
  savePlaylists();
  renderPlaylists();
  showToast("플레이리스트가 삭제되었습니다."); // ⭐️ 성공 토스트
  closeCustomDialogs();
};

// --- ⭐️ 토스트 알림 함수 ---
const toastMessage = document.getElementById('toastMessage');
let toastTimeout;

function showToast(text) {
  toastMessage.textContent = text;
  toastMessage.classList.add('show');
  
  // 기존에 켜져 있던 타이머가 있다면 취소 (연타 방지)
  clearTimeout(toastTimeout);
  
  // 2.5초 뒤에 스르륵 사라지게 만듦
  toastTimeout = setTimeout(() => {
    toastMessage.classList.remove('show');
  }, 2500);
}

// --- ⭐️ 진행 바 및 재생 시간 로직 ---
const progressBar = document.getElementById('progressBar');
const currentTimeDisplay = document.getElementById('currentTimeDisplay');
const durationDisplay = document.getElementById('durationDisplay');

// 초 단위 숫자를 '0:00' 포맷으로 예쁘게 바꿔주는 함수
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// 1. 노래가 새로 로드되면 총 길이를 파악해서 세팅
currentAudio.addEventListener('loadedmetadata', () => {
  progressBar.max = currentAudio.duration;
  durationDisplay.textContent = formatTime(currentAudio.duration);
});

let isDragging = false; // 드래그(조작) 중인지 체크

// 2. 노래가 흐를 때 실시간으로 진행 바 갱신
currentAudio.addEventListener('timeupdate', () => {
  if (!isDragging) { // 내가 손으로 잡고 있지 않을 때만 알아서 흘러감
    progressBar.value = currentAudio.currentTime;
    currentTimeDisplay.textContent = formatTime(currentAudio.currentTime);
    
    // 진행된 만큼 주황색 색상 채우기!
    const percent = (currentAudio.currentTime / currentAudio.duration) * 100 || 0;
    progressBar.style.background = `linear-gradient(to right, #ff7f00 ${percent}%, rgba(255,255,255,0.1) ${percent}%)`;
  }
});

// 3. 진행 바를 손으로 드래그하는 중일 때 (시간 텍스트랑 색상만 먼저 바뀜)
progressBar.addEventListener('input', () => {
  isDragging = true;
  currentTimeDisplay.textContent = formatTime(progressBar.value);
  
  const percent = (progressBar.value / currentAudio.duration) * 100 || 0;
  progressBar.style.background = `linear-gradient(to right, #ff7f00 ${percent}%, rgba(255,255,255,0.1) ${percent}%)`;
});

// 4. 손을 딱 놨을 때 (그 위치로 진짜 재생 시간 이동!)
progressBar.addEventListener('change', () => {
  currentAudio.currentTime = progressBar.value;
  isDragging = false;
});

// 1. 키보드로 글씨를 입력할 때마다 X 버튼을 보여줄지 말지 결정
searchInput.addEventListener('input', () => {
  if (searchInput.value.length > 0) {
    clearSearchBtn.style.display = 'flex'; // 글씨가 한 글자라도 있으면 보임
  } else {
    clearSearchBtn.style.display = 'none'; // 다 지워지면 숨김
  }
});

// 2. X 버튼을 눌렀을 때의 동작
clearSearchBtn.onclick = () => {
  searchInput.value = '';                 // 검색창 글씨 싹 지우기
  clearSearchBtn.style.display = 'none';  // X 버튼 다시 숨기기
  searchInput.focus();                    // 바로 다시 검색할 수 있게 커서 깜빡임 유지!
  applySearch();                          // ⭐️ 화면에 원래 전체 곡 리스트로 되돌려놓기
};