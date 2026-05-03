# 完整方案實裝前評估與計畫 (Pre-Implementation Assessment)

**文件版本**：v1.0  
**評估日期**：2026-05-03  
**評估人**：AI 資深除錯工程師  
**狀態**：待討論確認  

---

## 第一部分：現況分析 (Current State Analysis)

### 1.1 當前實裝的三項修復狀態

| 修復項 | 實裝位置 | 代碼行數 | 狀態 | 備註 |
|--------|---------|---------|------|------|
| **Fix #1：Race Condition** | `checkVideoTime()` | L215–220 | ✅ 已實裝 | `seekedAndPlaying = true` 後 `return` |
| **Fix #2：雙重 rAF** | `startVideoBtn` 事件 | L60–66 | ✅ 已實裝 | DOM Reflow 等待完成 |
| **Fix #3：loadVideoById** | `loadDayData()` else 分支 | L112–116 | ✅ 已實裝 | 移除立即 `startSegment()` 呼叫 |

### 1.2 當前代碼結構映射

```
js/video.js (~280 行)
├─ 全域變數 (L1–27)
│  ├─ player, isPlayerReady, currentDay
│  ├─ reviewList, currentSegmentIndex, checkTimeInterval
│  ├─ currentSegment
│  └─ DOM Elements 16 個
│
├─ 初始化 (L29–68)
│  ├─ init()
│  └─ 事件監聽 (5 個)
│
├─ 資料加載 (L70–116)
│  ├─ populateDaySelector()
│  ├─ loadDayData()
│  └─ onYouTubeIframeAPIReady()
│
├─ 播放器管理 (L118–145)
│  ├─ createPlayer()
│  ├─ onPlayerReady()
│  └─ onPlayerStateChange()
│
├─ 播放核心 (L147–232)
│  ├─ startSegment()
│  ├─ playSegment()
│  └─ checkVideoTime() ⭐ 關鍵函數
│
├─ 使用者互動 (L234–249)
│  ├─ replayCurrentSegment()
│  ├─ flipCard()
│  └─ handleSrsAction()
│
└─ UI 管理 (L251–271)
   ├─ showEmptyState()
   ├─ showFlashcardState()
   └─ showStartState()
```

### 1.3 全域變數現況

**現有全域變數**（11 個）：
```javascript
let player;                    // ✅
let isPlayerReady;            // ✅
let currentDay;               // ✅
let reviewList;               // ✅
let currentSegmentIndex;      // ✅
let checkTimeInterval;        // ✅
let currentSegment;           // ✅
let seekedAndPlaying;         // ✅（Fix #1 引入）
```

**新增全域變數**（提議方案中）：
```javascript
let lastSeekTime;                    // ❌ 新增
let isCheckingTime;                  // ❌ 新增
const PLAYER_STATE;                  // ❌ 新增
let playerLifecycleState;            // ❌ 新增
const DEBUG;                         // ❌ 新增
```

---

## 第二部分：改動影響分析 (Impact Analysis)

### 2.1 需要修改的函數清單

| 函數名 | 現行代碼行 | 修改內容 | 複雜度 | 風險等級 |
|--------|-----------|---------|--------|---------|
| `onPlayerReady()` | L138–141 | 增強 API 驗證 + 測試播放 | 低 | 🟡 中 |
| `playSegment()` | L198–207 | 記錄 `lastSeekTime` + 狀態管理 | 中 | 🟡 中 |
| `checkVideoTime()` | L210–232 | 加入 0.5s 鎖定 + 多層檢查 | 高 | 🔴 高 |
| `startSegment()` | L147–184 | 防呆檢查 + HTML 轉義 | 中 | 🟡 中 |
| `replayCurrentSegment()` | L234–237 | 增強清理邏輯 | 低 | 🟢 低 |

### 2.2 新增代碼量估計

| 部分 | 預計代碼行數 | 說明 |
|------|------------|------|
| 全域變數擴展 | ~20 行 | `lastSeekTime`, `PLAYER_STATE`, `DEBUG` 等 |
| `onPlayerReady()` 增強 | ~15 行 | 驗證邏輯 + try-catch |
| `playSegment()` 增強 | ~10 行 | 時刻記錄 + 狀態轉移 |
| `checkVideoTime()` 核心修復 | ~25 行 | 0.5s 鎖定 + 分層檢查 |
| `startSegment()` 防呆 | ~15 行 | 欄位驗證 + HTML 轉義 |
| `escapeHtml()` 新函式 | ~8 行 | XSS 防護 |
| 其他微調 | ~10 行 | 狀態轉移、日誌調用 |
| **總計** | **~103 行** | **淨增長：~35%** |

**現狀**：280 行 → **預計 ~383 行**

### 2.3 函數複雜度變化

