# Phase 1 實裝指南 - 基礎時序隔離 (Practical Implementation Guide)

**目標**：實裝 Seek 緩衝保護機制（0.5 秒鎖定）  
**預計時間**：10 分鐘  
**難度**：🟢 低 - 只涉及新增變數和一層邏輯判斷  

---

## 📍 實裝位置速查表

| 步驟 | 檔案 | 位置 | 操作 |
|------|------|------|------|
| **1.1** | `js/video.js` | L8（`let currentSegment = null;` 之後） | 新增 3 個全域變數 |
| **1.2** | `js/video.js` | `playSegment()` 函式內 | 記錄 `lastSeekTime` |
| **1.3** | `js/video.js` | `checkVideoTime()` 函式內 | 加入 0.5s 鎖定判斷 |

---

## 🔧 Step 1.1：新增全域變數

### 當前代碼位置（第 8 行之後）

```javascript
// 現在這樣：
let currentSegment = null;

// DOM Elements
const daySelector = document.getElementById('day-selector');
```

### 改為這樣：

```javascript
// 現在這樣：
let currentSegment = null;

// === NEW: 時序隔離狀態 (Phase 1) ===
let lastSeekTime = 0;              // 最後一次 seekTo 的時刻（毫秒）
let isCheckingTime = false;        // 防止多重檢查函式執行
const SEEK_BUFFER_MS = 500;        // Seek 緩衝時間（毫秒）

// DOM Elements
const daySelector = document.getElementById('day-selector');
```

### 驗證檢查清單：

- [ ] 新增的三行在 `let currentSegment = null;` 之後
- [ ] 使用了 `let` 和 `const`（符合 JS 最佳實踐）
- [ ] `lastSeekTime` 初始值為 `0`
- [ ] `isCheckingTime` 初始值為 `false`
- [ ] `SEEK_BUFFER_MS` 設為 `500`（常數，便於調整）
- [ ] 有中文註解說明用途

---

## 🔧 Step 1.2：修改 playSegment() - 記錄時刻

### 當前代碼（約第 198–207 行）

```javascript
let seekedAndPlaying = false;

function playSegment() {
    if (!currentSegment) return;
    
    clearInterval(checkTimeInterval);
    seekedAndPlaying = false; // Reset lock
    
    // allowSeekAhead = true
    player.seekTo(currentSegment.startTime, true);
    player.playVideo();
    
    // check more frequently for precision
    checkTimeInterval = setInterval(checkVideoTime, 50);
}
```

### 改為這樣：

```javascript
let seekedAndPlaying = false;

function playSegment() {
    if (!currentSegment) return;
    
    clearInterval(checkTimeInterval);
    seekedAndPlaying = false;
    isCheckingTime = false;        // ← NEW: 清理檢查旗標
    
    lastSeekTime = Date.now();     // ← NEW: 記錄當前時刻（關鍵！）
    
    // allowSeekAhead = true
    player.seekTo(currentSegment.startTime, true);
    player.playVideo();
    
    // check more frequently for precision
    checkTimeInterval = setInterval(checkVideoTime, 50);
}
```

### 改動說明：

| 改動行 | 說明 |
|--------|------|
| `isCheckingTime = false;` | 清理上一輪的檢查旗標，防止被舊值卡住 |
| `lastSeekTime = Date.now();` | **關鍵**：記錄**當前時刻**（毫秒），用於計算 Seek 緩衝期 |

### 驗證檢查清單：

- [ ] `isCheckingTime = false;` 在 `seekedAndPlaying = false;` 之後
- [ ] `lastSeekTime = Date.now();` 在 `seekTo()` **之前**（順序重要！）
- [ ] 沒有修改其他邏輯（如 `seekTo()`, `playVideo()` 等）
- [ ] `checkTimeInterval` 的設置保持不變

---

## 🔧 Step 1.3：修改 checkVideoTime() - 加入 0.5s 鎖定層

### 當前代碼（約第 210–232 行）

```javascript
function checkVideoTime() {
    if (player && player.getCurrentTime && player.getPlayerState) {
        // Only check time if the video is actually playing
        if (player.getPlayerState() !== YT.PlayerState.PLAYING) return;

        const currentTime = player.getCurrentTime();
        
        if (!seekedAndPlaying) {
            // Fix #1: 確認 seek 已完成（當前時間 < endTime）後立刻 return
            // 將「確認」與「終止判斷」分在不同的 poll tick，消除同一 tick 內的 Race Condition
            if (currentTime < currentSegment.endTime) {
                seekedAndPlaying = true;
                return; // 本 tick 僅做確認，下一個 tick 才開始監控終止點
            } else {
                return; // seek 尚未完成，繼續等待
            }
        }

        if (currentTime >= currentSegment.endTime) {
            player.pauseVideo();
            clearInterval(checkTimeInterval);
        }
    }
}
```

