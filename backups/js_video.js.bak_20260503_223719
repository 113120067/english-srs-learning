// Video Module Core Logic

let player;
let isPlayerReady = false;
let currentDay = "1";
let reviewList = [];
let currentSegmentIndex = 0;
let checkTimeInterval;
let currentSegment = null;

// === NEW: 時序隔離狀態 (Phase 1) ===
let lastSeekTime = 0; // 最後一次 seekTo 的時刻（毫秒）
let isCheckingTime = false; // 防止多重檢查函式執行
const SEEK_BUFFER_MS = 500; // Seek 緩衝時間（毫秒）

// === NEW: 播放重試與字幕 overlay ===
const PLAY_RETRY_INTERVAL_MS = 200; // 嘗試重新 play 的間隔（毫秒）
const PLAY_RETRY_MAX = 6; // 最大重試次數
let subtitleOverlay = null; // 動態建立的字幕覆層元素
// === NEW: 終止確認機制，避免瞬間誤判 ===
const END_CONFIRM_MS = 80; // 當 currentTime >= end 時的確認延遲（毫秒）
let endConfirmTimer = null;
// === NEW: 終止與預期結束管理 ===
// 確認延遲已存在（END_CONFIRM_MS）
// SAFETY_MARGIN_MS：在預期結束計時上保留的安全邊界，減少精確時序誤差
const SAFETY_MARGIN_MS = 80;
let expectedEndTimer = null; // 在接近 end 時預先排程的一次性 timer
let waitingForPlay = false; // seekTo 後等待播放器進入 PLAYING

// === NEW: Debug logging system ===
const VIDEO_DEBUG = {
  enabled: true, // 切換整體日誌
  level: "debug", // debug, info, warn, error
  logs: [],
  maxLogs: 300,
  overlay: null,
  log(level, msg) {
    if (!this.enabled) return;
    const ts = new Date().toISOString();
    const text = `[${ts}] [${level.toUpperCase()}] ${msg}`;
    // store
    this.logs.push({ ts, level, msg });
    if (this.logs.length > this.maxLogs) this.logs.shift();
    // console output
    if (level === "error") console.error(text);
    else if (level === "warn") console.warn(text);
    else console.log(text);
    // overlay
    if (this.overlay) {
      const el = document.createElement("div");
      el.textContent = text;
      el.style.fontSize = "12px";
      el.style.lineHeight = "1.2";
      el.style.padding = "2px 4px";
      el.style.borderBottom = "1px solid rgba(255,255,255,0.04)";
      this.overlay.appendChild(el);
      // keep limited scroll
      while (this.overlay.childNodes.length > 50)
        this.overlay.removeChild(this.overlay.firstChild);
      this.overlay.scrollTop = this.overlay.scrollHeight;
    }
  },
  createOverlay() {
    if (this.overlay) return;
    const o = document.createElement("div");
    o.id = "video-debug-overlay";
    o.style.position = "absolute";
    o.style.top = "8px";
    o.style.right = "8px";
    o.style.width = "420px";
    o.style.maxHeight = "60vh";
    o.style.overflow = "auto";
    o.style.background = "rgba(0,0,0,0.6)";
    o.style.color = "#fff";
    o.style.padding = "6px";
    o.style.fontFamily = "monospace";
    o.style.fontSize = "12px";
    o.style.zIndex = "10000";
    o.style.borderRadius = "6px";
    if (videoWrapper) videoWrapper.appendChild(o);
    this.overlay = o;
    // seed with last logs
    this.logs.forEach((l) => {
      const el = document.createElement("div");
      el.textContent = `[${l.ts}] [${l.level}] ${l.msg}`;
      el.style.fontSize = "12px";
      el.style.lineHeight = "1.2";
      o.appendChild(el);
    });
  },
  dump(n = 200) {
    const out = this.logs
      .slice(-n)
      .map((l) => `[${l.ts}] [${l.level}] ${l.msg}`);
    console.log(`VIDEO_DEBUG.dump(${n}) → ${out.length} entries`);
    out.forEach((l) => console.log(l));
    return out;
  },
  toggle(on) {
    if (typeof on === "boolean") this.enabled = on;
    else this.enabled = !this.enabled;
    console.log("VIDEO_DEBUG.enabled =", this.enabled);
  },
  setLevel(l) {
    this.level = l;
    console.log("VIDEO_DEBUG.level =", this.level);
  },
  clear() {
    this.logs = [];
    if (this.overlay) this.overlay.innerHTML = "";
  },
};
// expose for runtime access
window.VIDEO_DEBUG = VIDEO_DEBUG;

