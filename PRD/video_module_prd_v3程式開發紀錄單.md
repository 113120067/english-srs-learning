# 全球化英語 SRS 學習計畫 - 影音模組 V3 (MVP) 開發紀錄單

## 1. 專案概述
- **開發目標**：開發基於 YouTube 影片片段的 SRS 背誦模組（MVP 最小可行性產品）。
- **主要技術**：HTML5, CSS3, Vanilla JavaScript, YouTube IFrame API, LocalStorage。

## 2. 需求審查與精簡 (PRD V2 ➡️ V3)
在開發初期進行了需求梳理，為確保 MVP 能快速上線驗證，做了以下精簡：
- 將複雜的「沉浸/背誦雙模式」簡化為專注於核心價值的「**背誦模式 (Drill Mode)**」。
- 移除多餘的 Web Speech API (TTS) 雙軌發音，直接依賴 YouTube 原生的母語者語音。
- 移除強制每句標註「發音提示」的要求，降低初期假資料 (Mock Data) 的建置成本。

## 3. 核心功能實作
- **UI 佈局與導航**：建立獨立的 `video.html`，實作上方影片（16:9）、下方字卡區塊的 `100dvh` RWD 玻璃擬物化介面，並在原版 `index.html` 加入了無縫切換的模組導航列。
- **YouTube 播放器整合**：利用 `js/video.js` 動態載入 YouTube IFrame API，支援無外掛控制列 (`controls: 0`) 的背景播放模式。
- **SRS 進度隔離**：擴充 `js/storage.js`，建立專屬的 `global_english_video_srs_data` 儲存空間，確保影音進度不會與一般單字卡進度互相干擾。
- **教材建置**：手動對齊史丹佛演講的前三分鐘內容，建立 `video_Day1.json`、`video_Day2.json` 與 `video_Day3.json`，提供將近 40 句的實戰語料。

## 4. 偵錯與技術克服紀錄 (Troubleshooting)

### 🐛 Issue 1: 畫面載入直接進入完成畫面 (Empty State) 與 UI 跑版
- **現象描述**：一進入頁面，完全看不到影片與單字卡，直接顯示「You've finished this video lesson!」，且下方的 Review Again 按鈕被異常拉長成一條直線。
- **根本原因**：
  1. **資料串接錯誤**：`js/storage.js` 中的 API 請求路徑誤寫為 `video_1.json`，但實際建置的檔名為 `video_Day1.json`。導致 Fetch 失敗回傳 null，系統誤判為無題目可做。
  2. **CSS Flexbox 衝突**：`.btn` 共用元件預設有 `flex: 1` 屬性，在 `.empty-state` 的 `flex-direction: column` 容器內，導致按鈕垂直方向無止盡拉伸。
- **解決方案**：
  - 修正 Fetch URL 字串為 ``fetch(`lessons/video_Day${dayId}.json`)``。
  - 於 `style.css` 針對特定狀態覆寫樣式：`.empty-state .btn { flex: none; min-width: 200px; }`。

### 🐛 Issue 2: 影片自動暫停、按下 Replay 無法正常播放 (Race Condition)
- **現象描述**：當影片播到句末自動暫停後，如果使用者點擊「Replay (重播本句)」或「下一句」，影片會閃一下然後立刻再次暫停，導致完全無法順利播放，畫面與字幕脫節。
- **根本原因**：**YouTube API 非同步時間差**。當我們呼叫 `player.seekTo(startTime)` 要求影片跳回起點時，播放器內部的時間計數器 (`getCurrentTime()`) 需要大約 200~300 毫秒才能更新完成。在這短暫的時間內，程式讀到的時間仍是**跳轉前**的時間（該時間必定大於 `endTime`）。導致輪詢檢查機制立刻觸發 `pauseVideo()`。
- **解決方案**：導入「狀態鎖定計時器 (State Lock)」。
  - 在 `playSegment()` 中加入 `lastSeekTime = Date.now()` 紀錄跳轉時刻。
  - 在 `checkVideoTime()` 中加入防呆機制：`if (Date.now() - lastSeekTime < 500) return;`。
  - **效果**：每次要求影片跳轉後，程式會強制「閉眼 0.5 秒」不檢查時間，給予播放器充足的緩衝空間，徹底解決了誤判暫停的問題。

## 5. 後續發展建議 (Future Work)
- 開發或串接 Python 自動化腳本，直接將 YouTube 自動字幕 (SRT/VTT) 轉換為本系統所需的 JSON 格式，降低人工標記 `startTime` / `endTime` 的負擔。
- 未來可考慮實作 V2 規劃中的「沉浸模式 (Immersive Mode)」，提供連續播放與自動滾動高亮字卡的功能。
