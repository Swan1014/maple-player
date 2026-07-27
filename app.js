// HTML 요소들 가져오기
const trackListContainer = document.getElementById('trackList');
const currentTitle = document.getElementById('currentTitle');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');

// HTML에 있는 <audio> 태그 가져오기
const currentAudio = document.getElementById('mainAudio');

// 상태 변수
let tracks = [];
let currentIndex = -1;
let currentBlobUrl = null; // ⭐️ 아이폰 메모리에 올린 음악 주소

// ⭐️ 1. 깔끔해진 상태 동기화 (충돌 일으키던 무음 신호기 삭제)
currentAudio.addEventListener('play', () => {
  playBtn.textContent = '⏸️'; 
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

currentAudio.addEventListener('pause', () => {
  playBtn.textContent = '▶️';
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});

// data.json 파일 읽어오기
async function loadTracks() {
  try {
    const response = await fetch('data.json');
    tracks = await response.json();
    renderTracks(tracks);
  } catch (error) {
    console.error("데이터 실패:", error);
    trackListContainer.innerHTML = "<p>곡 정보를 불러오지 못했습니다.</p>";
  }
}

// 화면에 곡 목록 그리기
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
      <h3>${track.title}</h3>
      <p>${track.description}</p>
      <p>🏷️ ${track.tags.join(', ')}</p>
    `;
    
    trackDiv.onclick = () => {
      const realIndex = tracks.findIndex(t => t.title === track.title);
      playTrack(realIndex);
    };
    trackListContainer.appendChild(trackDiv);
  });
}

// ⭐️ 2. 잠금 화면/제어 센터 (이제 메모리에서 돌아가므로 절대 죽지 않음)
function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: '메이플스토리 BGM',
    });

    navigator.mediaSession.setActionHandler('play', async () => {
      try {
        await currentAudio.play();
      } catch (error) {
        console.warn("잠금화면 재생 에러, 재시도합니다.", error);
        playTrack(currentIndex); // 만약의 만약에 죽더라도 처음부터 즉각 재로딩
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      currentAudio.pause();
    });
  }
}

// ⭐️ 3. 핵심: 인터넷 스트리밍 방식에서 메모리(Blob) 로드 방식으로 완벽 교체
async function playTrack(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];

  // 다운로드하는 1~2초 동안 보여줄 로딩 표시
  currentTitle.textContent = "⏳ 불러오는 중...";
  playBtn.textContent = '⏳';

  try {
    // MP3 파일을 통째로 아이폰 RAM으로 다운로드 (핵심)
    const response = await fetch(`assets/music/${track.filename}`);
    if (!response.ok) throw new Error("네트워크 에러");
    const blob = await response.blob();

    // 혹시 이전에 듣던 곡이 메모리에 남아있다면 지워주기 (아이폰 용량 꽉 참 방지)
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }

    // RAM에 올라간 파일로 새로운 내부용 주소 만들기
    currentBlobUrl = URL.createObjectURL(blob);

    // 내부 주소로 재생
    currentAudio.src = currentBlobUrl;
    await currentAudio.play();

    // 재생 성공 시 UI 업데이트
    currentTitle.textContent = track.title;
    updateMediaSession(track);
  } catch (error) {
    console.error("재생 실패:", error);
    currentTitle.textContent = "❌ 재생 실패 (다시 눌러주세요)";
    playBtn.textContent = '▶️';
  }
}

// 재생 / 일시정지 토글
function togglePlay() {
  if (currentIndex === -1) return;

  if (currentAudio.paused) {
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

// 버튼 이벤트
playBtn.onclick = togglePlay;

// 시작
loadTracks();