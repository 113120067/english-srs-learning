## 6.x 擴充計畫更新（改以 jobs_stanford_full.txt 為唯一來源）（2026-05-06）

### 背景
先前 `lessons/source/jobs_stanford.md` 與 `lessons/source/You’ve got to find what you love.txt` 存在 `[...]` 截斷，會造成：
- 無法穩定「連續切句」做 8–15 句一課
- 句子不完整，影響背誦、理解、TTS
因此改用新加入的完整逐字稿：
- `lessons/source/jobs_stanford_full.txt`
作為後續 Jobs lessons 的**唯一切句來源**。

### 總原則（維持不改前端）
1. 只用 `jobs_stanford_full.txt` 原文順序切句，每課 8–15 句（MVP 固定 8–12 句亦可）。
2. 不拆原句（保持原文句子完整）。
3. 每句固定欄位（沿用既有 schema）：
   - `word`: 英文原句（Front）
   - `meaning`: 中文翻譯（Back 主答案，短、準、可背）
   - `example`: 英英解釋（Back 補充，簡單句）
   - `hint`: 中文解釋 + Key terms（**每句固定 2 個**，含 POS/syn/ant）
   - `phonetic`: 可留空
   - `pronunciation`: 朗讀提示（可選但建議加）
4. SRS 狀態鍵為 `(dayId, word)`：同一課內 `word` 必須唯一，避免 localStorage 覆蓋。

### 切課骨架（以 jobs_stanford_full.txt 段落為準）
> 實作時以原文為準：每課從某句開始，往下數 8–15 句，遇到自然段落可提早收。

#### A. Opening
- Jobs01（已完成）：開場 8 句（無截斷，Key terms 每句 2 個）

#### B. Story 1 — Connecting the dots（預計 5–6 課）
- Jobs02：drop out 的描述 + “So why’d I drop out?”（承接 Jobs01 後的段落起點）
- Jobs03：adoption 故事（母親、領養、意外男嬰）
- Jobs04：選校昂貴、看不到價值、決定退學（tuition / value / drop out）
- Jobs05：drop-in classes + 生活困難（睡地板、退瓶子、走去 Hare Krishna）
- Jobs06：calligraphy 課（serif/sans-serif/spacing/typography）
- （可選）Jobs07：Macintosh typography + dots 名言段落（connect dots backwards / trust）

#### C. Story 2 — Love and loss（預計 5–6 課）
- Jobs08：早期 Apple（車庫創業、成長到 20 歲後十年）
- Jobs09：Macintosh、30 歲被 fire（轉折）
- Jobs10：管理層分歧、董事會、被趕出 Apple
- Jobs11：低潮與反思（devastating / apologize / failure）
- Jobs12：仍然熱愛、決定 start over
- Jobs13：NeXT + Pixar + family + Apple bought NeXT + don’t lose faith 段落收束

#### D. Story 3 — Death（預計 6–7 課）
- Jobs14：17 歲 quote + mirror question（last day）
- Jobs15：remembering death 作為決策工具（expectations/pride/fear fall away）
- Jobs16：cancer 診斷（scan / pancreas）
- Jobs17：Prepare to die + affairs in order + say goodbyes
- Jobs18：biopsy + rare curable cancer + surgery
- Jobs19：death 的普遍性 + life’s change agent
- Jobs20：time is limited + don’t live someone else’s life + follow heart/intuition

#### E. Closing — Whole Earth Catalog / Stay hungry
- Jobs21：Whole Earth Catalog 介紹（Stewart Brand / idealistic / tools）
- Jobs22：final issue back cover + “Stay hungry. Stay foolish.”
- Jobs23：最後祝福收尾（Stay hungry. Stay foolish. Thank you all very much.）

### Definition of Done（每新增一課）
- [ ] 新增 `lessons/JobsXX.json`（無截斷、同課 word 不重複）
- [ ] 新增 `lessons/JobsXX_詳細學習.md`（來源標註 + 逐句詳解）
- [ ] `lessons/manifest.json` 追加 `"JobsXX"`
- [ ] 每句 Key terms 固定 2 個，且含 POS/syn/ant
- [ ] App 端可載入、翻卡、TTS、熟悉度記錄正常