```
checkVideoTime() 是最複雜的改動：
┌─ 現況：O(n) = 3 層邏輯
│  ├─ API 檢查
│  ├─ seekedAndPlaying 判斷
│  └─ endTime 監控
│
└─ 改進後：O(n+3) = 6 層邏輯
   ├─ API 檢查
   ├─ 播放狀態檢查（新）
   ├─ Seek 時刻檢查（新 - 0.5s 鎖定）
   ├─ seekedAndPlaying 判斷
   ├─ Seek 完成確認（新）
   └─ endTime 監控
```

**循環次數**：50ms 週期，每次增加 3 層檢查（但大多在前 500ms 被短路跳過）

---

## 第三部分：PRD 需求對應性驗證 (Requirements Mapping)

### 3.1 PRD 核心需求檢查矩陣

| 需求 | PRD 章節 | 現況 | 新方案 | 滿足度 | 風險 |
|------|---------|------|--------|--------|------|
| **精準片段控制** | 3.1 | ✅ 基本實現 | ✅ 增強邏輯 | 100% | 🟢 低 |
| **自動暫停** | 3.1 | ✅ 已實現 | ✅ 保持 + 增強 | 100% | 🟢 低 |
| **重播功能** | 3.1 | ✅ 已實現 | ✅ 更穩定 | 100% | 🟡 中 |
| **背誦模式** | 3.2 | ✅ 已實現 | ✅ 保持 | 100% | 🟢 低 |
| **卡片翻轉** | 3.2 | ✅ 已實現 | ✅ 保持 | 100% | 🟢 低 |
| **SRS 評級** | 3.2 | ✅ 已實現 | ✅ 保持 | 100% | 🟢 低 |
| **重點單字顯示** | 3.3 | ✅ 已實現 | ✅ 更穩定 | 100% | 🟡 中 |
| **防呆檢查** | 8.1 (新) | ❌ 缺乏 | ✅ 完整 | 100% | 🟡 中 |
| **生命週期管理** | 8.1 (新) | ❌ 隱含 | ✅ 顯式 | 100% | 🟡 中 |
| **偵錯能力** | 8.1 (新) | ❌ 無 | ✅ 完整 | 100% | 🟢 低 |
| **非同步時序保護** | 7.1 | ⚠️ 部分 | ✅ 完整 | 100% | 🔴 高 |

**總體滿足度**：🟢 **100%**

---

## 第四部分：潛在風險識別 (Risk Identification)

### 4.1 高風險項目 (Critical)

#### ⚠️ 風險 1：checkVideoTime() 邏輯複雜度增加

**現象**：新增 0.5s 鎖定層後，if-else 分支增加到 4 層

**風險等級**：🔴 **HIGH**

```javascript
// 舊：簡單的二元檢查
if (!seekedAndPlaying) {
    if (currentTime < currentSegment.endTime) {
        seekedAndPlaying = true;
        return;
    }
}
if (currentTime >= currentSegment.endTime) {
    pauseVideo();
}

// 新：複雜的多層檢查
if (isCheckingTime) return;
try {
    if (!player || !player.getCurrentTime) return;
    if (playerState !== PLAYING) return;
    const timeSinceSeek = Date.now() - lastSeekTime;
    if (timeSinceSeek < 500) return;  // ← 新層
    if (!seekedAndPlaying) {
        if (currentTime < currentSegment.endTime) {
            seekedAndPlaying = true;
            return;
        }
    }
    if (currentTime >= currentSegment.endTime) {
        pauseVideo();
    }
} catch (e) {
    DEBUG.log('ERROR', ...);
} finally {
    isCheckingTime = false;
}
```

**潛在問題**：
- 可能遺漏某些邊界情況
- 多層 return 容易產生邏輯死角
- try-finally 的 `isCheckingTime = false` 可能被跳過

**對策**：
- [ ] 單獨測試新增的 0.5s 鎖定邏輯
- [ ] 涵蓋測試所有分支（8 個可能路徑）
- [ ] 驗證 `isCheckingTime` 旗標在所有情況下都被正確重置

---

#### ⚠️ 風險 2：seekedAndPlaying 與 lastSeekTime 的時序依賴

**現象**：兩個狀態變數必須協調，否則會導致播放立即停止

**風險等級**：🔴 **HIGH**

```
正確流程：
playSegment() ──→ lastSeekTime = Date.now()
                  seekTo() + playVideo()
                  seekedAndPlaying = false
                         ↓
checkVideoTime() ┌──→ if (timeSinceSeek < 500) return; ✅ 鎖定
loop 50ms        │
(10 次)          ├──→ if (!seekedAndPlaying && currentTime < endTime)
                 │       seekedAndPlaying = true
                 │       return; ✅ 確認完成
                 │
                 └──→ if (currentTime >= endTime)
                         pauseVideo() ✅ 終止

錯誤流程 1：timeSinceSeek 檢查缺失
  → checkVideoTime 在 100ms 時檢查，currentTime 仍未更新
  → currentTime >= endTime ← 因為還在終點
  → 立即暫停 ❌ 閃停

錯誤流程 2：isCheckingTime 未被重置
  → 第二次進入 checkVideoTime 時被短路
  → 永久鎖定 ❌ 卡住
```

