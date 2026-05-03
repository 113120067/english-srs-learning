document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const daySelector = document.getElementById("day-selector");
  const statusSummary = document.getElementById("status-summary");

  const flashcardContainer = document.getElementById("flashcard-container");
  const emptyState = document.getElementById("empty-state");

  const flashcard = document.getElementById("flashcard");

  // Front elements
  const wordFront = document.getElementById("word-front");
  const phoneticFront = document.getElementById("phonetic-front");
  const ttsFrontBtn = document.getElementById("tts-front");

  // Back elements
  const wordBack = document.getElementById("word-back");
  const meaningBack = document.getElementById("meaning-back");
  const exampleBack = document.getElementById("example-back");
  const hintBack = document.getElementById("hint-back");
  const pronunciationBack = document.getElementById("pronunciation-back");
  const ttsBackBtn = document.getElementById("tts-back");

  // Sections
  const hintSection = document.getElementById("hint-section");
  const pronunciationSection = document.getElementById("pronunciation-section");

  // Controls
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const markBadBtn = document.getElementById("mark-bad-btn");
  const markGoodBtn = document.getElementById("mark-good-btn");
  const resetDayBtn = document.getElementById("reset-day-btn");

  // App State
  let currentWords = [];
  let currentIndex = 0;
  let isFlipped = false;

  // Initialization
  function init() {
    populateDaySelector();
    bindEvents();
    loadDayData("Day1");
  }

  function populateDaySelector() {
    // Populate from lessons/manifest.json when available
    (async () => {
      try {
        const res = await fetch("lessons/manifest.json");
        if (!res.ok) throw new Error("manifest not found");
        const days = await res.json();
        days.forEach((d) => {
          const option = document.createElement("option");
          option.value = d;
          option.textContent = d.replace("Day", "Day ");
          daySelector.appendChild(option);
        });
      } catch (err) {
        // Fallback: populate 1..14
        for (let i = 1; i <= 14; i++) {
          const option = document.createElement("option");
          option.value = `Day${i}`;
          option.textContent = `Day ${i}`;
          daySelector.appendChild(option);
        }
      }
    })();
  }

  function bindEvents() {
    daySelector.addEventListener("change", (e) => loadDayData(e.target.value));

    flashcard.addEventListener("click", (e) => {
      // Prevent flipping if a button inside the card was clicked
      if (e.target.closest("button")) return;
      toggleFlip();
    });

    prevBtn.addEventListener("click", showPrevWord);
    nextBtn.addEventListener("click", showNextWord);

    markBadBtn.addEventListener("click", () => markWord(1)); // 1 = Bad
    markGoodBtn.addEventListener("click", () => markWord(2)); // 2 = Good

    ttsFrontBtn.addEventListener("click", playTTS);
    ttsBackBtn.addEventListener("click", playTTS);

    resetDayBtn.addEventListener("click", () => loadDayData(daySelector.value));
  }

  async function loadDayData(dayId) {
    statusSummary.textContent = "Loading...";
    flashcardContainer.style.display = "none";
    emptyState.style.display = "none";

    currentWords = await StorageModule.getTodayReviewList(dayId);

    if (currentWords.length > 0) {
      currentIndex = 0;
      statusSummary.textContent = `${currentWords.length} words to review today`;
      flashcardContainer.style.display = "flex";
      renderCard();
    } else {
      statusSummary.textContent = `0 words to review`;
      emptyState.style.display = "flex";
    }
  }

  function renderCard() {
    if (currentWords.length === 0) return;

    const currentWord = currentWords[currentIndex];

    // Ensure card is front-facing
    if (isFlipped) {
      flashcard.classList.remove("is-flipped");
      isFlipped = false;
      // Delay rendering back content until flip animation finishes
      setTimeout(() => populateCardData(currentWord), 300);
    } else {
      populateCardData(currentWord);
    }

    updateNavButtons();
  }

  function populateCardData(item) {
    // Front
    wordFront.textContent = item.word;
    phoneticFront.textContent = item.phonetic;

    // Back
    wordBack.textContent = item.word;
    meaningBack.textContent = item.meaning;
    exampleBack.textContent = item.example;

    if (item.hint) {
      hintBack.textContent = item.hint;
      hintSection.style.display = "block";
    } else {
      hintSection.style.display = "none";
    }

    if (item.pronunciation) {
      pronunciationBack.textContent = item.pronunciation;
      pronunciationSection.style.display = "block";
    } else {
      pronunciationSection.style.display = "none";
    }
  }

  function toggleFlip() {
    isFlipped = !isFlipped;
    flashcard.classList.toggle("is-flipped");
  }

  function showNextWord() {
    if (currentIndex < currentWords.length - 1) {
      currentIndex++;
      renderCard();
    }
  }

  function showPrevWord() {
    if (currentIndex > 0) {
      currentIndex--;
      renderCard();
    }
  }

  function updateNavButtons() {
    prevBtn.disabled = currentIndex === 0;
    prevBtn.style.opacity = currentIndex === 0 ? "0.5" : "1";

    nextBtn.disabled = currentIndex === currentWords.length - 1;
    nextBtn.style.opacity =
      currentIndex === currentWords.length - 1 ? "0.5" : "1";
  }

  function playTTS(e) {
    e.stopPropagation(); // prevent card flip
    if (currentWords.length > 0) {
      TTSModule.speak(currentWords[currentIndex].word);
    }
  }

  function markWord(statusId) {
    if (currentWords.length === 0) return;

    const currentWord = currentWords[currentIndex];
    const dayId = daySelector.value;

    StorageModule.updateWordStatus(dayId, currentWord.word, statusId);

    // Auto advance to next word, or show empty state if finished
    if (currentIndex < currentWords.length - 1) {
      currentIndex++;
      renderCard();
    } else {
      flashcardContainer.style.display = "none";
      emptyState.style.display = "flex";
      statusSummary.textContent = `All caught up!`;
      // Remove the finished words from the array
      currentWords = [];
    }
  }

  // Run initialization
  init();
});
