# Global English SRS Web App

This is a lightweight, mobile-first Web Application for learning the "Global English Basic Vocabulary" using Spaced Repetition System (SRS) principles.

## Features
- **Serverless**: Fully static HTML/CSS/JS, deployable to GitHub Pages.
- **SRS Tracking**: Remembers your learning progress directly in your browser's `localStorage`.
- **Text-to-Speech**: Built-in American English pronunciation using the Web Speech API.
- **Glassmorphism UI**: Beautiful, modern dark-themed interface with 3D card flip animations.

## How to Use
1. Open the app in your browser.
2. Select a Day (e.g., Day 1) from the dropdown.
3. Click the flashcard to flip and see the translation, example, and hint.
4. Click 🔊 to hear the pronunciation.
5. Rate your memory:
   - **✅ 記住了 (Mastered)**: Delays the next review (e.g., +3 days, +6 days).
   - **❌ 還不熟 (Needs Review)**: Queues the word for review tomorrow.
6. The app will automatically show you due words each day!

## Development
- The vocabulary data is stored in `lessons/DayX.json`.
- The source Markdown files can be converted to JSON using the Python script:
  ```bash
  python scripts/convert_md_to_json.py
  ```

## Deployment
Simply push the `main` branch to GitHub and enable **GitHub Pages** from the repository settings (deploy from the `main` branch root `/`).
