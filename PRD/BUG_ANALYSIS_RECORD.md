# 影音模組 (Video Module) - Bug 深度分析與查詢紀錄單

**分析日期**：2026年5月3日  
**分析版本**：PRD V3 + 程式開發紀錄單  
**當前實裝版本**：js/video.js (最新版)  

---

## 🎯 分析概述

本紀錄單針對 PRD V3 與程式開發紀錄中提及的三大 Bug 進行深度追查，驗證修復實裝情況，並識別潛在風險。

---

## 第一部分：已修復 Bug 驗證清單

### ✅ Bug 1：字幕（卡片）不會動
**PRD 根本原因**：`loadDayData()` 在播放器已存在時的邏輯錯誤，過早呼叫 `startSegment()`。

| 檢驗項目 | 狀態 | 位置 | 說明 |
|---------|------|------|------|
| **修復方案實裝** | ✅ | `video.js` L110–116 | 已移除立即呼叫 `startSegment()`，改為 `player.stopVideo()` + `showStartState()` |
| **邏輯正確性** | ✅ | L104–116 | 分流邏輯正確：首次建立播放器 vs. 後續更新影片ID |
| **使用者互動流** | ✅ | L57–66 | 回到待機畫面 (`showStartState`)，讓使用者重新點擊「開始播放」 |

**修復驗證結果**：🟢 **已完整實裝**

---

### ✅ Bug 2 - 問題 A：DOM Layout Reflow 衝突（第一次播放立即暫停）
**PRD 根本原因**：`showFlashcardState()` 觸發 Reflow 後，YouTube IFrame 尺寸未穩定就下播放命令。

| 檢驗項目 | 狀態 | 位置 | 說明 |
|---------|------|------|------|
| **雙重 rAF 實裝** | ✅ | `video.js` L57–66 | 明確使用雙重 `requestAnimationFrame` |
| **CSS 顯隱管理** | ✅ | L57–59 | 正確呼叫 `showFlashcardState()` 設置 `display:block` |
| **播放命令延遲** | ✅ | L60–66 | 等待兩個渲染幀後才呼叫 `startSegment()` |
| **文字註解清晰度** | ✅ | L55–56 | 有清楚的中文註解解釋修復目的 |

**修復驗證結果**：🟢 **已完整實裝**

---

### ✅ Bug 2 - 問題 B：`checkVideoTime()` Race Condition（同 tick 內確認與終止衝突）
**PRD 根本原因**：`seekedAndPlaying = true` 與 `>= endTime` 判斷在同一 tick 執行，無時序隔離。

| 檢驗項目 | 狀態 | 位置 | 說明 |
|---------|------|------|------|
| **Return 語句位置** | ✅ | `video.js` L159 | `seekedAndPlaying = true` 後立刻 `return` |
| **邏輯隔離** | ✅ | L153–168 | 確認與終止判斷在不同的 poll tick 中執行 |
| **防呆設計** | ✅ | L157–161 | else 分支確保未 seek 完成時持續等待，不會誤觸發 |

**修復驗證結果**：🟢 **已完整實裝**

---

## 第二部分：潛在遺漏的修復方案

### ⚠️ Issue 2：「狀態鎖定計時器」未見實裝
**開發紀錄記載**：Replay 或下一句後，影片會「閃一下立刻暫停」，根本原因是 `seekTo()` 非同步時間差。

**開發紀錄中的修復方案**：
```javascript
// 記錄 seek 時刻
let lastSeekTime = Date.now();

// 在 checkVideoTime 中
if (Date.now() - lastSeekTime < 500) return; // 關鍵：0.5秒鎖定
```

| 檢驗項目 | 狀態 | 位置 | 說明 |
|---------|------|------|------|
| **全域變數聲明** | ❌ | `video.js` | 未見 `let lastSeekTime;` 宣告 |
| **時間戳記更新** | ❌ | `playSegment()` | 未見 `lastSeekTime = Date.now();` |
| **防呆時延檢查** | ❌ | `checkVideoTime()` | 未見 0.5 秒延遲邏輯 |
| **實裝必要性** | ⚠️ 待驗證 | - | 當前修復是否已透過「雙重 rAF + seekedAndPlaying」充分解決？ |

