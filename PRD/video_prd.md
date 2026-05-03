

```markdown
# 軟體需求規格書 (PRD) - 模組二：影音互動與導讀背誦系統

## 1. 模組概述 (Module Overview)
本模組為「全球化英語 SRS 學習計畫」的核心擴展模組，旨在解決初學者在背誦長篇演講（如史丹佛演講）時的聽力迷失與記憶斷層問題。透過 YouTube API 的精準時間控制，將靜態單字卡轉化為動態的「影音練習器」。

## 2. 核心功能需求 (Functional Requirements)

### 2.1 影音播放控制單元
* **YouTube API 整合**：嵌入固定於頂部的播放器，支援動態載入指定片段。
* **片段鎖定 (Segmented Playback)**：根據 JSON 資料中的 `startTime` 與 `endTime`，自動執行 `player.seekTo()` 並控制播放範圍。
* **播放速度調整**：預設提供 0.75x (學習模式) 與 1.0x (原速) 選項。

### 2.2 雙模式練習邏輯
| 模式名稱 | 行為定義 | 適用場景 |
| :--- | :--- | :--- |
| **沉浸模式 (Immersive)** | 影片連續播放，下方卡片隨時間自動滾動並高亮對應的中英內容。 | 初步熟悉語感、磨耳朵階段。 |
| **背誦模式 (Drill)** | 影片播完一個句子後自動暫停，顯示中文引導背誦，等待使用者操作。 | 主動式回憶與 SRS 複習階段。 |

### 2.3 針對不懂英文者的輔助機制
* **點擊查詞 (Click-to-Translate)**：英文句子中的重點單字需具備互動性，點擊後即時彈出中文解釋與音標。
* **TTS 雙軌發音**：除了影片背景音外，卡片應附帶 Web Speech API 按鈕，提供純淨的美式發音。
* **Pronunciation Tip 顯示**：於卡片下方即時顯示該句的發音竅門（如連音、不發音位置）。

## 3. 介面與交互設計 (UI/UX Design)

### 3.1 響應式佈局 (Responsive Layout)
* **手機端 (Mobile)**：採用 `100dvh` 固定高度。頂部 30% 為影片區，中部 55% 為互動卡片區（可內部滾動），底部 15% 為固定操作按鈕。
* **視覺風格**：延續 V2 規範之**深色模式**與**玻璃擬物化 (Glassmorphism)**。背景使用 `backdrop-filter: blur(10px)`。

### 3.2 操作流程 (User Flow)
1. 使用者於 Dashboard 選擇 Day X。
2. 進入「背誦模式」，影片自動停在第一句末。
3. 使用者背誦後點擊「Flip」查看答案，判定「熟練」或「不熟」。
4. 若點擊「不熟」，系統紀錄狀態並自動播放下一句，不強制重讀，降低挫折感。

## 4. 資料結構規範 (Data Structure)
JSON 檔案需擴展以下欄位以支援模組二：

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
      ],
      "pronunciation_tip": "注意 honored to 的連結讀法"
    }
  ]
}
```

## 5. 動力激勵與管理
* **完課語錄**：每日內容完成後，顯示「只跟自己比，距離成功只差一點點」等隨機鼓勵文字。
* **重置功能**：提供「重新挑戰」按鈕，清空 LocalStorage 該模組的所有學習進度。
```

---


```python?code_reference&code_event_index=3
markdown_content = """# 軟體需求規格書 (PRD) - 模組二：影音互動與導讀背誦系統

## 1. 模組概述 (Module Overview)
本模組為「全球化英語 SRS 學習計畫」的核心擴展模組，旨在解決初學者在背誦長篇演講（如史丹佛演講）時的聽力迷失與記憶斷層問題。透過 YouTube API 的精準時間控制，將靜態單字卡轉化為動態的「影音練習器」。

## 2. 核心功能需求 (Functional Requirements)

### 2.1 影音播放控制單元
* **YouTube API 整合**：嵌入固定於頂部的播放器，支援動態載入指定片段。
* **片段鎖定 (Segmented Playback)**：根據 JSON 資料中的 `startTime` 與 `endTime`，自動執行 `player.seekTo()` 並控制播放範圍。
* **播放速度調整**：預設提供 0.75x (學習模式) 與 1.0x (原速) 選項。

### 2.2 雙模式練習邏輯
| 模式名稱 | 行為定義 | 適用場景 |
| :--- | :--- | :--- |
| **沉浸模式 (Immersive)** | 影片連續播放，下方卡片隨時間自動滾動並高亮對應的中英內容。 | 初步熟悉語感、磨耳朵階段。 |
| **背誦模式 (Drill)** | 影片播完一個句子後自動暫停，顯示中文引導背誦，等待使用者操作。 | 主動式回憶與 SRS 複習階段。 |

### 2.3 針對不懂英文者的輔助機制
* **點擊查詞 (Click-to-Translate)**：英文句子中的重點單字需具備互動性，點擊後即時彈出中文解釋與音標。
* **TTS 雙軌發音**：除了影片背景音外，卡片應附帶 Web Speech API 按鈕，提供純淨的美式發音。
* **Pronunciation Tip 顯示**：於卡片下方即時顯示該句的發音竅門（如連音、不發音位置）。

## 3. 介面與交互設計 (UI/UX Design)

### 3.1 響應式佈局 (Responsive Layout)
* **手機端 (Mobile)**：採用 `100dvh` 固定高度。頂部 30% 為影片區，中部 55% 為互動卡片區（可內部滾動），底部 15% 為固定操作按鈕。
* **視覺風格**：延續 V2 規範之**深色模式**與**玻璃擬物化 (Glassmorphism)**。背景使用 `backdrop-filter: blur(10px)`。

### 3.2 操作流程 (User Flow)
1. 使用者於 Dashboard 選擇 Day X。
2. 進入「背誦模式」，影片自動停在第一句末。
3. 使用者背誦後點擊「Flip」查看答案，判定「熟練」或「不熟」。
4. 若點擊「不熟」，系統紀錄狀態並自動播放下一句，不強制重讀，降低挫折感。

## 4. 資料結構規範 (Data Structure)
JSON 檔案需擴展以下欄位以支援模組二：

```
```text?code_stdout&code_event_index=3
File saved as Module_2_Interactive_Video_PRD.md

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
      ],
      "pronunciation_tip": "注意 honored to 的連結讀法"
    }
  ]
}
```

## 5. 動力激勵與管理
* **完課語錄**：每日內容完成後，顯示「只跟自己比，距離成功只差一點點」等隨機鼓勵文字。
* **重置功能**：提供「重新挑戰」按鈕，清空 LocalStorage 該模組的所有學習進度。
"""

``