**對策**：
- [ ] 驗證 `finally` 塊中 `isCheckingTime = false` 一定被執行
- [ ] 測試異常情況（如 player.getCurrentTime() 拋錯）
- [ ] 確保 lastSeekTime 在每次 playSegment() 時都被更新

---

#### ⚠️ 風險 3：HTML 轉義 (escapeHtml) 的安全性

**現象**：新增 XSS 防護機制，但實裝方式可能有漏洞

**風險等級**：🔴 **MEDIUM-HIGH**

```javascript
// 提議的實裝
function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;    // ← 自動轉義
    return div.innerHTML;       // ← 回讀
}

// 潛在問題：
// 若有人故意輸入 <script>alert('xss')</script>
// → textContent = '<script>alert(...)</script>'（已轉義）
// → innerHTML = '&lt;script&gt;alert(...)&lt;/script&gt;'
// ✅ 安全

// 但若輸入包含 HTML 實體：
// 輸入：'&amp;&amp;&lt;test&gt;'
// → textContent = '&amp;&amp;&lt;test&gt;'
// → innerHTML = '&amp;amp;&amp;lt;test&amp;gt;'
// 可能雙重轉義？ ❌
```

**對策**：
- [ ] 測試含有特殊字符的單字（如 `O'Brien`, `café`, `&lt;test&gt;`）
- [ ] 驗證顯示結果是否正確
- [ ] 考慮使用更標準的轉義方法

---

### 4.2 中風險項目 (Medium)

#### 🟠 風險 4：新全域變數污染命名空間

**現象**：新增 5 個全域變數，可能與其他模組衝突

| 變數 | 命名衝突風險 | 說明 |
|------|-----------|------|
| `lastSeekTime` | 低 | 夠具體 |
| `isCheckingTime` | 低 | 模組內命名 |
| `PLAYER_STATE` | 中 | 可能與其他常數衝突 |
| `playerLifecycleState` | 低 | 夠具體 |
| `DEBUG` | 高 | ⚠️ 通用名稱，可能與瀏覽器 API 衝突 |

**對策**：
- [ ] 重命名為 `VIDEO_DEBUG` 避免衝突
- [ ] 檢查是否有其他模組使用這些變數名
- [ ] 考慮使用命名空間物件（如 `VideoModule.state`）

---

#### 🟠 風險 5：DEBUG 日誌對效能的影響

**現象**：checkVideoTime 每 50ms 執行一次，若 DEBUG 開啟可能產生大量日誌

**計算**：
```
假設播放一句話 6 秒鐘
每 50ms 執行一次 checkVideoTime
6000ms ÷ 50ms = 120 次執行

若 DEBUG.enabled = true：
每次最少產生 1 個 console.log() 呼叫
120 × log() = 120 行日誌（1 句話）

若連續播放 30 句話（3 分鐘）：
120 × 30 = 3600 行日誌
↓
可能導致瀏覽器控制台卡頓
```

**對策**：
- [ ] 設置日誌級別（ERROR, WARN, INFO, DEBUG）
- [ ] 只在需要時才開啟 DEBUG
- [ ] 提供「抽樣日誌」選項（每 N 次記錄一次）

---

#### 🟠 風險 6：playerLifecycleState 同步問題

**現象**：狀態轉移不完整可能導致狀態不一致

```
期望流程：
NOT_INITIALIZED 
  → (onPlayerReady) 
  → READY 
  → (startSegment) 
  → LOADING_VIDEO 
  → (playSegment) 
  → PLAYING 
  → (checkVideoTime) 
  → PAUSED

實際問題：
若 loadDayData() 被快速呼叫多次：
  → READY 狀態被立即覆蓋
  → 播放器還在加載新影片
  → 但 playerLifecycleState = READY ❌ 不同步
```

**對策**：
- [ ] 在 loadVideoById() 時設置 LOADING_VIDEO
- [ ] 確保狀態轉移前進行檢查
- [ ] 不允許在非 READY 狀態下啟動播放

---

### 4.3 低風險項目 (Low)

| # | 風險項 | 嚴重性 | 對策 |
|----|--------|--------|------|
| 🟢 7 | replayCurrentSegment() 邏輯簡化 | 低 | 驗證清理是否完整 |
| 🟢 8 | onPlayerReady() 測試可能失敗 | 低 | 添加 try-catch，失敗時日誌記錄 |
| 🟢 9 | escapeHtml() 效能 | 低 | DOM 操作只在必要時進行 |
| 🟢 10 | 相容性（瀏覽器版本） | 低 | 測試 IE11 等老舊瀏覽器 |

---

## 第五部分：依賴關係與時序驗證 (Dependency Analysis)

### 5.1 函數調用依賴圖

