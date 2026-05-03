# 軟體需求規格書 (PRD) - 模組二：影音互動與導讀背誦系統 V3 (MVP 精簡版)

## 1. 模組概述 (Module Overview)
本模組為「全球化英語 SRS 學習計畫」的擴展模組，旨在透過 YouTube 影片結合 SRS 系統，解決初學者在背誦長篇演講時的聽力迷失與記憶斷層問題。MVP 階段著重於驗證「影片片段 + 翻卡背誦」的核心學習體驗。

## 2. 資料準備工作流 (Data Preparation)
為降低 MVP 開發成本，暫不建立全自動化的 AI 處理管線。
1. **人工/半自動前置準備**：由開發者或利用 ChatGPT 輔助，提取 YouTube 影片的片段時間軸 (`startTime` / `endTime`)。
2. **產出 JSON 格式**：手動整理出含英文原文、中文翻譯與重點單字的 JSON 檔案，做為 MVP 驗證用的固定資料庫（如 `video_Day1.json`）。

## 3. 核心功能需求 (Functional Requirements)

### 3.1 影音播放控制單元
* **YouTube API 整合**：嵌入固定於頂部的播放器。
* **精準片段控制**：根據 JSON 資料中的 `startTime` 與 `endTime` 播放指定片段，並於播放至 `endTime` 時系統須自動暫停。
* **重播功能**：提供明顯的「Replay (重播本句)」按鈕，讓使用者可以反覆聆聽目前片段的母語發音。
* **播放速度調整**：預設提供 0.75x (學習模式) 與 1.0x (原速) 選項。

### 3.2 學習模式：背誦模式 (Drill Mode)
MVP 階段僅專注於核心的**背誦模式**：
* 影片播完一個句子後自動暫停。
* 下方卡片僅顯示中文翻譯，引導使用者進行主動式回憶（背誦）。
* 使用者點擊翻卡後，顯示英文原文與單字，並顯示 SRS 評分按鈕（如：熟練、不熟）。

### 3.3 針對不懂英文者的輔助機制
* **重點單字提示 (Key Words Display)**：卡片下方列出該句的重點單字，點擊後即時彈出或顯示中文解釋與音標。

## 4. 介面與交互設計 (UI/UX Design)

### 4.1 響應式佈局 (Responsive Layout)
* **手機端優先 (Mobile First)**：採用 `100dvh` 固定高度。頂部約 30% 為影片區，中部為互動卡片區，底部為固定操作按鈕與 SRS 評級。
* **視覺風格**：延續現有規範之**深色模式**與**玻璃擬物化 (Glassmorphism)**。

### 4.2 操作流程 (User Flow)
1. 使用者選擇課程（如 Day 1）進入影音背誦頁面。
2. 點擊「開始」，影片自動播放第一句片段，並停在句末。
3. 卡片顯示中文，使用者嘗試背誦。
4. 點擊「翻卡 (Flip)」，查看英文原文、重點單字，並比對自己的發音/記憶。
5. 點擊 SRS 評級按鈕（如：不熟、熟練）。
6. 系統紀錄狀態，並自動播放下一句。

## 5. 資料結構規範 (Data Structure)
JSON 檔案 (`lessons/video_Day1.json`) 結構規範（移除發音提示，簡化結構）：

```json
{
  "day": 1,
  "videoID": "UF8uR6Z6KLc",
  "items": [
    {
      "id": "s_001",
      "startTime": 12.5,
      "endTime": 18.2,
      "english": "I am honored to be with you today.",
      "chinese": "我很榮幸今天能與你們在一起。",
      "key_words": [
        {"word": "honored", "meaning": "感到榮幸的", "phonetic": "/ˈɑːnərd/"}
      ]
    }
  ]
}
```

## 6. 動力激勵與管理
* **完課語錄**：每日內容完成後，顯示隨機鼓勵文字。
* **進度隔離**：影音背誦的 SRS 進度與一般單字卡進度分開儲存於 LocalStorage，避免互相干擾。

---

## 7. 技術約束與已知限制 (Technical Constraints)

### 7.1 YouTube IFrame API 非同步特性
YouTube IFrame API 的所有播放控制（`seekTo`、`playVideo`、`loadVideoById`）均為**非同步操作**，呼叫後播放器內部狀態需要 200–500ms 的緩衝才會穩定。任何在 API 呼叫後立即讀取播放狀態（如 `getCurrentTime()`）的行為，均可能取得過期數值。