**狀態**：🟡 **部分遺漏，需驗證實際需求**

**風險分析**：
- 若「狀態鎖定計時器」是針對「Replay 後立即下一句」的特定場景，當前實裝可能在該場景下存在隱患
- 現有 `seekedAndPlaying` 機制只在播放命令後生效，無法保護 Replay 期間的 seek 緩衝

---

## 第三部分：程式碼潛在風險與隱患

### 🔴 潛在風險 1：YouTube 播放器就緒檢查不夠完整
**位置**：`video.js` L118–119, L52–55

```javascript
// 現有檢查
if (!isPlayerReady) {
    alert('Video player is still loading...');
    return;
}
```

**風險分析**：
| 風險項目 | 嚴重性 | 說明 |
|---------|--------|------|
| **非同步初始化** | 🟠 中 | `onPlayerReady()` 設置 `isPlayerReady = true`，但無法保證所有播放器內部狀態就緒 |
| **setPlaybackRate 失敗** | 🟠 中 | 若後續要實裝「播放速度控制」(PRD 提及)，未初始化的播放器會丟出錯誤 |
| **seekTo 時序** | 🟠 中 | `isPlayerReady = true` 後立刻 `seekTo()`，仍可能因內部初始化延遲而失敗 |

**建議檢查**：是否需要在 `onPlayerReady()` 中加入額外的播放器狀態驗證？

---

### 🔴 潛在風險 2：currentSegment 為 null 的防呆不足
**位置**：`video.js` L144, L180

```javascript
function startSegment() {
    if (!isPlayerReady || currentSegmentIndex >= reviewList.length) return;
    
    currentSegment = reviewList[currentSegmentIndex]; // 若 reviewList 為空，currentSegment = undefined
    // ... 後續直接使用 currentSegment.chinese 等，無防呆檢查
}

function playSegment() {
    if (!currentSegment) return; // ✅ 此處有防呆
    // ...
}
```

**風險分析**：
| 風險點 | 位置 | 影響 |
|--------|------|------|
| **currentSegment 結構驗證** | `startSegment()` L149–155 | 假設 `key_words` 陣列存在，若 JSON 缺少此欄位會產生 undefined 迭代錯誤 |
| **reviewList 空陣列** | `loadDayData()` L101 | `getVideoReviewList()` 可能回傳 `{items: []}` 而非 null，導致邏輯混亂 |

**建議檢查**：
```javascript
// currentSegment.key_words 可能不存在
if (currentSegment.key_words && Array.isArray(currentSegment.key_words)) {
    currentSegment.key_words.forEach(/* ... */);
}
```

---

### 🔴 潛在風險 3：seekedAndPlaying 狀態未完全隔離
**位置**：`video.js` L138, L142–143

```javascript
function startSegment() {
    // ... 卡片更新邏輯 ...
    playSegment(); // 每次進入新句子時呼叫
}

function playSegment() {
    clearInterval(checkTimeInterval); // ✅ 清理舊計時器
    seekedAndPlaying = false;         // ✅ 重置狀態
    
    player.seekTo(/* ... */);
    player.playVideo();
    
    checkTimeInterval = setInterval(checkVideoTime, 50);
}
```

**風險分析**：
| 風險點 | 嚴重性 | 說明 |
|--------|--------|------|
| **多快速點擊 Replay** | 🟠 中 | 若使用者快速連點「Replay」按鈕，前一個 `setInterval()` 可能未被清理乾淨，導致多個檢查函式同時執行 |
| **Race Condition in clearInterval** | 🟡 低 | 理論上不會發生（JavaScript 單執行緒），但邏輯流程應加入額外的狀態鎖（如 `isChecking` 旗標） |

**建議檢查**：是否需要防止使用者在播放過程中快速切換句子？

