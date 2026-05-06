# Job 開發紀錄（english-srs-learning）

> 本文件目的：提供後續 AI/開發者快速接手本 repo 的「Jobs 文章 lessons」擴充工作。
> 
> Repo: `113120067/english-srs-learning`
> 
> 最近更新日期：2026-05-06

---

## 1. 專案概覽
本 repo 是一個純前端（HTML/CSS/JS）的 SRS Web App，使用 `localStorage` 記錄複習狀態，並透過 Web Speech API（TTS）朗讀卡片正面文字。

- 主要入口：`index.html`
- 前端邏輯：`js/app.js`
- lessons 資料：`lessons/*.json`
- lessons 清單：`lessons/manifest.json`

---

## 2. Lessons 系統現況（重要）
### 2.1 manifest
App 會嘗試讀取：`lessons/manifest.json`
- 內容是一個字串陣列，例如：`["Day1", "Day2", ...]`
- 下拉選單顯示文字：`d.replace("Day", "Day ")`
  - 若 lesson id 不是 `DayX`，例如 `Jobs01`，顯示就會是 `Jobs01`（不會自動加空格），屬正常行為。

### 2.2 lesson JSON 格式（既有 schema）
`lessons/DayX.json` 的每個 item 通常包含：
- `word`: string（卡片正面主要文字；原本是單字）
- `phonetic`: string（音標）
- `meaning`: string（中文意思）
- `example`: string（例句或補充）
- `hint`: string（提示）
- `pronunciation`: string（發音/朗讀提示）

`js/app.js` 會用 `textContent` 渲染以上欄位，所以：
- `hint` / `example` 等欄位**不支援 Markdown**，只能用純文字換行 `\n` 來排版。

### 2.3 SRS 狀態鍵（注意事項）
`js/app.js` 在標記熟悉度時呼叫：
- `StorageModule.updateWordStatus(dayId, currentWord.word, statusId)`

也就是說：
- **同一個 dayId 裡，`word` 必須唯一**，否則狀態會互相覆蓋。
- 若用「句子」做卡片，請避免兩張卡的英文句完全一樣。

---

## 3. Jobs 文章 Lessons：設計決策與規格
目標：
- 「閱讀理解」導向
- 一句一句進行
- 最終目標是背起來整篇文章
- 卡型採用「翻譯卡」（Card type B）

### 3.1 切分策略
- 以文章段落為主，每課 8–15 句（MVP 可先 8 句示範）
- **不拆原句**（保持原文句子完整）

### 3.2 欄位兼容策略（不改前端）
為了不修改 app 程式碼，採用既有 schema 來裝「句子卡」：
- `word`：英文原句（Front）
- `meaning`：中文翻譯（Back 主答案）
- `example`：英英解釋（Back 補充，簡單英文說明該句意思）
- `hint`：中文解釋 + Key terms（每句 1–3 個）
  - Key terms 需包含：詞性 (POS)、同義 (syn)、反義 (ant)
- `phonetic`：可留空
- `pronunciation`：句子朗讀提示（重音、連讀、語塊等；可選但建議加）

### 3.3 Key terms 規格
- 每句固定 1–3 個 key terms，避免內容過胖
- 形式建議（純文字）：
  - `1) term (POS): 中文；syn: ...; ant: ...`

### 3.4 來源/版權標註
每個 Jobs lesson 建議搭配一個 `*_詳細學習.md`，放入：
- Title
- Speaker
- Delivered/Date
- Source URL
- Note: For educational / personal study use.

---

## 4. 已完成的工作（截至 2026-05-06）
### 4.1 Jobs01（示範課）
來源：Stanford News（prepared text）
- https://news.stanford.edu/stories/2005/06/youve-got-find-love-jobs-says

已新增檔案：
- `lessons/Jobs01.json`
  - 開場段落 8 句（候選 A：開場 + 三個故事宣告）
  - 每句包含：中文翻譯、英英解釋、中文解釋、key terms（詞性/同反義）、朗讀提示
- `lessons/Jobs01_詳細學習.md`
  - 含來源標註、使用建議流程、逐句詳解

manifest：
- `lessons/manifest.json` 需包含 `"Jobs01"` 才會出現在下拉選單
  - 使用者已自行更新完成（若後續協作，請確認 repo 現況是否已包含）。

---

## 5. 後續如何擴充（Jobs02, Jobs03, ...）
### 5.1 命名建議
- lesson id：`Jobs02`, `Jobs03`, ...
- 檔案：
  - `lessons/Jobs02.json`
  - `lessons/Jobs02_詳細學習.md`

### 5.2 建議課程切點
可用下列邏輯切段（每課 8–15 句）：
- Opening（已做 Jobs01）
- Story 1: connecting the dots
- Story 2: love and loss
- Story 3: death
- Ending: “Stay hungry. Stay foolish.”