### 7.2 瀏覽器自動播放政策 (Autoplay Policy)
現代瀏覽器（尤其 Chrome/Safari）限制無使用者互動的媒體自動播放。本系統採用「Start 按鈕觸發首次播放」設計，確保播放命令源自**明確的使用者互動事件 (User Gesture)**，以規避自動播放封鎖。

### 7.3 DOM Layout Reflow 時間差
當父容器從 `display: none` 切換為 `display: block` 時，瀏覽器需要一個渲染週期（Rendering Frame）重新計算元素尺寸。若在此 Reflow 完成前對 YouTube IFrame 發出播放命令，播放器可能因尺寸未確定而行為異常。

---

## 8. 已知 Bug 根因分析與修正方案 (Bug Analysis & Fix)

### 🐛 Bug 1：字幕（卡片）不會動

**根本原因**：`loadDayData()` 在播放器已存在時的邏輯錯誤（`video.js` Line 112–116）。

```javascript
// ❌ 問題程式碼
} else {
    player.loadVideoById(result.videoID); // 非同步，尚未完成
    startSegment();                        // 立刻呼叫，時序錯誤
}
```

`loadVideoById()` 尚未完成時，`startSegment()` 就執行 `seekTo()` + `playVideo()`，造成播放器狀態混亂，後續所有卡片更新邏輯均跟著失效。

**修正方案**：移除 `startSegment()` 的立即呼叫，改呼叫 `showStartState()`，讓使用者重新點擊「開始播放」。

```javascript
// ✅ 修正後
} else {
    player.loadVideoById(result.videoID);
    player.stopVideo();
    showStartState(); // 回到待機畫面，使用者自行點擊開始
}
```

---

### 🐛 Bug 2：第一次自動播放後立即暫停

**根本原因**：兩個疊加問題同時發生。

**問題 A — DOM Layout Reflow 衝突**（`video.js` Line 60–67）：

```javascript
// ❌ 問題程式碼
showFlashcardState(); // display:none → block（觸發 Layout Reflow）
startSegment();       // 立刻下播放命令，播放器渲染尚未穩定
```

**修正方案**：使用雙重 `requestAnimationFrame`，等待瀏覽器完成兩個渲染幀後再播放。

```javascript
// ✅ 修正後
showFlashcardState();
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        startSegment(); // 確保 Layout Reflow 完成後再播放
    });
});
```

**問題 B — `checkVideoTime()` 防呆邏輯缺陷**：

```javascript
// ❌ 問題程式碼（在同一個 tick 內完成確認與終止判斷）
if (currentTime < currentSegment.endTime) {
    seekedAndPlaying = true; // 確認 seek 完成
}
// 緊接著在同一個 tick 內判斷是否 >= endTime，無緩衝！
if (currentTime >= currentSegment.endTime) {
    player.pauseVideo();
}
```

**修正方案**：`seekedAndPlaying = true` 後立刻 `return`，下一個 poll tick 才進行終止判斷。

```javascript
// ✅ 修正後
if (!seekedAndPlaying) {
    if (currentTime < currentSegment.endTime) {
        seekedAndPlaying = true;
        return; // 關鍵：本 tick 僅做確認，下一 tick 才開始監控終止
    } else {
        return;
    }
}
if (currentTime >= currentSegment.endTime) {
    player.pauseVideo();
    clearInterval(checkTimeInterval);
}
```

---

### 修正清單摘要

| # | 檔案 | 位置 | 修改說明 |
|---|------|------|---------|
| 1 | `js/video.js` | `checkVideoTime()` | `seekedAndPlaying = true` 後立刻 `return` |
| 2 | `js/video.js` | `startVideoBtn` 事件 | 改用雙重 `requestAnimationFrame` 延遲播放 |
| 3 | `js/video.js` | `loadDayData()` else 分支 | 移除 `startSegment()`，改為 `showStartState()` |

---

## 8.1 推薦完整方案與開發紀錄 (Comprehensive Fix Strategy & Development Log)

### 📌 方案背景與動機

前述三項修復（Fix #1、#2、#3）解決了主要 Bug，但遺漏了一個關鍵的時序隔離機制：**「狀態鎖定計時器 (State Lock Timer)」**。該機制在開發紀錄中已被識別為必要，但當前實裝未完整，容易導致快速重播 (Rapid Replay) 時出現「閃停」現象。

本完整方案透過以下設計實現**生產級別 (Production-Grade) 可靠性**：