// DOM Elements
const daySelector = document.getElementById("day-selector");
const videoWrapper = document.getElementById("video-wrapper");
const flashcardContainer = document.getElementById("flashcard-container");
const emptyState = document.getElementById("empty-state");
const statusSummary = document.getElementById("status-summary");
const flashcard = document.getElementById("flashcard");
const chineseFront = document.getElementById("chinese-front");
const englishBack = document.getElementById("english-back");
const keyWordsList = document.getElementById("key-words-list");
const replayBtn = document.getElementById("replay-btn");
const markBadBtn = document.getElementById("mark-bad-btn");
const markGoodBtn = document.getElementById("mark-good-btn");
const resetDayBtn = document.getElementById("reset-day-btn");
const startState = document.getElementById("start-state");
const startVideoBtn = document.getElementById("start-video-btn");
const loadLocalJsonBtn = document.getElementById('load-local-json-btn');
const localJsonInput = document.getElementById('local-json-input');

// Initialize App
async function init() {
  populateDaySelector();
  await loadDayData(currentDay);
  VIDEO_DEBUG.log("info", "init(): populateDaySelector & loadDayData called");

  // Event Listeners
  daySelector.addEventListener("change", async (e) => {
    currentDay = e.target.value;
    await loadDayData(currentDay);
  });

  flashcard.addEventListener("click", flipCard);

  replayBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent card flip
    replayCurrentSegment();
  });

  markBadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleSrsAction(1); // 1 = bad
  });

  markGoodBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handleSrsAction(2); // 2 = good
  });

  resetDayBtn.addEventListener("click", () => {
    loadDayData(currentDay);
  });

  startVideoBtn.addEventListener("click", () => {
    if (!isPlayerReady) {
      alert("Video player is still loading, please wait a moment.");
      return;
    }
    showFlashcardState();
    // Fix #2: 等待瀏覽器完成 Layout Reflow（display:none → block）後再播放
    // 雙重 rAF 確保 YouTube IFrame 尺寸穩定，避免第一次播放立即暫停
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        startSegment();
      });
    });
  });

  // 建立字幕 overlay（綁在 videoWrapper）
  subtitleOverlay = document.createElement("div");
  subtitleOverlay.id = "subtitle-overlay";
  subtitleOverlay.style.position = "absolute";
  subtitleOverlay.style.left = "0";
  subtitleOverlay.style.right = "0";
  subtitleOverlay.style.bottom = "8%";
  subtitleOverlay.style.textAlign = "center";
  subtitleOverlay.style.color = "#fff";
  subtitleOverlay.style.fontSize = "18px";
  subtitleOverlay.style.textShadow = "0 2px 6px rgba(0,0,0,0.8)";
  subtitleOverlay.style.padding = "6px 12px";
  subtitleOverlay.style.pointerEvents = "none";
  subtitleOverlay.style.display = "none";
  subtitleOverlay.style.zIndex = "999";
  if (videoWrapper) videoWrapper.appendChild(subtitleOverlay);
  // 建立 debug overlay（若啟用）
  if (VIDEO_DEBUG && VIDEO_DEBUG.enabled) VIDEO_DEBUG.createOverlay();
  VIDEO_DEBUG.log(
    "info",
    "init(): subtitleOverlay & debug overlay initialized",
  );

  // 本機 JSON 載入器
  if (loadLocalJsonBtn && localJsonInput) {
    loadLocalJsonBtn.addEventListener('click', () => {
      localJsonInput.value = null;
      localJsonInput.click();
    });

    localJsonInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const obj = JSON.parse(ev.target.result);
          VIDEO_DEBUG.log('info', `local JSON loaded: name=${f.name}`);
          handleLocalVideoJSON(obj, f.name);
        } catch (err) {
          VIDEO_DEBUG.log('error', 'Failed to parse local JSON: ' + err);
          alert('無法解析選取的 JSON 檔案，請確認檔案格式正確。');
        }
      };
      reader.onerror = (err) => {
        VIDEO_DEBUG.log('error', 'FileReader error: ' + err);
        alert('讀取檔案發生錯誤');
      };
      reader.readAsText(f, 'utf-8');
    });
  }
}