### 改為這樣：

```javascript
function checkVideoTime() {
    // ← NEW: 防止多重檢查函式同時執行
    if (isCheckingTime) return;
    isCheckingTime = true;
    
    try {
        if (player && player.getCurrentTime && player.getPlayerState) {
            // Only check time if the video is actually playing
            if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                isCheckingTime = false;  // ← NEW: 清理旗標後才 return
                return;
            }

            const currentTime = player.getCurrentTime();
            
            // ← NEW: 第一層：Seek 緩衝保護（0.5 秒鎖定）
            const timeSinceSeek = Date.now() - lastSeekTime;
            if (timeSinceSeek < SEEK_BUFFER_MS) {
                // 在 YouTube API 穩定前（500ms 內），完全鎖定檢查
                isCheckingTime = false;  // ← NEW: 清理旗標後才 return
                return;
            }
            
            if (!seekedAndPlaying) {
                // Fix #1: 確認 seek 已完成（當前時間 < endTime）後立刻 return
                // 將「確認」與「終止判斷」分在不同的 poll tick，消除同一 tick 內的 Race Condition
                if (currentTime < currentSegment.endTime) {
                    seekedAndPlaying = true;
                    isCheckingTime = false;  // ← NEW: 清理旗標後才 return
                    return; // 本 tick 僅做確認，下一個 tick 才開始監控終止點
                } else {
                    isCheckingTime = false;  // ← NEW: 清理旗標後才 return
                    return; // seek 尚未完成，繼續等待
                }
            }

            if (currentTime >= currentSegment.endTime) {
                player.pauseVideo();
                clearInterval(checkTimeInterval);
            }
        }
    } finally {
        // ← NEW: 確保 isCheckingTime 一定被重置（即使異常也不例外）
        isCheckingTime = false;
    }
}
```

### 改動說明：

| 改動部分 | 說明 |
|---------|------|
| **開頭 2 行** | 防多重檢查：`if (isCheckingTime) return;` |
| **try 區塊** | 所有原邏輯放在 try 裡，確保 finally 一定執行 |
| **新增層檢查** | `const timeSinceSeek = Date.now() - lastSeekTime;` 計算時間差 |
| **0.5s 鎖定** | `if (timeSinceSeek < SEEK_BUFFER_MS) return;` → 關鍵修復！ |
| **清理旗標** | 所有 return 前都加 `isCheckingTime = false;` |
| **finally 塊** | `isCheckingTime = false;` 一定被執行 |

### 視覺化流程圖：

```
checkVideoTime() 被呼叫 (50ms 一次)
    │
    ├─ 檢查 isCheckingTime
    │  ├─ true → return（短路）
    │  └─ false → 設為 true，繼續
    │
    ├─ try {
    │  ├─ 檢查 player API
    │  ├─ 檢查播放狀態
    │  ├─ 計算 timeSinceSeek = Date.now() - lastSeekTime
    │  ├─ if (timeSinceSeek < 500)  ← ⭐ 新增關鍵層
    │  │     return;  (鎖定，無視後續檢查)
    │  ├─ 檢查 seekedAndPlaying
    │  └─ 檢查 endTime
    │
    └─ finally {
       └─ isCheckingTime = false  (一定執行)
```

### 驗證檢查清單：

- [ ] 開頭加了 `if (isCheckingTime) return;`
- [ ] `isCheckingTime = true;` 在 if 下方
- [ ] 整個邏輯包在 `try { ... } finally { ... }` 中
- [ ] `const timeSinceSeek = Date.now() - lastSeekTime;` 被計算
- [ ] `if (timeSinceSeek < SEEK_BUFFER_MS) return;` 出現在最前面（Seek 檢查優先）
- [ ] 所有 `return` 前都有 `isCheckingTime = false;`（包括原有的 return）
- [ ] `finally` 塊中有 `isCheckingTime = false;`
- [ ] 整個邏輯層次清晰，沒有遺漏的 return

---

## 🧪 Step 2：驗證實裝

### 2.1 開啟瀏覽器開發者工具

```
按 F12 → 開啟 Console 標籤
```

### 2.2 在控制台驗證變數

```javascript
// 在 Console 執行以下指令檢查變數是否存在

lastSeekTime        // 應返回 0 或一個時間戳
isCheckingTime      // 應返回 false
SEEK_BUFFER_MS      // 應返回 500
```

### 2.3 手動測試快速重播

```
1. 打開 video.html
2. 點擊「開始播放」
3. 等影片播一下，卡片出現
4. 快速連點「Replay」按鈕 5 次
5. 觀察：
   ✅ 卡片應按順序更新（s_001 → s_002 → ...）
   ✅ 無「閃停」現象（播一下立刻停）
   ⚠️ 若有「閃停」，問題仍存在，檢查代碼是否正確
```

