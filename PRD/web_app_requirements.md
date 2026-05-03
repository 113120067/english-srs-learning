# 程式需求單 (PRD) - 全球化英語 SRS 學習 Web App

## 1. 專案概述 (Project Overview)
本專案旨在建立一個基於網頁的輕量級單字學習應用程式（Web App），專門用於執行「全球化英語基本詞彙清單」的學習計畫。該應用將託管於免費的 GitHub Pages，無需任何後端伺服器，所有資料讀取自靜態檔案，且使用者的學習進度將安全地儲存於瀏覽器的 Local Storage 中。

## 2. 核心功能需求 (Core Functional Requirements)

### 2.1 學習進度面板 (Dashboard / Day Selector)
- **天數導航**：畫面首頁需顯示 Day 1 至 Day 66（目前先載入 Day 1 - Day 14 的實體資料）的網格或列表。
- **狀態標示**：每一天需顯示完成度狀態（例如：未開始、學習中、已完成）。
- **今日任務提示**：依據間隔重複 (SRS) 邏輯，提示今天需要「學習的新詞」與「需要複習的舊詞」。

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
  - 上一個/下一個 (Prev/Next)
  - 標記狀態（✅ 記住了 / ❌ 還不熟）

### 2.3 語音朗讀系統 (Text-to-Speech)
- 整合瀏覽器內建的 `Web Speech API` (`speechSynthesis`)。
- **發音語言**：設定為 `en-US`（美式英語）。
- **觸發時機**：
  - 點擊卡片上的「喇叭」圖示。
  - 切換到下一張卡片時「自動播放」單字（可於設定中開關此功能）。
  - 能夠單獨朗讀「例句」。

### 2.4 進度追蹤與 SRS 邏輯 (Progress & SRS)
- **純 Client 端本機記錄**：所有的學習歷史、測驗結果與單字狀態，將完全且**只記錄在使用者的 Client 瀏覽器本機** (利用 `localStorage` 或 `IndexedDB`)，無需登入或連線後端資料庫。
- **資料匯出與匯入 (Backup & Restore)**：因為進度存在瀏覽器本機，為了避免清除快取時遺失資料，提供「一鍵匯出進度檔 (JSON)」與「匯入進度檔」的功能，讓您可以隨時備份進度。
- 每個單字的資料模型將擴充以下屬性：
  - `status`: 0 (未學), 1 (學習中), 2 (已熟記)
  - `lastReviewed`: 最後複習日期
  - `nextReview`: 下次複習日期 (依據 D1, D3, D6, D12 的 SRS 曲線計算)
- 當使用者標記「還不熟」時，該字將排入當日的「結尾速查」清單。

### 2.5 自訂 Markdown 檔案匯入與解析 (Custom Markdown Import)
- **檔案選擇機制**：
  1. **本機上傳**：提供顯眼的按鈕或拖曳區 (Drag & Drop)，讓使用者從本地端自行上傳符合格式的 `.md` 檔案。
  2. **GitHub Repo 線上讀取**：利用 GitHub API 或預設清單，自動列出專案內的 `DayX_詳細學習.md` 檔案。使用者可透過下拉選單或選單列表，一鍵點擊自動抓取線上最新內容進行學習。
- **即時動態解析 (On-the-fly Parser)**：前端 App 內建輕量級的解析邏輯，讀取 `.md` 純文字內容後，利用正則表達式 (RegEx) 直接提取出單字、音標、中文、例句與提示。
- **動態切換課程**：使用者一載入新檔案，單字卡介面便會立刻更新為該檔案的內容，完全擺脫寫死在程式庫裡的資料限制。

## 3. 非功能需求 (Non-Functional Requirements)

### 3.1 部署與架構 (Deployment & Architecture)
- **技術棧**：原生 HTML5, CSS3 (Vanilla CSS), Vanilla JavaScript (ES6+)。不使用複雜的打包工具，以確保最快部署速度。
- **靜態託管**：透過 GitHub Pages 發布，完全靜態化。

### 3.2 UI/UX 與視覺設計 (Visual Design)
- **行動裝置優先 (Mobile-First)**：介面必須能在手機上完美顯示，支援滑動手勢 (Swipe) 最佳。
- **高級質感設計**：
  - 採用深色模式 (Dark Theme) 為主色調，保護眼睛且具現代感。
  - 使用玻璃擬物化 (Glassmorphism) 的卡片設計（半透明背景、背景模糊、微妙的邊框光暈）。
  - 順暢的 CSS 3D 卡片翻轉動畫與微互動 (Hover effects)。

### 3.3 資料結構設計 (Data Architecture)
- 網頁支援兩種模式：
  1. **解析模式 (Parser Mode)**：直接在瀏覽器記憶體中將使用者選擇的 `.md` 檔案轉化為 JavaScript 陣列物件。
  2. **快取模式 (Cache Mode)**：將解析成功的物件快取於 `localStorage` 中，讓使用者下次打開不需重新上傳同一份檔案。
- **內部轉換格式範例**（由 `.md` 解析後產生）：
  ```json
  {
    "day": 1,
    "word": "I",
    "phonetic": "/aɪ/",
    "meaning": "我",
    "example": "I am here.（我在這裡。）",
    "hint": "像中文「愛」的發音...",
    "pronunciation": "單音節、長元音..."
  }
  ```

### 3.4 專案資料夾結構 (Project Directory Structure)
為了保持專案整潔並完美配合 GitHub Pages 部署，將採用以下原生的靜態檔案結構：

```text
english-srs-learning/
│
├── index.html           # 網頁主入口（進度儀表板、單字卡介面）
├── css/
│   └── style.css        # 樣式表（深色模式、玻璃擬物化設計、動畫過渡）
├── js/
│   ├── app.js           # 主程式控制器（UI 互動、事件綁定）
│   ├── parser.js        # Markdown 解析器（將 .md 轉換為記憶體內的單字卡陣列）
│   ├── tts.js           # 語音模組（封裝 Web Speech API 發音邏輯）
│   ├── storage.js       # 資料模組（LocalStorage 存取、匯出與匯入功能）
│   └── github.js        # API 模組（抓取並載入 Repo 中的 .md 檔案）
│
├── README.md            # 專案說明與 GitHub Pages 網址
├── 學習計畫總覽.md      # 原有文件
├── 1500全球化英語基本詞彙清單 V2...csv
│
└── lessons/             # 統一存放所有每日學習教材 (Markdown) 的資料夾
    ├── Day1_詳細學習.md
    ├── Day2_詳細學習.md
    ├── Day3_詳細學習.md
    └── ...
```

## 4. 開發階段與交付物 (Milestones)

- **Phase 1: 資料準備** - 將現有的 Day 1 到 Day 14 的 Markdown 轉換為 JSON 格式。
- **Phase 2: 骨架開發** - 建立 HTML 結構與進度面板。
- **Phase 3: 核心功能** - 實作 Flashcard 翻轉、語音 API 及上一張/下一張邏輯。
- **Phase 4: 狀態記憶** - 整合 Local Storage 寫入 SRS 邏輯。
- **Phase 5: 美化與部署** - 套用高質感 CSS，並上傳至 GitHub 啟動 GitHub Pages。