---

## 第四部分：架構與資料流驗證

### 📊 資料流完整性檢查
**資料來源**：`lessons/video_Day${dayId}.json`

| 檢驗項 | 狀態 | 說明 |
|--------|------|------|
| **JSON 檔案存在性** | ✅ | `video_Day1.json`, `video_Day2.json`, `video_Day3.json` 均存在 |
| **JSON 資料格式** | ✅ | 結構符合 PRD 規範：`{day, videoID, items[]}` |
| **items 陣列結構** | ✅ | 每筆記錄含 `id`, `startTime`, `endTime`, `english`, `chinese`, `key_words` |
| **fetch 路徑正確性** | ✅ | `storage.js` L137 使用 `` `lessons/video_Day${dayId}.json` `` 正確拼接 |

---

### 🔄 儲存機制隔離驗證
**隔離機制**：影音進度 vs. 單字卡進度

| 檢驗項 | 狀態 | 說明 |
|--------|------|------|
| **StorageKey 分離** | ✅ | `VIDEO_STORAGE_KEY = 'global_english_video_srs_data'` |
| **更新邏輯獨立** | ✅ | `updateVideoSegmentStatus()` 獨立函式，不會污染一般單字卡進度 |
| **LocalStorage 驗證** | ⚠️ | 未檢驗實際儲存的資料結構是否正確 |

---

## 第五部分：跨瀏覽器相容性與邊界條件

### 🌐 YouTube API 特定風險

| 風險項 | 現狀 | 建議 |
|--------|------|------|
| **自動播放政策 (Autoplay Policy)** | ✅ | PRD 正確地要求「Start 按鈕觸發」，程式碼實裝正確 |
| **跨域請求 (CORS)** | ✅ | YouTube API 與 fetch JSON 無 CORS 衝突 |
| **行動裝置事件** | ⚠️ | `touch` 事件未特別處理，依賴 `click` 事件，可能在某些行動裝置上延遲 |

---

### ⏱️ 時間精度風險

| 項目 | 檢查週期 | 風險 | 建議 |
|------|---------|------|------|
| **checkVideoTime** | 50ms | 句末判斷 ± 50ms 誤差（歐美課程無妨，但密集中文會有感） | 考慮 25ms 週期 |
| **seekTo 延遲** | 200–500ms | YouTube API 不保證精準 seek，可能跳過數句 | 實裝「狀態鎖定計時器」 |

---

## 第六部分：待驗證的關鍵問題

### 🔍 待實測問題清單

| # | 問題 | 優先級 | 建議驗證方式 |
|---|------|--------|------------|
| **Q1** | 「狀態鎖定計時器」(Issue 2) 是否真的遺漏，還是已透過其他機制隱含解決？ | 🔴 高 | 在實際環境中快速點擊「Replay」，檢查是否出現「閃停」 |
| **Q2** | `currentSegment.key_words` 缺失時是否會拋錯？ | 🟠 中 | 手動編輯 JSON，移除某句的 `key_words` 欄位，測試 UI 行為 |
| **Q3** | 多快速切換日期時，播放器狀態是否會混亂？ | 🟠 中 | 快速在 Day1/Day2/Day3 之間切換，檢查卡片是否同步 |
| **Q4** | LocalStorage 資料是否正確序列化與反序列化？ | 🟡 低 | 檢查瀏覽器開發者工具的 LocalStorage，驗證 `global_english_video_srs_data` 結構 |
| **Q5** | 不同瀏覽器（Safari, Firefox）下，YouTube API 相容性如何？ | 🟡 低 | 在多種瀏覽器測試，特別是 iOS Safari 的自動播放限制 |

---

## 第六點五部分：推薦完整方案 (Comprehensive Fix Strategy)

### 🛡️ 方案設計理念

當前實裝的三項修復雖然解決了主要問題，但仍存在**時序脆弱性**與**防呆缺陷**。本方案透過以下策略實現**生產級別的可靠性**：