```
init()
├─→ populateDaySelector()
├─→ loadDayData(currentDay)
│   ├─→ StorageModule.getVideoReviewList()
│   ├─→ showStartState()
│   └─→ createPlayer() 或 setwindow.pendingVideoId
│
└─→ 事件監聽註冊
    ├─→ daySelector: loadDayData()
    ├─→ startVideoBtn: showFlashcardState() → startSegment()
    ├─→ replayBtn: replayCurrentSegment()
    ├─→ markBadBtn/markGoodBtn: handleSrsAction()
    └─→ resetDayBtn: loadDayData()

startSegment()
├─→ playSegment()
│   ├─→ clearInterval(checkTimeInterval)
│   ├─→ player.seekTo()
│   ├─→ player.playVideo()
│   └─→ setInterval(checkVideoTime, 50)
│
└─→ 更新 DOM
    └─→ 填充 keyWordsList（需要 escapeHtml）

checkVideoTime() [重複調用，50ms 一次]
└─→ player.getCurrentTime() (非同步 API)

replayCurrentSegment()
└─→ playSegment()

handleSrsAction()
├─→ StorageModule.updateVideoSegmentStatus()
└─→ startSegment()
```

### 5.2 時序敏感點

| # | 時序點 | 敏感性 | 說明 |
|----|--------|--------|------|
| T1 | `playSegment()` 執行開始 | 🔴 高 | 必須記錄 lastSeekTime |
| T2 | `player.seekTo()` 後 | 🔴 高 | API 非同步，需等待 200~500ms |
| T3 | `checkVideoTime()` 第 1 次執行 | 🔴 高 | 0~50ms，Seek 可能未完成 |
| T4 | `checkVideoTime()` 第 11 次執行 | 🟡 中 | 550ms，應已完成 Seek |
| T5 | `handleSrsAction()` 呼叫 | 🟡 中 | 需確保前一個 checkTimeInterval 已清理 |
| T6 | 快速切換日期 | 🟡 中 | 舊的 playSegment 可能仍在執行 |

---

## 第六部分：詳細實裝計畫 (Implementation Plan)

### 6.1 四階段實裝概覽

```
┌──────────────────────────────────────────┐
│ Phase 1: 基礎時序隔離 (10 min)          │
│ ✓ lastSeekTime, isCheckingTime 變數    │
│ ✓ 0.5s 鎖定邏輯                        │
│ ✓ 基本測試                             │
└──────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│ Phase 2: 防呆檢查補強 (20 min)          │
│ ✓ escapeHtml() 函式                    │
│ ✓ key_words 驗證                       │
│ ✓ 播放器 API 檢查                      │
└──────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│ Phase 3: 生命週期管理 (15 min)          │
│ ✓ PLAYER_STATE 常數                    │
│ ✓ playerLifecycleState 狀態轉移        │
│ ✓ 狀態驗證                             │
└──────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────┐
│ Phase 4: 偵錯日誌系統 (10 min)          │
│ ✓ DEBUG 物件（改為 VIDEO_DEBUG）       │
│ ✓ 日誌點插入                           │
│ ✓ 線上診斷驗證                         │
└──────────────────────────────────────────┘
```

### 6.2 詳細實裝步驟與檢查點

#### **Phase 1：基礎時序隔離**

**步驟 1.1：在全域變數區新增三個變數**

```javascript
// 在 let seekedAndPlaying = false; 之後加入

let lastSeekTime = 0;              // 最後一次 seekTo 的時刻
let isCheckingTime = false;        // 防止多重檢查
const SEEK_BUFFER_MS = 500;        // 鎖定時間常數（便於調整）
```

**檢查點**：
- [ ] 變數名稱不與其他全域變數衝突
- [ ] 初始值正確
- [ ] 常數定義便於未來調整

**步驟 1.2：修改 playSegment() - 記錄時刻**

```javascript
function playSegment() {
    if (!currentSegment) return;
    
    clearInterval(checkTimeInterval);
    seekedAndPlaying = false;
    isCheckingTime = false;  // ← 新增：清理檢查旗標
    
    lastSeekTime = Date.now();  // ← 新增：記錄時刻
    
    try {
        player.seekTo(currentSegment.startTime, true);
        player.playVideo();
        checkTimeInterval = setInterval(checkVideoTime, 50);
    } catch (e) {
        console.error('playSegment error:', e);
    }
}
```

**檢查點**：
- [ ] `isCheckingTime = false` 確保清理
- [ ] `lastSeekTime = Date.now()` 在 seekTo 之前執行
- [ ] try-catch 捕捉 player API 異常

**步驟 1.3：修改 checkVideoTime() - 加入 0.5s 鎖定層**

```javascript
function checkVideoTime() {
    if (!player || !player.getCurrentTime || !player.getPlayerState) return;
    if (player.getPlayerState() !== YT.PlayerState.PLAYING) return;
    
    // ← 新增：防止多重檢查
    if (isCheckingTime) return;
    isCheckingTime = true;
    
    try {
        const currentTime = player.getCurrentTime();
        const timeSinceSeek = Date.now() - lastSeekTime;
        
        // ← 新增第一層：Seek 緩衝保護
        if (timeSinceSeek < SEEK_BUFFER_MS) {
            return;  // 在 500ms 內鎖定，不檢查
        }
        
        if (!seekedAndPlaying) {
            if (currentTime < currentSegment.endTime) {
                seekedAndPlaying = true;
                return;
            } else {
                return;
            }
        }
        
        if (currentTime >= currentSegment.endTime) {
            player.pauseVideo();
            clearInterval(checkTimeInterval);
        }
    } finally {
        isCheckingTime = false;  // ← 新增：確保一定被重置
    }
}
```