### 2.4 瀏覽器控制台測試

```javascript
// 在控制台插入以下程式碼進行自動化測試

// 模擬快速重播（需要確保頁面已載入）
async function testRapidReplay() {
    console.log('開始快速重播測試...');
    const replayBtn = document.getElementById('replay-btn');
    
    for (let i = 0; i < 5; i++) {
        replayBtn.click();
        console.log(`重播 ${i + 1}/5 - lastSeekTime:`, lastSeekTime, 'isCheckingTime:', isCheckingTime);
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms 間隔
    }
    
    console.log('✅ 快速重播測試完成');
}

// 執行測試
testRapidReplay();
```

---

## ✅ 成功條件

實裝完成後，應滿足以下條件：

### 代碼檢查

- [x] 3 個新全域變數已新增
- [x] `playSegment()` 中記錄了 `lastSeekTime`
- [x] `checkVideoTime()` 中加入了 Seek 緩衝層
- [x] 所有 `return` 前都清理了 `isCheckingTime`
- [x] 有 try-finally 保護

### 功能檢查

- [x] 正常播放：點擊「開始」，影片播放、卡片更新 ✅
- [x] 快速重播穩定：連點 Replay 5 次，無「閃停」✅
- [x] 卡片順序正確：卡片應按 s_001 → s_002 → ... 更新 ✅
- [x] 控制台無錯誤：F12 Console 無紅色錯誤 ✅
- [x] 變數正常：console 中驗證三個新變數存在且值正確 ✅

---

## 🚨 常見問題與排查

### Q1：快速重播後還是「閃停」？

**可能原因**：
1. `timeSinceSeek < SEEK_BUFFER_MS` 判斷沒有被執行
2. `SEEK_BUFFER_MS` 值太小（改為 1000 試試）
3. YouTube API 延遲超過 500ms（某些網路環境）

**排查方法**：
```javascript
// 在 checkVideoTime() 中加入臨時日誌
const timeSinceSeek = Date.now() - lastSeekTime;
console.log(`timeSinceSeek: ${timeSinceSeek}ms, 鎖定狀態: ${timeSinceSeek < SEEK_BUFFER_MS}`);
```

**解決方案**：
```javascript
// 改為 1000ms（1 秒）試試
const SEEK_BUFFER_MS = 1000;  // ← 從 500 改為 1000
```

---

### Q2：isCheckingTime 一直是 true？

**可能原因**：
1. finally 塊沒有正確設置
2. 異常被拋出，finally 未執行

**排查方法**：
```javascript
console.log('checkVideoTime 開始');
console.log('isCheckingTime 值:', isCheckingTime);
// ... 邏輯 ...
console.log('checkVideoTime 結束，isCheckingTime:', isCheckingTime);
```

---

### Q3：控制台報錯「lastSeekTime is not defined」？

**可能原因**：
新增變數的位置不對，或變數名拼寫錯誤

**排查方法**：
```javascript
// 檢查變數是否真的存在
console.log(typeof lastSeekTime);  // 應返回 'number'
console.log(typeof isCheckingTime);  // 應返回 'boolean'
```

---

## 📋 Phase 1 實裝檢查清單

完成以下所有項目後，Phase 1 才算完成：

- [ ] **代碼實裝**
  - [ ] 新增 3 個全域變數（lastSeekTime, isCheckingTime, SEEK_BUFFER_MS）
  - [ ] playSegment() 中加入 isCheckingTime = false 和 lastSeekTime = Date.now()
  - [ ] checkVideoTime() 中加入 try-finally 和 Seek 緩衝層
  - [ ] 所有 return 前都清理 isCheckingTime

- [ ] **功能驗證**
  - [ ] 正常播放第一句（點開始 → 影片播 → 卡片出現）
  - [ ] 快速重播 5 次無「閃停」
  - [ ] 日期切換正常
  - [ ] 控制台無錯誤

- [ ] **測試通過**
  - [ ] 手動測試：連點 Replay，卡片順利更新 ✅
  - [ ] 變數檢查：console 驗證三個變數正確 ✅

---

## 🎉 Phase 1 完成！

完成上述所有步驟後，您已成功實裝了：

✅ **Seek 緩衝保護機制**  
✅ **雙層檢查隔離** (isCheckingTime + seekedAndPlaying)  
✅ **try-finally 異常保護**  

**下一步**：根據快速重播的結果，決定是否進行 Phase 2–4。

---

## 📞 需要幫助？

若實裝過程中遇到問題，可：

1. **檢查代碼位置**：對照本指南的「實裝位置速查表」
2. **查看控制台**：F12 → Console，檢查錯誤訊息
3. **逐行比對**：與本指南的「當前代碼」和「改為這樣」逐行比對
4. **重置嘗試**：若有問題，可恢復原檔案重新開始

準備好開始 Phase 1 了嗎？🚀

