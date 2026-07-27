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

// ⭐️ 4. 다음 곡 재생 로직 (엄격한 사용자 대기열 방식으로 변경)
function playNext() {
  // 대기열(customQueue)에 사용자가 추가해 둔 곡이 있는 경우
  if (customQueue.length > 0) {
    if (currentIndex !== -1) {
      playHistory.push(currentIndex); // 현재 듣던 곡을 과거 기록에 저장
    }
    const nextIndex = customQueue.shift(); // 대기열에서 첫 번째 곡을 꺼냄
    loadAndPlay(nextIndex);
  } 
  // 대기열이 비어있는 경우
  else {
    // 아무것도 재생 안 한 초기 상태면 무시
    if (currentIndex === -1) return;
    
    // 대기열의 곡을 다 들었거나, 추가한 곡이 없으면 재생을 깔끔하게 멈춤 (제멋대로 넘어가는 것 방지)
    currentAudio.pause();
    currentAudio.currentTime = 0;
    playBtn.textContent = '▶️';
    
    // 아이폰 잠금화면 상태도 일시정지로 동기화
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
}

// ⭐️ 5. 이전 곡 재생 로직 (기성 앱 디테일 추가)
function playPrev() {
  // 아무것도 재생 안 한 초기 상태면 무시
  if (currentIndex === -1) return;

  // 디테일: 노래가 3초 이상 재생된 상태라면, 이전 곡으로 가지 않고 현재 곡을 처음으로 되돌림
  if (currentAudio.currentTime > 3) {
    currentAudio.currentTime = 0;
    return;
  }

  // 3초 미만이고, 과거에 들었던 곡(History)이 있으면 그걸 꺼내서 재생
  if (playHistory.length > 0) {
    const prevIndex = playHistory.pop();
    loadAndPlay(prevIndex);
  } else {
    // 과거 기록도 없으면 현재 곡을 처음부터 재생
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