// Handle a parsed local video lesson JSON object (same schema as lessons/video_DayX.json)
function handleLocalVideoJSON(obj, name) {
  if (!obj || !obj.items || !obj.videoID) {
    VIDEO_DEBUG.log('warn', 'handleLocalVideoJSON: invalid object schema');
    alert('選取的 JSON 結構不符（需要包含 videoID 與 items 陣列）。');
    return;
  }

  // Use a pseudo-day id to mark this as local content
  currentDay = `local-${name}`;

  // Prepare reviewList from provided items
  reviewList = obj.items;
  currentSegmentIndex = 0;
  statusSummary.textContent = `${reviewList.length} segments loaded (local)`;

  // Initialize or update YouTube player with provided videoID
  if (!player) {
    if (window.YT && window.YT.Player) {
      createPlayer(obj.videoID);
    } else {
      window.pendingVideoId = obj.videoID;
    }
  } else {
    VIDEO_DEBUG.log('info', `handleLocalVideoJSON: loading videoID=${obj.videoID}`);
    try {
      player.loadVideoById(obj.videoID);
      player.stopVideo();
    } catch (e) {
      VIDEO_DEBUG.log('warn', 'player.loadVideoById failed: ' + e);
    }
    showStartState();
  }
}
function populateDaySelector() {
  daySelector.innerHTML = "";

  const days = [
    { value: "1", label: "Day 1 (Intro & Connect the dots)" },
    { value: "2", label: "Day 2 (Adoption & College)" },
    { value: "3", label: "Day 3 (Dropping out & India)" },
  ];

  days.forEach((d) => {
    const option = document.createElement("option");
    option.value = d.value;
    option.textContent = d.label;
    daySelector.appendChild(option);
  });
}

async function loadDayData(day) {
  statusSummary.textContent = "Loading video data...";

  const result = await StorageModule.getVideoReviewList(day);
  if (!result || !result.items || result.items.length === 0) {
    showEmptyState();
    return;
  }

  reviewList = result.items;
  currentSegmentIndex = 0;
  statusSummary.textContent = `${reviewList.length} segments to review`;

  showStartState();

  // Initialize or Update YouTube Player
  if (!player) {
    // YT API will call onYouTubeIframeAPIReady when script loads
    // If it's already loaded but player is null (shouldn't happen often if we use global callback)
    if (window.YT && window.YT.Player) {
      createPlayer(result.videoID);
    } else {
      // Wait for onYouTubeIframeAPIReady
      window.pendingVideoId = result.videoID;
    }
  } else {
    // Fix #3: loadVideoById() 是非同步的，不可立刻呼叫 startSegment()
    // 改為先停止播放，回到待機畫面讓使用者重新點擊「開始播放」
    VIDEO_DEBUG.log(
      "info",
      `loadDayData(): updating player with videoID=${result.videoID}`,
    );
    player.loadVideoById(result.videoID);
    player.stopVideo();
    showStartState();
  }
}

// YouTube API Callback
function onYouTubeIframeAPIReady() {
  VIDEO_DEBUG.log("info", "onYouTubeIframeAPIReady() called");
  if (window.pendingVideoId) {
    VIDEO_DEBUG.log(
      "info",
      `onYouTubeIframeAPIReady(): pendingVideoId=${window.pendingVideoId}`,
    );
    createPlayer(window.pendingVideoId);
  }
}