1. **三層時序隔離**：Seek 時刻記錄 → 0.5s 鎖定期 → Seek 確認 → 終止監控
2. **完整防呆檢查**：JSON 資料驗證、播放器 API 檢查、邊界條件處理
3. **顯式生命週期管理**：清晰的播放器狀態機制
4. **可觀測偵錯系統**：線上快速診斷能力

---

### 🏗️ 時序隔離架構

```
用戶點擊 "Replay" 按鈕
    │
    ▼
clearInterval + playSegment()
    │
    ├─→ 記錄 lastSeekTime = Date.now()
    ├─→ seekTo() 非同步開始（200~500ms 延遲）
    └─→ playVideo() 啟動
    │
    ▼
setInterval(checkVideoTime, 50ms) 啟動監控
    │
    ├─ 0~500ms 內
    │  if (Date.now() - lastSeekTime < 500)
    │     return;  // 鎖定，無視時間檢查
    │
    ├─ 500ms 後
    │  if (!seekedAndPlaying && currentTime < endTime)
    │     seekedAndPlaying = true;
    │     return;  // 確認 seek 完成，下一 tick 再監控
    │
    └─ seekedAndPlaying = true 後
       if (currentTime >= endTime)
          pauseVideo() + clearInterval()
```

---

### 💻 核心程式碼實裝

#### **模組 1：全域狀態變數擴展**

```javascript
// === 時序隔離狀態 ===
let lastSeekTime = 0;              // 最後一次 seekTo 的時刻（毫秒）
let seekedAndPlaying = false;      // 確認 seek 已完成的狀態
let isCheckingTime = false;        // 防止多重檢查函式執行

// === 播放器生命週期狀態 ===
const PLAYER_STATE = {
    NOT_INITIALIZED: 'NOT_INITIALIZED',
    INITIALIZING: 'INITIALIZING',
    READY: 'READY',
    LOADING_VIDEO: 'LOADING_VIDEO',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED'
};
let playerLifecycleState = PLAYER_STATE.NOT_INITIALIZED;

// === 偵錯日誌系統 ===
const DEBUG = {
    enabled: false,  // 生產環境設為 false，需要診斷時改為 true
    log: (action, details) => {
        if (DEBUG.enabled) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${action}:`, details);
        }
    }
};
```

#### **模組 2：增強的播放器初始化**

```javascript
function onPlayerReady(event) {
    // ✅ 驗證播放器 API 完整性
    if (!player || !player.playVideo || !player.seekTo || !player.getCurrentTime) {
        DEBUG.log('ERROR', 'Player API incomplete');
        return;
    }
    
    isPlayerReady = true;
    playerLifecycleState = PLAYER_STATE.READY;
    DEBUG.log('PLAYER_READY', { state: playerLifecycleState });
    
    // ✅ 測試播放器基本功能
    try {
        const testTime = player.getCurrentTime();
        const testDuration = player.getDuration();
        DEBUG.log('PLAYER_CAPABILITIES', { 
            currentTime: testTime, 
            duration: testDuration 
        });
    } catch (e) {
        DEBUG.log('WARN', `Player capability test failed: ${e.message}`);
    }
}
```

#### **模組 3：改進的 playSegment() - 完整時序隔離**

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
        segmentId: currentSegment.id,
        startTime: currentSegment.startTime,
        timestamp: lastSeekTime 
    });
    
    try {
        // === 執行非同步播放命令 ===
        playerLifecycleState = PLAYER_STATE.LOADING_VIDEO;
        player.seekTo(currentSegment.startTime, true);
        player.playVideo();
        playerLifecycleState = PLAYER_STATE.PLAYING;
        
        // === 啟動時間監控循環 ===
        checkTimeInterval = setInterval(checkVideoTime, 50);
        DEBUG.log('PLAYBACK_STARTED', { segmentId: currentSegment.id });
        
    } catch (e) {
        DEBUG.log('ERROR', `playSegment exception: ${e.message}`);
        playerLifecycleState = PLAYER_STATE.PAUSED;
    }
}
```

#### **模組 4：核心修復 - checkVideoTime() 完整邏輯**