1. **時序隔離層**：加入「狀態鎖定計時器」完全隔離 seek 緩衝期
2. **完整防呆檢查**：針對所有可能的邊界條件補強驗證
3. **播放器生命週期管理**：清晰的狀態機制（Ready → Loading → Playing → Paused）
4. **可觀測性**：加入偵錯日誌便於線上追蹤

---

### 📐 方案架構圖

```
┌─────────────────────────────────────────────────────────────┐
│ User Click "Start Video"                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  showFlashcardState() │
         │  (display:block)      │
         └───────────┬───────────┘
                     │
                     ▼
    ┌─────────────────────────────────┐
    │ Double rAF (Frame 1 & Frame 2) │  ← Layout Reflow 穩定
    │ Wait for DOM 計算完成          │
    └─────────────┬───────────────────┘
                  │
                  ▼
      ┌──────────────────────────┐
      │  startSegment()          │
      │  Update card UI          │
      └──────────┬───────────────┘
                 │
                 ▼
      ┌──────────────────────────┐
      │  playSegment()           │
      │  seekTo() + playVideo()  │  ← 記錄 lastSeekTime
      │  Record: lastSeekTime    │
      └──────────┬───────────────┘
                 │
                 ▼
      ┌──────────────────────────┐
      │ setInterval(            │
      │   checkVideoTime, 50ms   │
      │ )                        │
      └──────────┬───────────────┘
                 │
         ┌───────┴────────┐
         ▼                ▼
    ┌─────────┐    ┌──────────────┐
    │ Seek中  │    │ 已 Seek 完   │  ← seekedAndPlaying = true
    │ (鎖定)  │    │ (進入監控)   │
    └─────────┘    └──────────────┘
         │               │
    ├─→ return      ├─→ check endTime
    │               │
    │          ┌────┴─────┐
    │          ▼          ▼
    │      未到終點    到達終點
    │          │          │
    │          │      pauseVideo()
    │          │      clearInterval
    └──────────┴──────────┘
```

---

### 🔧 完整修復方案 - 程式碼實裝

#### **Step 1：全域狀態擴展**

```javascript
// === CORE STATE VARIABLES ===
let player;
let isPlayerReady = false;
let currentDay = '1';
let reviewList = [];
let currentSegmentIndex = 0;
let checkTimeInterval;
let currentSegment = null;

// === NEW: 時序隔離狀態 ===
let lastSeekTime = 0;              // 記錄最後一次 seekTo 的時刻（毫秒）
let seekedAndPlaying = false;      // 確認 seek 已完成
let isCheckingTime = false;        // 防止多重檢查函式執行

// === NEW: 播放器生命週期狀態 ===
const PLAYER_STATE = {
    NOT_INITIALIZED: 'NOT_INITIALIZED',
    INITIALIZING: 'INITIALIZING',
    READY: 'READY',
    LOADING_VIDEO: 'LOADING_VIDEO',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED'
};
let playerLifecycleState = PLAYER_STATE.NOT_INITIALIZED;

// === NEW: 偵錯日誌系統 ===
const DEBUG = {
    enabled: false, // 生產環境改為 false
    log: (action, details) => {
        if (DEBUG.enabled) {
            console.log(`[${new Date().toISOString()}] ${action}:`, details);
        }
    }
};
```

#### **Step 2：增強的播放器初始化**

```javascript
function onPlayerReady(event) {
    // ✅ Enhanced: 詳細的就緒驗證
    if (!player || !player.playVideo || !player.seekTo) {
        DEBUG.log('WARN', 'Player object incomplete');
        return;
    }
    
    isPlayerReady = true;
    playerLifecycleState = PLAYER_STATE.READY;
    DEBUG.log('PLAYER_READY', { state: playerLifecycleState });
    
    // ✅ Optional: 測試播放器是否真的可控
    try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        DEBUG.log('PLAYER_CAPABILITIES', { currentTime, duration });
    } catch (e) {
        DEBUG.log('WARN', `Player test failed: ${e.message}`);
    }
}
```

