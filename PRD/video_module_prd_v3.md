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

## 9. 後續發展建議 (Future Work)

* **自動化字幕轉換**：開發或串接 Python 腳本，將 YouTube 自動字幕（SRT/VTT 格式）直接轉換為本系統的 JSON 格式，大幅降低人工標記 `startTime`/`endTime` 的成本。
* **沉浸模式 (Immersive Mode)**：實作 V2 規劃的連續播放模式，支援自動滾動高亮字幕，提供更流暢的聆聽體驗。
* **播放速度控制**：串接 `player.setPlaybackRate()` API，實作 0.75x / 1.0x 切換按鈕。
* **離線快取**：利用 Service Worker 快取 JSON 教材，支援無網路狀態下的學習。