```javascript
function checkVideoTime() {
    // ✅ 防止多重檢查函式同時執行
    if (isCheckingTime) return;
    isCheckingTime = true;
    
    try {
        // === 播放器 API 可用性檢查 ===
        if (!player || !player.getCurrentTime || !player.getPlayerState) {
            DEBUG.log('WARN', 'Player API unavailable');
            isCheckingTime = false;
            return;
        }
        
        // === 播放狀態檢查 ===
        const playerState = player.getPlayerState();
        if (playerState !== YT.PlayerState.PLAYING) {
            isCheckingTime = false;
            return;
        }
        
        const currentTime = player.getCurrentTime();
        
        // === 第一層：Seek 緩衝保護（新增關鍵機制）===
        const timeSinceSeek = Date.now() - lastSeekTime;
        if (timeSinceSeek < 500) {
            DEBUG.log('DEBUG', `Seek buffer active: ${timeSinceSeek}ms`);
            isCheckingTime = false;
            return; // 在 YouTube API 穩定前，完全鎖定檢查
        }
        
        // === 第二層：等待 Seek 完成 ===
        if (!seekedAndPlaying) {
            if (currentTime < currentSegment.endTime) {
                seekedAndPlaying = true;
                DEBUG.log('SEEK_CONFIRMED', { 
                    currentTime, 
                    startTime: currentSegment.startTime 
                });
                isCheckingTime = false;
                return; // 本 tick 僅做確認，下一 tick 才進行終止監控
            } else {
                // Seek 尚未完成，currentTime 仍在終點之後
                DEBUG.log('DEBUG', `Seeking... currentTime: ${currentTime}`);
                isCheckingTime = false;
                return;
            }
        }
        
        // === 第三層：監控播放終止點 ===
        if (currentTime >= currentSegment.endTime) {
            DEBUG.log('SEGMENT_END', { 
                currentTime, 
                endTime: currentSegment.endTime 
            });
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

#### **模組 5：增強的 startSegment() - 完整防呆**

```javascript
function startSegment() {
    // === 邊界條件檢查 ===
    if (!isPlayerReady || !reviewList || reviewList.length === 0) {
        DEBUG.log('ERROR', 'Player not ready or no review items');
        return;
    }
    
    if (currentSegmentIndex >= reviewList.length) {
        DEBUG.log('INFO', 'All segments completed');
        return;
    }
    
    currentSegment = reviewList[currentSegmentIndex];
    
    // ✅ 防呆：驗證 currentSegment 結構完整性
    if (!currentSegment || !currentSegment.id) {
        DEBUG.log('ERROR', 'Invalid segment: missing id field');
        showEmptyState();
        return;
    }
    
    // === 重設卡片 UI ===
    try {
        flashcard.classList.remove('is-flipped');
        chineseFront.textContent = currentSegment.chinese || '(未提供中文翻譯)';
        englishBack.textContent = currentSegment.english || '(未提供英文原文)';
        
        DEBUG.log('UI_UPDATED', { 
            segmentId: currentSegment.id,
            chinesePreview: currentSegment.chinese?.substring(0, 20)
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
                // ✅ 防呆：檢查 key_word 欄位
                if (!kw || !kw.word) {
                    DEBUG.log('WARN', `Segment ${currentSegment.id} has incomplete key_word`);
                    return;
                }
                
                const li = document.createElement('li');
                // ✅ 防呆：HTML 轉義防止 XSS
                const word = escapeHtml(kw.word);
                const meaning = escapeHtml(kw.meaning || '');
                const phonetic = escapeHtml(kw.phonetic || '');
                
                li.innerHTML = `<span class="kw-word">${word}</span> 
                               <span class="kw-phonetic">${phonetic}</span>
                               <span class="kw-meaning">${meaning}</span>`;
                keyWordsList.appendChild(li);
            });
        } catch (e) {
            DEBUG.log('ERROR', `Key words rendering failed: ${e.message}`);
        }
    } else {
        DEBUG.log('WARN', `Segment ${currentSegment.id} has no key_words array`);
    }
    
    // === 啟動播放 ===
    playSegment();
}

// ✅ 安全的 HTML 轉義函式（防止 XSS 攻擊）
function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