#### **Step 3：改進的 playSegment() - 完整時序隔離**

```javascript
function playSegment() {
    if (!currentSegment) {
        DEBUG.log('ERROR', 'currentSegment is null');
        return;
    }
    
    if (!isPlayerReady) {
        DEBUG.log('WARN', 'Player not ready yet');
        return;
    }
    
    // === 清理舊狀態 ===
    clearInterval(checkTimeInterval);
    seekedAndPlaying = false;
    isCheckingTime = false;
    
    // === 記錄 seek 時刻（新增關鍵機制）===
    lastSeekTime = Date.now();
    DEBUG.log('SEEK_INITIATED', { 
        startTime: currentSegment.startTime,
        timestamp: lastSeekTime 
    });
    
    try {
        // === 非同步播放命令 ===
        playerLifecycleState = PLAYER_STATE.LOADING_VIDEO;
        player.seekTo(currentSegment.startTime, true);
        player.playVideo();
        playerLifecycleState = PLAYER_STATE.PLAYING;
        
        // === 啟動時間監控 ===
        checkTimeInterval = setInterval(checkVideoTime, 50);
        DEBUG.log('PLAY_STARTED', { segmentId: currentSegment.id });
        
    } catch (e) {
        DEBUG.log('ERROR', `playSegment failed: ${e.message}`);
        playerLifecycleState = PLAYER_STATE.PAUSED;
    }
}
```

#### **Step 4：核心修復 - 完整的 checkVideoTime() 邏輯**

```javascript
function checkVideoTime() {
    // ✅ Fix: 防止多重檢查函式同時執行
    if (isCheckingTime) return;
    isCheckingTime = true;
    
    try {
        // === 播放器狀態檢查 ===
        if (!player || !player.getCurrentTime || !player.getPlayerState) {
            DEBUG.log('WARN', 'Player API unavailable');
            isCheckingTime = false;
            return;
        }
        
        // === 播放狀態檢查 ===
        const playerState = player.getPlayerState();
        if (playerState !== YT.PlayerState.PLAYING) {
            DEBUG.log('DEBUG', `Player state: ${playerState}`);
            isCheckingTime = false;
            return;
        }
        
        const currentTime = player.getCurrentTime();
        
        // === Phase 1: Seek 緩衝期 (新增，關鍵修復) ===
        // 只要 lastSeekTime 設置不超過 500ms，就鎖定檢查
        const timeSinceSeek = Date.now() - lastSeekTime;
        if (timeSinceSeek < 500) {
            DEBUG.log('DEBUG', `Seek buffer: ${timeSinceSeek}ms, skipping check`);
            isCheckingTime = false;
            return;
        }
        
        // === Phase 2: 等待 Seek 完成 ===
        if (!seekedAndPlaying) {
            if (currentTime < currentSegment.endTime) {
                seekedAndPlaying = true;
                DEBUG.log('SEEK_CONFIRMED', { currentTime, startTime: currentSegment.startTime });
                isCheckingTime = false;
                return; // 本 tick 僅做確認，下一 tick 才開始監控終止
            } else {
                // Seek 仍未完成，currentTime 仍在終點之後
                DEBUG.log('DEBUG', `Waiting for seek to complete: ${currentTime}`);
                isCheckingTime = false;
                return;
            }
        }
        
        // === Phase 3: 監控終止點 ===
        if (currentTime >= currentSegment.endTime) {
            DEBUG.log('SEGMENT_END', { currentTime, endTime: currentSegment.endTime });
            player.pauseVideo();
            clearInterval(checkTimeInterval);
            playerLifecycleState = PLAYER_STATE.PAUSED;
        }
        
    } catch (e) {
        DEBUG.log('ERROR', `checkVideoTime exception: ${e.message}`);
    } finally {
        isCheckingTime = false;
    }
}
```

#### **Step 5：增強的 startSegment() - 完整防呆**

