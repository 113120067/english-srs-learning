# 程式需求單 (PRD) - 全球化英語 SRS 學習 Web App V2 (MVP 版)

## 1. 專案概述 (Project Overview)
本專案旨在建立一個基於網頁的輕量級單字學習應用程式（Web App），專門用於執行「全球化英語基本詞彙清單」的學習計畫。該應用將託管於免費的 GitHub Pages，無需任何後端伺服器。
此版本 (V2 MVP) 專注於最核心的「單字卡學習與 SRS 間隔重複」功能，**以預先處理好的 JSON 靜態檔案作為資料來源**，並將使用者的學習狀態輕量化地儲存於瀏覽器 Local Storage 中，確保系統穩定與快速上線。

## 2. 核心功能需求 (Core Functional Requirements)

### 2.1 學習進度面板 (Dashboard / Day Selector)
- **課程選擇**：畫面首頁提供下拉選單或列表，讓使用者選擇目前內建的課程（MVP 階段預設寫死載入 Day 1 - Day 14 的 JSON 檔案清單）。
- **今日任務提示**：依據使用者的學習紀錄，提示今天需要「學習的新詞」與「需要複習的舊詞」。

### 2.2 單字卡片介面 (Flashcard UI)
- **正面顯示**：
  - 英文單字 (Word)
  - 美式音標 (Phonetic)
  - 一鍵發音按鈕 (TTS)
- **背面顯示（點擊翻轉後）**：
  - 中文釋義 (Meaning)
  - 生活化例句及中文翻譯 (Example)
  - 記憶提示/心像 (Memory Hint)
  - 發音要點 (Pronunciation tip)
- **操作按鈕**：
  - 翻轉卡片 (Flip)
  - 上一個/下一個 (Prev/Next) (非必選，可強制只能前進)
  - 狀態標記：✅ 記住了 (熟練) / ❌ 還不熟 (需複習)

### 2.3 語音朗讀系統 (Text-to-Speech)
- 整合瀏覽器內建的 `Web Speech API` (`speechSynthesis`)。
- **發音語言**：設定為 `en-US`（美式英語）。
- **觸發時機**：
  - 點擊卡片上的「喇叭」圖示。
  - 切換到下一張卡片時「自動播放」單字（可於設定中開關此功能）。

### 2.4 進度追蹤與 SRS 邏輯 (Progress & SRS)
- **純 Client 端本機記錄**：所有的學習狀態，將完全且**只記錄在使用者的 Client 瀏覽器本機** (`localStorage`)。
- **資料與狀態分離**：`localStorage` **不儲存**單字的具體內容（如例句、提示等），**僅儲存學習狀態與時間戳記**，避免 LocalStorage 5MB 容量超載。
  - *儲存格式範例*：`{ "day1_word_I": { "status": 2, "nextReview": "2023-11-01" } }`
- **狀態定義與 SRS 規則**：
  - `0` 或未記錄 (未學)。
  - `1` (還不熟)：排入當日結尾的速查清單，或設定明日再次複習。
  - `2` (已熟記)：依據基礎 SRS 邏輯（如向後推遲 1, 3, 6, 12 天），設定 `nextReview` 日期。
- **複習邏輯 (MVP 簡化版)**：系統每日比對 `nextReview <= 今天日期` 的單字作為當日複習任務。若累積過多，單純依日期排序讓使用者逐步消化，不實作複雜的逾期懲罰機制。

### 2.5 資料讀取機制 (Data Fetching)
- **單一資料來源**：前端 App 透過 `fetch()` API 直接讀取 `lessons/` 資料夾下的預先轉檔好的 `DayX.json` 靜態檔案。
- *(註：已取消 V1 中的前端 Markdown 動態解析、取消本機上傳機制、取消 GitHub API 動態掃描，留待未來版本擴充。)*

## 3. 非功能需求 (Non-Functional Requirements)

### 3.1 部署與架構 (Deployment & Architecture)
- **技術棧**：原生 HTML5, CSS3 (Vanilla CSS), Vanilla JavaScript (ES6+)。不使用複雜的打包工具。
- **靜態託管**：透過 GitHub Pages 發布，完全靜態化。

### 3.2 UI/UX 與視覺設計 (Visual Design)
- **行動裝置優先 (Mobile-First)**：介面必須能在手機上完美顯示，操作按鈕需易於拇指點擊。
- **高級質感設計**：
  - 採用深色模式 (Dark Theme) 為主色調，保護眼睛且具現代感。
  - 使用玻璃擬物化 (Glassmorphism) 的卡片設計（半透明背景、背景模糊、微妙的邊框光暈）。
  - 順暢的 CSS 3D 卡片翻轉動畫。

### 3.3 專案資料夾結構 (Project Directory Structure)
```text
english-srs-learning/
│
├── index.html           # 網頁主入口（進度儀表板、單字卡介面）
├── css/
│   └── style.css        # 樣式表
├── js/
│   ├── app.js           # 主程式控制器與 UI 互動邏輯
│   ├── tts.js           # 語音模組 (Web Speech API Wrapper)
│   └── storage.js       # 資料模組（負責 fetch 讀取靜態 JSON 與 LocalStorage 狀態存取）
│
├── lessons/             # 統一存放所有預先轉為 JSON 格式的教材
│   ├── Day1.json
│   ├── Day2.json
│   └── ...
└── scripts/             # (開發工具) 存放將 Markdown/CSV 轉為 JSON 的 Node/Python 腳本 (不需部署到 Pages)
```

## 4. 開發階段與交付物 (Milestones)

- **Phase 1: 資料前置處理** - 撰寫腳本或手動將現有 Day 1 到 Day 14 的 Markdown/CSV 教材轉換為標準格式的 `.json` 檔案。
- **Phase 2: UI 骨架與樣式** - 建立 HTML 結構，套用深色模式與玻璃擬物化卡片 UI。
- **Phase 3: 核心學習功能** - 實作 `fetch()` 讀取 JSON、Flashcard 卡片翻轉、語音 API 串接。
- **Phase 4: 狀態記憶與 SRS** - 實作 Local Storage 狀態寫入與每日複習單字的篩選邏輯 (`nextReview`)。
- **Phase 5: 測試與上線** - 於 GitHub Pages 部署並進行跨裝置（特別是手機端）測試。