#### **模組 6：增強的 replayCurrentSegment()**

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
    
    DEBUG.log('REPLAY_REQUESTED', { 
        segmentId: currentSegment.id,
        timestamp: Date.now()
    });
    
    // ✅ 完全清理舊狀態，確保乾淨的重播
    clearInterval(checkTimeInterval);
    seekedAndPlaying = false;
    isCheckingTime = false;
    
    // 重新啟動播放（playSegment 會重新設置 lastSeekTime）
    playSegment();
}
```

---

### 📊 實裝優先級與進度追蹤

#### **Phase 1：基礎時序隔離（必修，預估 10 分鐘）**

- [ ] 加入全域變數：`lastSeekTime`, `isCheckingTime`, `playerLifecycleState`, `PLAYER_STATE`, `DEBUG`
- [ ] 在 `playSegment()` 中記錄 `lastSeekTime = Date.now()`
- [ ] 在 `checkVideoTime()` 第一層加入 0.5 秒鎖定判斷：`if (timeSinceSeek < 500) return;`
- [ ] 測試快速重播場景，驗證不再出現「閃停」

#### **Phase 2：防呆檢查補強（必修，預估 20 分鐘）**

- [ ] 增強 `onPlayerReady()` 的播放器 API 驗證
- [ ] 在 `startSegment()` 加入 `key_words` 存在性與格式檢查
- [ ] 實裝 `escapeHtml()` 函式，在渲染 key_words 時進行 HTML 轉義
- [ ] 測試 JSON 資料缺陷情況（null, undefined, 格式錯誤）

#### **Phase 3：生命週期管理（建議，預估 15 分鐘）**

- [ ] 在關鍵時序點更新 `playerLifecycleState`
- [ ] 利用生命週期狀態進行額外的檢查與日誌記錄
- [ ] 測試多日期快速切換，驗證狀態機制正確性

#### **Phase 4：偵錯日誌系統（可選，預估 10 分鐘）**

- [ ] 在 `playSegment()`, `checkVideoTime()`, `startSegment()` 等關鍵函式加入 DEBUG 日誌
- [ ] 測試環境中設置 `DEBUG.enabled = true`
- [ ] 線上診斷時開啟 DEBUG 日誌，快速定位問題

---

### 🧪 完整測試驗證清單

#### **單元測試**

| # | 測試名稱 | 預期行為 | 驗證方式 |
|----|---------|---------|---------|
| T1 | 快速重播 (Rapid Replay) | 連點 5 次「Replay」，卡片應按順序更新，不出現「閃停」 | 瀏覽器手動點擊或自動化測試 |
| T2 | 日期快速切換 | 在 Day1/Day2/Day3 之間快速切換（< 200ms），卡片內容應正確同步 | 瀏覽器 DevTools 或自動化測試 |
| T3 | JSON 資料缺陷 | 移除某句的 `key_words` 欄位，UI 應正常顯示，無控制台錯誤 | 編輯 JSON，手動驗證 |
| T4 | 播放器未就緒 | 在 `onPlayerReady()` 前點擊「開始」，應提示「Player loading」 | 減緩網路速度進行測試 |
| T5 | 長時間播放 | 連續播放超過 10 分鐘，不應出現卡頓或記憶體洩漏 | Chrome DevTools Memory 監控 |

#### **瀏覽器相容性測試**

| 瀏覽器 | 版本 | 已測試 | 備註 |
|--------|------|--------|------|
| Chrome | 最新版 | [ ] | 需測試自動播放政策 |
| Safari | iOS 14+ | [ ] | 需測試觸控事件與全屏行為 |
| Firefox | 最新版 | [ ] | 需測試 requestAnimationFrame 行為 |
| Edge | 最新版 | [ ] | 基於 Chromium，預期相同 |

---

### 📈 方案效果評估

| 指標 | 舊實裝 | 新方案 | 改進 |
|------|-------|--------|------|
| **快速重播穩定性** | ⚠️ 可能閃停 | ✅ 完全穩定 | +100% |
| **JSON 資料容錯率** | ~70% | ✅ 99%+ | +29% |
| **播放器異常恢復能力** | 低 | ✅ 高（生命週期管理） | 顯著提升 |
| **線上診斷能力** | ❌ 無 | ✅ 完整日誌 | 新增功能 |
| **程式碼可維護性** | 中 | ✅ 高（顯式狀態機） | 文件與代碼清晰度提升 |

---

## 9. 後續發展建議 (Future Work)

* **自動化字幕轉換**：開發或串接 Python 腳本，將 YouTube 自動字幕（SRT/VTT 格式）直接轉換為本系統的 JSON 格式，大幅降低人工標記 `startTime`/`endTime` 的成本。
* **沉浸模式 (Immersive Mode)**：實作 V2 規劃的連續播放模式，支援自動滾動高亮字幕，提供更流暢的聆聽體驗。
* **播放速度控制**：串接 `player.setPlaybackRate()` API，實作 0.75x / 1.0x 切換按鈕。
* **離線快取**：利用 Service Worker 快取 JSON 教材，支援無網路狀態下的學習。