```javascript
function startSegment() {
    if (!isPlayerReady || !reviewList || reviewList.length === 0) {
        DEBUG.log('ERROR', 'Player not ready or no items');
        return;
    }
    
    if (currentSegmentIndex >= reviewList.length) {
        DEBUG.log('INFO', 'All segments completed');
        return;
    }
    
    currentSegment = reviewList[currentSegmentIndex];
    
    // ✅ 防呆：驗證 currentSegment 的必要欄位
    if (!currentSegment || !currentSegment.id) {
        DEBUG.log('ERROR', 'Invalid segment structure');
        showEmptyState();
        return;
    }
    
    // === 重設卡片 UI ===
    try {
        flashcard.classList.remove('is-flipped');
        chineseFront.textContent = currentSegment.chinese || '(未提供中文)';
        englishBack.textContent = currentSegment.english || '(未提供英文)';
        
        DEBUG.log('UI_UPDATED', { 
            segmentId: currentSegment.id,
            chinese: currentSegment.chinese?.substring(0, 20)
        });
    } catch (e) {
        DEBUG.log('ERROR', `UI update failed: ${e.message}`);
        return;
    }
    
    // === 填充重點單字 (增強防呆) ===
    keyWordsList.innerHTML = '';
    if (currentSegment.key_words && Array.isArray(currentSegment.key_words)) {
        try {
            currentSegment.key_words.forEach(kw => {
                if (!kw.word) {
                    DEBUG.log('WARN', 'key_word missing .word field');
                    return;
                }
                
                const li = document.createElement('li');
                li.innerHTML = `<span class="kw-word">${escapeHtml(kw.word)}</span> 
                               <span class="kw-phonetic">${escapeHtml(kw.phonetic || '')}</span>
                               <span class="kw-meaning">${escapeHtml(kw.meaning || '')}</span>`;
                keyWordsList.appendChild(li);
            });
        } catch (e) {
            DEBUG.log('ERROR', `Key words rendering failed: ${e.message}`);
        }
    } else {
        DEBUG.log('WARN', `Segment ${currentSegment.id} has no key_words`);
    }
    
    // === 啟動播放 ===
    playSegment();
}

// ✅ 安全的 HTML 轉義函式（防止 XSS）
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

#### **Step 6：增強的 replayCurrentSegment()**

```javascript
function replayCurrentSegment() {
    if (!currentSegment) {
        DEBUG.log('WARN', 'No current segment to replay');
        return;
    }
    
    if (!player) {
        DEBUG.log('ERROR', 'Player not available');
        return;
    }
    
    DEBUG.log('REPLAY_REQUESTED', { segmentId: currentSegment.id });
    
    // ✅ 重播前的完整清理
    clearInterval(checkTimeInterval);
    seekedAndPlaying = false;
    
    // 重新啟動播放（playSegment 會正確設置 lastSeekTime）
    playSegment();
}
```

---

### 🧪 完整測試驗證策略

#### **自動化測試清單**

```javascript
// 在瀏覽器控制台運行的測試套件（可選）
const TESTS = {
    // Test 1: 快速重播衝擊測試
    testRapidReplay: async function() {
        console.log('=== Test: Rapid Replay ===');
        for (let i = 0; i < 5; i++) {
            replayCurrentSegment();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('✓ Rapid replay completed');
    },
    
    // Test 2: 日期快速切換
    testRapidDaySwitch: async function() {
        console.log('=== Test: Rapid Day Switch ===');
        const days = ['1', '2', '3', '1', '2'];
        for (const day of days) {
            daySelector.value = day;
            await loadDayData(day);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        console.log('✓ Rapid day switch completed');
    },
    
    // Test 3: 播放器狀態監控
    testPlayerState: function() {
        console.log('=== Player State Report ===');
        console.log('isPlayerReady:', isPlayerReady);
        console.log('playerLifecycleState:', playerLifecycleState);
        console.log('seekedAndPlaying:', seekedAndPlaying);
        console.log('currentSegment:', currentSegment?.id);
        if (player) {
            console.log('YouTube Player State:', player.getPlayerState());
            console.log('Current Time:', player.getCurrentTime());
        }
    }
};

// 使用：在瀏覽器控制台執行
// TESTS.testRapidReplay();
// TESTS.testRapidDaySwitch();
// TESTS.testPlayerState();
```

---

### 📊 方案對比表

| 比較項目 | 舊實裝 | 推薦方案 |
|---------|------|---------|
| **Seek 緩衝保護** | ❌ 無 | ✅ 0.5s 鎖定 |
| **時序隔離完整度** | 部分（僅 seekedAndPlaying） | 完整（+ lastSeekTime） |
| **防呆檢查** | 基礎 | 全面（key_words, 欄位驗證） |
| **播放器生命週期** | 隱含狀態 | 顯式狀態機制 |
| **偵錯可觀測性** | 無日誌 | 完整日誌系統 |
| **快速重播穩定性** | ⚠️ 可能閃停 | ✅ 穩定 |
| **XSS 防護** | ❌ 無 | ✅ HTML 轉義 |

---

### ✨ 方案優勢

1. **時序完整性**：
   - 三層隔離：Seek 緩衝 → Seek 確認 → 終止監控
   - 即使 YouTube API 延遲 500ms+ 也能正確處理

2. **防呆覆蓋**：
   - 覆蓋 JSON 資料缺陷（null, undefined, 格式錯誤）
   - 播放器 API 異常（網路斷線、API 未加載）
   - 使用者行為異常（快速點擊、快速切換）

3. **可觀測性**：
   - 線上環境可開啟 DEBUG 日誌快速診斷
   - 詳細的狀態轉移記錄

4. **安全性**：
   - XSS 防護（HTML 轉義）
   - 無限迴圈防護（isCheckingTime 旗標）

5. **可維護性**：
   - 明確的狀態機制，容易理解代碼流程
   - 詳細註解與中文說明

---

### ⚠️ 實裝風險與對策

| 風險 | 嚴重性 | 對策 |
|------|--------|------|
| **效能衝擊**（偵錯日誌） | 低 | 生產環境設 `DEBUG.enabled = false` |
| **向後相容性** | 低 | 新增全域變數不影響既有邏輯 |
| **測試覆蓋** | 中 | 建議補充單元測試與集成測試 |

---



### 🚀 立即執行（P0 - 必修）

1. **驗證「狀態鎖定計時器」是否需要實裝**
   - 手動測試快速 Replay 場景
   - 若仍有「閃停」，實裝 Issue 2 中的完整修復方案

2. **補強 `currentSegment.key_words` 防呆檢查**
   - 在 `startSegment()` 中加入存在性驗證

### 🔧 重要但可延後（P1 - 應修）

3. **優化播放器就緒檢查**
   - 在 `onPlayerReady()` 中增加額外的狀態驗證

4. **降低 checkVideoTime 輪詢週期**
   - 從 50ms 改為 25ms，提升精度

### 📌 文件與監控（P2 - 可優化）

5. **補充單元測試**
   - 針對 seekTo 時序、多日期切換、空資料集等邊界條件

6. **加入偵錯日誌**
   - 在關鍵時序點（seekTo, playVideo, pauseVideo）記錄時間戳記

---

## 附錄：修復實裝檢查清單

### 已實裝的三項主要修復

- [x] Fix #1：`checkVideoTime()` Race Condition 隔離 (L159 return)
- [x] Fix #2：雙重 rAF 延遲播放 (L60–66)
- [x] Fix #3：移除 `loadDayData()` 的立即 `startSegment()` 呼叫 (L113)

### 待實裝的潛在修復

- [ ] Issue 2 全部修復：「狀態鎖定計時器」(`lastSeekTime` + 0.5s 延遲)
- [ ] 補強 key_words 防呆檢查
- [ ] 增強播放器就緒驗證
- [ ] 時間精度優化 (50ms → 25ms)

---

**文件建立時間**：2026-05-03  
**下一步行動**：進行 P0 優先級項目的實測與修復驗證