**檢查點**：
- [ ] `if (isCheckingTime) return;` 在最前面
- [ ] `try-finally` 確保 `isCheckingTime` 被重置
- [ ] `SEEK_BUFFER_MS < 500` 的邏輯正確
- [ ] 所有 `return` 都會執行 `finally`

**Phase 1 驗證測試**：

```javascript
// 在瀏覽器控制台手動測試
// 1. 快速點擊 Replay 5 次，卡片應按順序更新，無「閃停」
// 2. 監控 console，應無錯誤日誌
// 3. 檢查 lastSeekTime 是否在每次 Replay 時更新
```

---

#### **Phase 2：防呆檢查補強**

**步驟 2.1：新增 escapeHtml() 函式**

```javascript
// 在 replayCurrentSegment() 之前加入

function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

**檢查點**：
- [ ] 處理 null/undefined 情況
- [ ] 型別檢查
- [ ] 測試特殊字符：`<`, `>`, `&`, `"`, `'`

**步驟 2.2：修改 onPlayerReady() - 增強驗證**

```javascript
function onPlayerReady(event) {
    // ✅ 驗證 API 完整性
    if (!player || !player.playVideo || !player.seekTo || !player.getCurrentTime) {
        console.error('Player API incomplete');
        return;
    }
    
    isPlayerReady = true;
    
    // ✅ 測試播放器基本功能
    try {
        const testTime = player.getCurrentTime();
        const testDuration = player.getDuration();
        // 簡單的有效性檢查
        if (testDuration > 0) {
            console.log('Player ready, duration:', testDuration);
        }
    } catch (e) {
        console.warn('Player test failed:', e.message);
        // 即使測試失敗，也繼續，因為有些情況下 API 會延遲初始化
    }
}
```

**檢查點**：
- [ ] 檢查所有必要的 API 方法
- [ ] try-catch 捕捉測試異常
- [ ] 日誌輸出有意義的診斷資訊

**步驟 2.3：修改 startSegment() - 防呆檢查**

```javascript
function startSegment() {
    if (!isPlayerReady || !reviewList || reviewList.length === 0) {
        console.error('startSegment: player not ready or no items');
        return;
    }
    
    if (currentSegmentIndex >= reviewList.length) {
        console.log('All segments completed');
        return;
    }
    
    currentSegment = reviewList[currentSegmentIndex];
    
    // ✅ 驗證 segment 結構
    if (!currentSegment || !currentSegment.id) {
        console.error('Invalid segment structure:', currentSegment);
        showEmptyState();
        return;
    }
    
    // === 重設卡片 ===
    try {
        flashcard.classList.remove('is-flipped');
        chineseFront.textContent = currentSegment.chinese || '(缺少中文翻譯)';
        englishBack.textContent = currentSegment.english || '(缺少英文原文)';
    } catch (e) {
        console.error('UI update failed:', e);
        return;
    }
    
    // === 填充重點單字 (增強防呆) ===
    keyWordsList.innerHTML = '';
    if (currentSegment.key_words && Array.isArray(currentSegment.key_words)) {
        try {
            currentSegment.key_words.forEach((kw, index) => {
                // ✅ 驗證 key_word 結構
                if (!kw || !kw.word) {
                    console.warn(`Segment ${currentSegment.id}: invalid key_word at index ${index}`);
                    return;
                }
                
                const li = document.createElement('li');
                const word = escapeHtml(kw.word);
                const phonetic = escapeHtml(kw.phonetic || '');
                const meaning = escapeHtml(kw.meaning || '');
                
                li.innerHTML = `<span class="kw-word">${word}</span> 
                               <span class="kw-phonetic">${phonetic}</span>
                               <span class="kw-meaning">${meaning}</span>`;
                keyWordsList.appendChild(li);
            });
        } catch (e) {
            console.error('Key words rendering failed:', e);
        }
    } else {
        if (currentSegment.id) {
            console.warn(`Segment ${currentSegment.id}: no key_words array`);
        }
    }
    
    playSegment();
}
```

**檢查點**：
- [ ] 驗證所有必要的欄位存在
- [ ] 使用 `escapeHtml()` 防止 XSS
- [ ] 詳細的日誌便於除錯
- [ ] 缺少欄位時提供合理的預設值

**Phase 2 驗證測試**：