function createPlayer(videoId) {
  VIDEO_DEBUG.log("info", `createPlayer(): videoId=${videoId}`);
  player = new YT.Player("youtube-player", {
    height: "100%",
    width: "100%",
    videoId: videoId,
    playerVars: {
      playsinline: 1,
      controls: 0, // Hide YT controls
      disablekb: 1,
      rel: 0,
      fs: 0,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerReady(event) {
  isPlayerReady = true;
  VIDEO_DEBUG.log("info", "onPlayerReady: player ready");
  // Don't auto-start here to prevent browser autoplay block
}

function onPlayerStateChange(event) {
  VIDEO_DEBUG.log("debug", `onPlayerStateChange: state=${event.data}`);
  // Handling buffering or other states if needed
  const state = event.data;
  VIDEO_DEBUG.log('debug', `onPlayerStateChange: state=${state}`);
  // When playback enters PLAYING, schedule expectedEndTimer if we're playing a segment
  if (state === YT.PlayerState.PLAYING) {
    VIDEO_DEBUG.log('debug', 'onPlayerStateChange: PLAYING');
    // clear any endConfirm which was set earlier
    if (endConfirmTimer) {
      clearTimeout(endConfirmTimer);
      endConfirmTimer = null;
      VIDEO_DEBUG.log('debug', 'onPlayerStateChange: cleared endConfirmTimer');
    }
    // If we are waiting for play because of a recent seek, schedule the expected end
    if (currentSegment) {
      waitingForPlay = false;
      // clear existing expectedEndTimer
      if (expectedEndTimer) {
        clearTimeout(expectedEndTimer);
        expectedEndTimer = null;
      }
      try {
        const ct = player.getCurrentTime();
        const remainingMs = Math.max(0, (currentSegment.endTime - ct) * 1000);
        VIDEO_DEBUG.log('debug', `onPlayerStateChange: scheduling expected end in ${remainingMs}ms (ct=${ct})`);
        // schedule a final confirmation just before the expected end
        const scheduleMs = Math.max(0, remainingMs - SAFETY_MARGIN_MS);
        expectedEndTimer = setTimeout(() => {
          try {
            const now = player && player.getCurrentTime ? player.getCurrentTime() : null;
            VIDEO_DEBUG.log('debug', `expectedEndTimer fired: now=${now}`);
            if (now !== null && now >= currentSegment.endTime - 0.03) {
              VIDEO_DEBUG.log('info', `expectedEndTimer: confirmed end at ${now}`);
              try { player.pauseVideo(); } catch (e) { VIDEO_DEBUG.log('warn', 'pauseVideo() threw: ' + e); }
              if (checkTimeInterval) { clearInterval(checkTimeInterval); checkTimeInterval = null; }
              if (subtitleOverlay) subtitleOverlay.style.display = 'none';
            } else {
              VIDEO_DEBUG.log('debug', `expectedEndTimer: end not reached (now=${now})`);
            }
          } finally {
            expectedEndTimer = null;
          }
        }, scheduleMs);
      } catch (e) {
        VIDEO_DEBUG.log('warn', 'onPlayerStateChange scheduling failed: ' + e);
      }
    }
  } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
    // Clear any scheduled expected end when paused/ended
    if (expectedEndTimer) {
      clearTimeout(expectedEndTimer);
      expectedEndTimer = null;
      VIDEO_DEBUG.log('debug', 'onPlayerStateChange: cleared expectedEndTimer due to pause/ended');
    }
}

function startSegment() {
  if (!isPlayerReady || currentSegmentIndex >= reviewList.length) return;
  VIDEO_DEBUG.log("info", `startSegment: index=${currentSegmentIndex}`);
  currentSegment = reviewList[currentSegmentIndex];

  // Reset Card UI
  flashcard.classList.remove("is-flipped");
  chineseFront.textContent = currentSegment.chinese;
  englishBack.textContent = currentSegment.english;

  // Populate Key Words
  keyWordsList.innerHTML = "";
  if (currentSegment.key_words) {
    currentSegment.key_words.forEach((kw) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="kw-word">${kw.word}</span> <span class="kw-phonetic">${kw.phonetic || ""}</span><span class="kw-meaning">${kw.meaning}</span>`;
      keyWordsList.appendChild(li);
    });
  }

  // Play video segment
  playSegment();
}

let seekedAndPlaying = false;

function playSegment() {
  if (!currentSegment) return;
  VIDEO_DEBUG.log(
    "debug",
    `playSegment(): segmentId=${currentSegment.id} start=${currentSegment.startTime} end=${currentSegment.endTime}`,
  );

  clearInterval(checkTimeInterval);
  seekedAndPlaying = false; // Reset lock
  isCheckingTime = false; // ← NEW: 清理檢查旗標

  // 清除任何殘留的 end confirm timer（避免前一次段落的 timer 影響新段落）
  if (endConfirmTimer) {
    clearTimeout(endConfirmTimer);
    endConfirmTimer = null;
    VIDEO_DEBUG.log("debug", "playSegment(): cleared endConfirmTimer");
  }
  // 清除任何殘留的 expectedEndTimer
  if (expectedEndTimer) {
    clearTimeout(expectedEndTimer);
    expectedEndTimer = null;
    VIDEO_DEBUG.log("debug", "playSegment(): cleared expectedEndTimer");
  }

  lastSeekTime = Date.now(); // ← NEW: 記錄當前時刻（關鍵！）
  VIDEO_DEBUG.log("debug", `playSegment(): lastSeekTime set ${lastSeekTime}`);

  // allowSeekAhead = true
  player.seekTo(currentSegment.startTime, true);

  // 小延遲後再呼叫 playVideo，讓 IFrame/緩衝先穩定
  setTimeout(() => {
    try {
      player.playVideo();
    } catch (e) {
      // 忽略 play 錯誤
    }
  }, 120);

  // 顯示字幕 overlay
  if (subtitleOverlay) {
    subtitleOverlay.textContent =
      currentSegment.english || englishBack.textContent || "";
    subtitleOverlay.style.display = "block";
  }

  // 確保播放：若未進入 PLAYING 且非 BUFFERING，嘗試重新 playVideo() 幾次
  let playAttempts = 0;
  const ensurePlaying = () => {
    try {
      if (!player || typeof player.getPlayerState !== "function") return;
      const state = player.getPlayerState();
      VIDEO_DEBUG.log(
        "debug",
        `ensurePlaying(): state=${state} attempts=${playAttempts}`,
      );
      // 對 BUFFERING (3) 視為正常，僅在非 PLAYING 且非 BUFFERING 時才重試
      if (
        state !== YT.PlayerState.PLAYING &&
        state !== YT.PlayerState.BUFFERING &&
        playAttempts < PLAY_RETRY_MAX
      ) {
        playAttempts++;
        try {
          player.playVideo();
          VIDEO_DEBUG.log(
            "debug",
            `ensurePlaying(): triggered playVideo(), attempt ${playAttempts}`,
          );
        } catch (e) {
          // 忽略
        }
        setTimeout(ensurePlaying, PLAY_RETRY_INTERVAL_MS);
      }
    } catch (e) {
      // 忽略錯誤以免中斷重試機制
    }
  };
  setTimeout(ensurePlaying, PLAY_RETRY_INTERVAL_MS);

  // fallback poll (less frequent)
  checkTimeInterval = setInterval(checkVideoTime, 200);
  // 在 seek 後先標記為等待 PLAYING
  waitingForPlay = true;
}

function checkVideoTime() {
  // ← NEW: 防止多重檢查函式同時執行
  if (isCheckingTime) return;
  isCheckingTime = true;
  VIDEO_DEBUG.log("debug", "checkVideoTime(): enter");

  try {
    if (player && player.getCurrentTime && player.getPlayerState) {
      // Only check time if the video is actually playing
      if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
        isCheckingTime = false; // ← NEW: 清理旗標後才 return
        return;
      }

      const currentTime = player.getCurrentTime();
      VIDEO_DEBUG.log("debug", `checkVideoTime(): currentTime=${currentTime}`);

      // ← NEW: 第一層：Seek 緩衝保護（0.5 秒鎖定）
      const timeSinceSeek = Date.now() - lastSeekTime;
      if (timeSinceSeek < SEEK_BUFFER_MS) {
        // 在 YouTube API 穩定前（500ms 內），完全鎖定檢查
        isCheckingTime = false; // ← NEW: 清理旗標後才 return
        return;
      }

      if (!seekedAndPlaying) {
        // Fix #1: 確認 seek 已完成（當前時間 < endTime）後立刻 return
        // 將「確認」與「終止判斷」分在不同的 poll tick，消除同一 tick 內的 Race Condition
        if (currentTime < currentSegment.endTime) {
          seekedAndPlaying = true;
          VIDEO_DEBUG.log(
            "info",
            "checkVideoTime(): seekedAndPlaying set true",
          );
          isCheckingTime = false; // ← NEW: 清理旗標後才 return
          return; // 本 tick 僅做確認，下一個 tick 才開始監控終止點
        } else {
          isCheckingTime = false; // ← NEW: 清理旗標後才 return
          return; // seek 尚未完成，繼續等待
        }
      }

      if (currentTime >= currentSegment.endTime) {
        VIDEO_DEBUG.log(
          "info",
          `checkVideoTime(): candidate segment end currentTime=${currentTime} >= end=${currentSegment.endTime}`,
        );
        // 延遲確認，避免瞬間數值誤判或 race condition
        if (!endConfirmTimer) {
          endConfirmTimer = setTimeout(() => {
            try {
              const ct =
                player && player.getCurrentTime
                  ? player.getCurrentTime()
                  : null;
              VIDEO_DEBUG.log("debug", `endConfirm fired: currentTime=${ct}`);
              if (ct !== null && ct >= currentSegment.endTime - 0.03) {
                VIDEO_DEBUG.log(
                  "info",
                  `checkVideoTime(): confirmed end; pausing at ${ct}`,
                );
                try {
                  player.pauseVideo();
                } catch (e) {
                  VIDEO_DEBUG.log("warn", "pauseVideo() threw: " + e);
                }
                clearInterval(checkTimeInterval);
                if (subtitleOverlay) subtitleOverlay.style.display = "none";
              } else {
                VIDEO_DEBUG.log(
                  "debug",
                  `checkVideoTime(): end not confirmed (ct=${ct})`,
                );
              }
            } finally {
              endConfirmTimer = null;
            }
          }, END_CONFIRM_MS);
          VIDEO_DEBUG.log(
            "debug",
            `checkVideoTime(): scheduled endConfirmTimer ${END_CONFIRM_MS}ms`,
          );
        }
      }
    }
  } finally {
    // ← NEW: 確保 isCheckingTime 一定被重置（即使異常也不例外）
    isCheckingTime = false;
  }
}

function replayCurrentSegment() {
  if (player) {
    VIDEO_DEBUG.log("info", "replayCurrentSegment(): user triggered replay");
    playSegment();
  }
}

function flipCard() {
  flashcard.classList.toggle("is-flipped");
}

function handleSrsAction(statusId) {
  StorageModule.updateVideoSegmentStatus(
    currentDay,
    currentSegment.id,
    statusId,
  );

  // Go to next segment
  currentSegmentIndex++;
  if (currentSegmentIndex < reviewList.length) {
    statusSummary.textContent = `${reviewList.length - currentSegmentIndex} segments remaining`;
    startSegment();
  } else {
    showEmptyState();
  }
}

function showEmptyState() {
  videoWrapper.style.display = "none";
  flashcardContainer.style.display = "none";
  startState.style.display = "none";
  emptyState.style.display = "flex";
  statusSummary.textContent = "All done for today!";
}

function showFlashcardState() {
  videoWrapper.style.display = "block";
  flashcardContainer.style.display = "flex";
  startState.style.display = "none";
  emptyState.style.display = "none";
}

function showStartState() {
  videoWrapper.style.display = "none";
  flashcardContainer.style.display = "none";
  emptyState.style.display = "none";
  startState.style.display = "flex";
}

// Start app
init();