### 5.3 品質檢查清單
新增/修改一課時，至少檢查：
- [ ] `lessons/manifest.json` 有加入新 lesson id
- [ ] `word`（英文句）在該 lesson 內不重複
- [ ] `hint` / `example` 使用純文字與換行，不依賴 Markdown
- [ ] 每句 key terms 1–3 個，包含 POS/syn/ant
- [ ] 中文翻譯以「可背」為目標：短、準、通順
- [ ] 英英解釋用簡單句，避免比原句更難

---

## 6. 擴充計畫（目標 18–24 課；每課 8–15 句；不拆原句）

### 6.1 原則（把計畫做完的方式）
1. **只做一件事：照原文順序連續切句**，每課 8–15 句，盡量切在段落結束或事件結束點。
2. 每新增一課 `JobsXX`：
   - 建立 `lessons/JobsXX.json`
   - 建立 `lessons/JobsXX_詳細學習.md`
   - `lessons/manifest.json` 追加 `"JobsXX"`
3. 每句固定：翻譯 + 英英解釋 + 中文解釋 + Key terms(1–3) +（可選）朗讀提示。

### 6.2 建議課程骨架（不綁死句號位置，以「內容段落」為切點）
> 說明：以下是「章節→課」的工作分解，用來保證最後可以落在 18–24 課完成。
> 實作時以原文句子為準：每課從某句開始，往下數 8–15 句，遇到自然段落可提早收。

#### A. Opening
- Jobs01（已完成）：開場 + 三個故事宣告

#### B. Story 1 — Connecting the dots（建議 5–6 課）
- Jobs02：為何 drop out（背景、昂貴學費、看不到價值）
- Jobs03：drop-in classes、跟隨好奇與直覺
- Jobs04：生活困難（睡地板、退瓶子、走去 Hare Krishna）
- Jobs05：calligraphy 課（serif/sans-serif/spacing/typography）
- Jobs06：十年後 Macintosh（把 calligraphy 變成產品優勢）
- （可選）Jobs07：dots 名言段落（You can’t connect the dots… trust… confidence…）

#### C. Story 2 — Love and loss（建議 5–6 課）
- Jobs08：早早找到熱愛、在車庫創辦 Apple
- Jobs09：Apple 成長、Macintosh、轉折前的高峰
- Jobs10：被自己創辦的公司開除（衝突、董事會）
- Jobs11：低潮、覺得辜負前輩、想逃離
- Jobs12：仍然熱愛、決定重新開始
- Jobs13：NeXT + Pixar + 愛情/家庭、Apple 買 NeXT（回歸與總結 don’t lose faith）

#### D. Story 3 — Death（建議 6–7 課）
- Jobs14：17 歲看到的 quote、每天照鏡子的問題
- Jobs15：死亡作為決策工具（外在期待/自尊/恐懼會消失）
- Jobs16：癌症診斷（scan、pancreas、預期壽命）
- Jobs17：Prepare to die 的意義（交代家人、把事情做好）
- Jobs18：biopsy、罕見可治、手術後康復
- Jobs19：death 的普遍性、life’s best invention、change agent
- Jobs20：你的時間有限（不要活在別人期待、follow your heart & intuition）

#### E. Closing — Whole Earth Catalog / Stay hungry
- Jobs21：Whole Earth Catalog 介紹（理想主義、時代背景、Stewart Brand）
- Jobs22：封底照片與 “Stay hungry. Stay foolish.”
- Jobs23：對畢業生的祝福收尾（如最後幾句較短，也可併入 Jobs22 讓總課數更貼近 18–24）

### 6.3 完成定義（Definition of Done）
當以下條件達成，即視為「擴充計畫完成」：
1) `lessons/manifest.json` 包含 `Jobs01..JobsNN`，且下拉選單能選到每一課
2) 每個 `JobsXX.json` 都能在 app 正常載入、翻卡、TTS、標記熟悉度
3) 每課都有 `JobsXX_詳細學習.md`，含來源標註 + 逐句詳解
4) 同一課內 `word` 不重複（避免 localStorage 覆蓋）
5) 每句 Key terms 1–3 個，且含 POS/syn/ant（最低標準）

---

## 7.（可選）未來改進方向
若要讓「句子卡」更舒服，可能需要改前端：
- 支援多行排版（目前 `textContent` 已可換行，但 UI 可能需 CSS 調整）
- 支援欄位：例如 `sentence`, `zh`, `en_explain`, `key_terms[]`（需改 app schema）
- 支援 Markdown（改用 `innerHTML` 需注意 XSS；或做安全的 markdown render）
- 句子級 TTS 分段/語速控制

---

## 8. 參考檔案（程式碼入口）
- `js/app.js`
  - 讀取 `lessons/manifest.json`
  - 載入 lesson：`loadDayData(dayId)`
  - 渲染欄位：`populateCardData(item)`
  - TTS 朗讀：讀 `currentWords[currentIndex].word`

---