```javascript
// 測試 1：JSON 資料缺陷
// 編輯 video_Day1.json，移除某句的 key_words
// → UI 應正常顯示，無控制台錯誤

// 測試 2：特殊字符顯示
// 找或建立含有 <, >, &, " 的單字
// → 應正確顯示（已轉義）

// 測試 3：播放器未就緒
// 模擬網路延遲，在 onPlayerReady 前點擊「開始」
// → 應提示「player not ready」
```

---

#### **Phase 3：生命週期管理**

**步驟 3.1：定義 PLAYER_STATE 常數**

```javascript
// 在全域變數區，在 SEEK_BUFFER_MS 之後

const PLAYER_STATE = Object.freeze({
    NOT_INITIALIZED: 'NOT_INITIALIZED',
    INITIALIZING: 'INITIALIZING',
    READY: 'READY',
    LOADING_VIDEO: 'LOADING_VIDEO',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED'
});

let playerLifecycleState = PLAYER_STATE.NOT_INITIALIZED;
```

**檢查點**：
- [ ] 使用 `Object.freeze()` 防止意外修改
- [ ] 初始值為 NOT_INITIALIZED
- [ ] 狀態值有意義

**步驟 3.2：修改 createPlayer() - 狀態轉移**

```javascript
function createPlayer(videoId) {
    playerLifecycleState = PLAYER_STATE.INITIALIZING;
    
    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'rel': 0,
            'fs': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}
```

**步驟 3.3：修改 onPlayerReady() - 狀態驗證**

```javascript
function onPlayerReady(event) {
    if (!player || !player.playVideo || !player.seekTo || !player.getCurrentTime) {
        console.error('Player API incomplete');
        playerLifecycleState = PLAYER_STATE.NOT_INITIALIZED;
        return;
    }
    
    isPlayerReady = true;
    playerLifecycleState = PLAYER_STATE.READY;
    
    try {
        const testTime = player.getCurrentTime();
        const testDuration = player.getDuration();
        if (testDuration > 0) {
            console.log('Player ready, duration:', testDuration);
        }
    } catch (e) {
        console.warn('Player test failed:', e.message);
    }
}
```

**步驟 3.4：修改 playSegment() - 狀態轉移**

```javascript
function playSegment() {
    if (!currentSegment) return;
    if (!isPlayerReady) {
        console.warn('Player not ready');
        return;
    }
    
    clearInterval(checkTimeInterval);
    seekedAndPlaying = false;
    isCheckingTime = false;
    lastSeekTime = Date.now();
    
    try {
        playerLifecycleState = PLAYER_STATE.LOADING_VIDEO;
        player.seekTo(currentSegment.startTime, true);
        player.playVideo();
        playerLifecycleState = PLAYER_STATE.PLAYING;
        
        checkTimeInterval = setInterval(checkVideoTime, 50);
    } catch (e) {
        console.error('playSegment error:', e);
        playerLifecycleState = PLAYER_STATE.PAUSED;
    }
}
```

**步驟 3.5：修改 checkVideoTime() - 暫停時更新狀態**

```javascript
function checkVideoTime() {
    // ... 既有的檢查邏輯 ...
    
    if (currentTime >= currentSegment.endTime) {
        player.pauseVideo();
        clearInterval(checkTimeInterval);
        playerLifecycleState = PLAYER_STATE.PAUSED;  // ← 新增
    }
}
```

**Phase 3 驗證測試**：

```javascript
// 在瀏覽器控制台監控狀態轉移
window.getPlayerState = () => playerLifecycleState;

// 點擊「開始」，觀察狀態變化：
// NOT_INITIALIZED → READY → LOADING_VIDEO → PLAYING → PAUSED
```

---

#### **Phase 4：偵錯日誌系統**

**步驟 4.1：重命名並完善 DEBUG 物件**

```javascript
// 替換現有的 const DEBUG = ...

const VIDEO_DEBUG = {
    enabled: false,  // 生產環境設為 false
    level: 'INFO',   // 'ERROR', 'WARN', 'INFO', 'DEBUG'
    
    log: (level, action, details) => {
        if (!VIDEO_DEBUG.enabled) return;
        
        const levelOrder = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
        if (levelOrder[level] > levelOrder[VIDEO_DEBUG.level]) return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}]`;
        
        if (level === 'ERROR') {
            console.error(`${prefix} ${action}:`, details);
        } else if (level === 'WARN') {
            console.warn(`${prefix} ${action}:`, details);
        } else {
            console.log(`${prefix} ${action}:`, details);
        }
    }
};
```

**步驟 4.2：在關鍵點加入日誌**

```javascript
// onPlayerReady
VIDEO_DEBUG.log('INFO', 'PLAYER_READY', { state: playerLifecycleState });

// playSegment
VIDEO_DEBUG.log('INFO', 'SEEK_INITIATED', { 
    segmentId: currentSegment.id,
    startTime: currentSegment.startTime 
});

// checkVideoTime（選擇性，可能產生大量日誌）
if (timeSinceSeek < SEEK_BUFFER_MS) {
    VIDEO_DEBUG.log('DEBUG', 'SEEK_BUFFER_ACTIVE', { 
        timeSinceSeek, 
        remaining: SEEK_BUFFER_MS - timeSinceSeek 
    });
}

