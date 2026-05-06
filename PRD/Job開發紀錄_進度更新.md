### 4.x Jobs01（示範課）更新（2026-05-06）
目的：消除來源與內容的截斷（`[...]`）問題，並統一 Key terms 規格，讓後續 Jobs02+ 能從完整稿穩定切句。

已完成：
- [x] `lessons/Jobs01.json`：更新為完整開場 8 句版本（無截斷）；Key terms 規格調整為「每句固定 2 個（含 POS/syn/ant）」。
- [x] `lessons/Jobs01_詳細學習.md`：逐句對應 `Jobs01.json`；Key terms 改為「每句固定 2 個（含 POS/syn/ant）」；移除截斷內容。
- [x] `lessons/source/jobs_stanford_full.txt`：新增完整 prepared text（做為後續 Jobs02+ 切句的乾淨來源）。

驗收建議：
- 在 repo 搜尋字串 `[...]`：上述三個檔案不應再出現。
- App 端：Jobs01 可正常載入、翻卡、TTS、熟悉度標記正常；且同課內 `word` 不重複。