// 暫停時
VIDEO_DEBUG.log('INFO', 'SEGMENT_END', { 
    currentTime, 
    endTime: currentSegment.endTime 
});
```

**檢查點**：
- [ ] 日誌級別設置合理
- [ ] 生產環境自動關閉日誌
- [ ] 沒有頻繁的重複日誌

---

### 6.3 實裝順序與依賴檢查

```
Phase 1（必修，獨立）
├─ 1.1：新增全域變數 ✓ 獨立
├─ 1.2：playSegment() 改動 ✓ 依賴於 1.1
└─ 1.3：checkVideoTime() 改動 ✓ 依賴於 1.1, 1.2

Phase 2（必修，依賴 Phase 1）
├─ 2.1：escapeHtml() ✓ 獨立
├─ 2.2：onPlayerReady() ✓ 獨立
└─ 2.3：startSegment() ✓ 依賴於 2.1

Phase 3（建議，依賴 Phase 1, 2）
├─ 3.1：PLAYER_STATE ✓ 獨立
├─ 3.2：createPlayer() ✓ 依賴於 3.1
├─ 3.3：onPlayerReady() ✓ 依賴於 3.1
├─ 3.4：playSegment() ✓ 依賴於 3.1
└─ 3.5：checkVideoTime() ✓ 依賴於 3.1

Phase 4（可選，依賴 Phase 1, 2, 3）
├─ 4.1：VIDEO_DEBUG ✓ 獨立
└─ 4.2：日誌點插入 ✓ 依賴於 4.1
```

---

## 第七部分：風險緩解計畫 (Risk Mitigation)

### 7.1 針對高風險項目的防護措施

| 風險 | 緩解措施 | 實施者 | 時機 |
|------|---------|--------|------|
| **Risk 1：邏輯複雜度** | 完整的單元測試覆蓋 | 開發者 | Phase 1 完成後 |
| **Risk 2：狀態同步** | 詳細的註釋 + 偵錯日誌 | 開發者 | Phase 4 完成後 |
| **Risk 3：XSS 漏洞** | 測試特殊字符 + 程式碼審查 | 開發者 + 審查者 | Phase 2 完成後 |
| **Risk 4：命名衝突** | 搜尋全局命名空間 | 開發者 | Phase 1 之前 |
| **Risk 5：效能影響** | 日誌級別控制 | 開發者 | Phase 4 完成後 |
| **Risk 6：狀態不同步** | 狀態驗證單元測試 | 開發者 | Phase 3 完成後 |

---

## 第八部分：測試計畫 (Testing Strategy)

### 8.1 單元測試 (Unit Tests)

```javascript
// 建議在 Phase 完成後執行

describe('Video Module - Comprehensive Fix', () => {
    
    describe('Seek Buffer Protection (Risk 2)', () => {
        test('checkVideoTime should not check within 500ms after seek', () => {
            // 安排：playSegment() 記錄時刻
            lastSeekTime = Date.now();
            
            // 執行：立即呼叫 checkVideoTime
            setTimeout(() => {
                checkVideoTime();
                
                // 驗證：應該被 0.5s 鎖定短路
                expect(seekedAndPlaying).toBe(false);
            }, 100);
        });
        
        test('checkVideoTime should process after 500ms', () => {
            lastSeekTime = Date.now() - 600; // 600ms 前
            currentTime = 15; // 假設在句子中間
            currentSegment.endTime = 20;
            
            checkVideoTime();
            
            // 應該進入邏輯，設置 seekedAndPlaying
            expect(seekedAndPlaying).toBe(true);
        });
    });
    
    describe('isCheckingTime Lock (Risk 2)', () => {
        test('isCheckingTime should prevent re-entry', () => {
            isCheckingTime = true;
            
            checkVideoTime();
            
            // 應該在第一行被短路
            // （無法直接驗證，需要 spy）
        });
        
        test('isCheckingTime should always be reset in finally', () => {
            isCheckingTime = true;
            player = null; // 模擬 API 不可用
            
            checkVideoTime();
            
            // 即使異常，isCheckingTime 也應被重置
            expect(isCheckingTime).toBe(false);
        });
    });
    
    describe('HTML Escaping (Risk 3)', () => {
        test('escapeHtml should escape dangerous characters', () => {
            expect(escapeHtml('<script>alert("xss")</script>'))
                .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        });
        
        test('escapeHtml should handle special characters', () => {
            expect(escapeHtml(`O'Brien & café`))
                .toBe(`O&#39;Brien &amp; café`);
        });
        
        test('escapeHtml should handle null/undefined', () => {
            expect(escapeHtml(null)).toBe('');
            expect(escapeHtml(undefined)).toBe('');
        });
    });
    
    describe('Player Lifecycle State (Risk 6)', () => {
        test('state should transition correctly', () => {
            playerLifecycleState = PLAYER_STATE.NOT_INITIALIZED;
            createPlayer('videoId');
            expect(playerLifecycleState).toBe(PLAYER_STATE.INITIALIZING);
            
            onPlayerReady({});
            expect(playerLifecycleState).toBe(PLAYER_STATE.READY);
        });
    });
});
```

### 8.2 集成測試 (Integration Tests)

| 測試名稱 | 步驟 | 預期結果 | 通過準則 |
|---------|------|---------|---------|
| **快速重播** | 1. 開始播放 2. 連點 Replay 5 次 | 卡片順序更新，無「閃停」 | ✅ 全部流暢 |
| **日期切換** | 1. 播放 Day1 2. 快速切換 Day2/3 | 影片和卡片正確同步 | ✅ 無延遲/混亂 |
| **JSON 缺陷** | 1. 編輯 JSON 移除 key_words 2. 播放 | UI 正常，無錯誤 | ✅ 顯示「(缺少)」 |
| **長時間播放** | 1. 連續播放 30 分鐘 | 無卡頓、記憶體穩定 | ✅ DevTools 無洩漏 |
| **播放器延遲** | 1. 減緩網路 2. 在就緒前點擊「開始」 | 提示 Player loading | ✅ 有警告訊息 |

---

## 第九部分：回滾與備用計畫 (Rollback Plan)

### 9.1 快速回滾方案

若實裝後發現無法解決的問題，可快速回滾：

```bash
# 備份當前版本
git commit -m "Full Comprehensive Fix - [Phase X] - FAILED"

# 回滾到當前穩定版本
git revert HEAD~[n]

# 或保留目前進度，僅註釋掉新代碼
# 註釋 lastSeekTime, isCheckingTime 等新變數的使用
```

### 9.2 部分回滾（Partial Rollback）

若只有某個 Phase 有問題，可單獨回滾：

```javascript
// 若 Phase 1 正常但 Phase 2 有 XSS 問題
// 只需移除 escapeHtml() 呼叫
li.innerHTML = `<span class="kw-word">${kw.word}</span>...`  // 回復原來
```

### 9.3 備用計畫 (Plan B)

若完整方案無法成功，備選方案：

| 方案 | 風險 | 收益 | 實裝時間 |
|------|------|------|---------|
| 只實裝 Phase 1 | 低 | 中（解決快速重播） | 10 min |
| 只實裝 Phase 1 + 2 | 低 | 中上（+防呆） | 30 min |
| 暫停實裝，進行深度測試 | 無 | 無（驗證必要性） | 1 hour |

---

## 第十部分：決策檢查清單 (Decision Checklist)

### 需要確認的關鍵問題

在正式實裝前，請確認以下問題：

- [ ] **Q1：是否確定 0.5 秒鎖定是最佳方案？**
  - 還是應該考慮其他方式（如禁用快速點擊、隊列機制）？

- [ ] **Q2：isCheckingTime 旗標是否必要？**
  - 或者可以透過其他機制（如事件驅動）替代？

- [ ] **Q3：是否接受 ~103 行新代碼的增加？**
  - 會否導致維護複雜度過高？

- [ ] **Q4：DEBUG 物件的日誌粒度是否足夠？**
  - 還是需要更詳細的日誌（如每次 poll 的時間值）？

- [ ] **Q5：playerLifecycleState 是否必須顯式管理？**
  - 或者可以隱含在現有的 isPlayerReady 中？

- [ ] **Q6：escapeHtml() 的實裝方式是否正確？**
  - 是否有更安全的替代方案？

- [ ] **Q7：是否需要在 Phase 間插入驗證暫停？**
  - 還是一次性實裝所有 Phase？

---

## 第十一部分：後續行動 (Next Steps)

### 待您確認的事項

| # | 事項 | 狀態 | 負責人 |
|----|------|------|--------|
| 1 | 同意完整方案設計 | ⏳ 待確認 | 您 |
| 2 | 確認四項關鍵設計決策 | ⏳ 待確認 | 您 |
| 3 | 開始 Phase 1 實裝 | ⏳ 待您指示 | 我 |
| 4 | Phase 1 後進行驗證測試 | ⏳ 後續 | 您 |
| 5 | 進行 Phase 2 實裝 | ⏳ 後續 | 我 |

---

## 附錄：版本控制建議

```
git branch comprehensive-fix
  ├─ commit: "Phase 1: Seek buffer protection"
  ├─ commit: "Phase 2: Defect prevention"
  ├─ commit: "Phase 3: Lifecycle management"
  └─ commit: "Phase 4: Debug logging system"

測試通過後：
  git merge main comprehensive-fix
  git tag v3.1-comprehensive-fix
```

---

## 文件簽核

**準備者**：AI Senior Debug Engineer  
**版本**：1.0  
**狀態**：待討論確認  
**下一步**：等待您的反饋與決策  

---

**重要提示**：本評估文件不代表最終決策，所有內容待您審查與確認後方可進行實裝。若您對任何風險或計畫有疑慮，請立即提出討論。

