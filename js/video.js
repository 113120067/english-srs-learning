// Video Module Core Logic

let player;
let isPlayerReady = false;
let currentDay = '1';
let reviewList = [];
let currentSegmentIndex = 0;
let checkTimeInterval;
let currentSegment = null;

// DOM Elements
const daySelector = document.getElementById('day-selector');
const videoWrapper = document.getElementById('video-wrapper');
const flashcardContainer = document.getElementById('flashcard-container');
const emptyState = document.getElementById('empty-state');
const statusSummary = document.getElementById('status-summary');
const flashcard = document.getElementById('flashcard');
const chineseFront = document.getElementById('chinese-front');
const englishBack = document.getElementById('english-back');
const keyWordsList = document.getElementById('key-words-list');
const replayBtn = document.getElementById('replay-btn');
const markBadBtn = document.getElementById('mark-bad-btn');
const markGoodBtn = document.getElementById('mark-good-btn');
const resetDayBtn = document.getElementById('reset-day-btn');

// Initialize App
async function init() {
    populateDaySelector();
    await loadDayData(currentDay);

    // Event Listeners
    daySelector.addEventListener('change', async (e) => {
        currentDay = e.target.value;
        await loadDayData(currentDay);
    });

    flashcard.addEventListener('click', flipCard);
    
    replayBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card flip
        replayCurrentSegment();
    });

    markBadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSrsAction(1); // 1 = bad
    });

    markGoodBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSrsAction(2); // 2 = good
    });

    resetDayBtn.addEventListener('click', () => {
        loadDayData(currentDay);
    });
}

function populateDaySelector() {
    daySelector.innerHTML = '';
    // For MVP, just Day 1
    const option = document.createElement('option');
    option.value = '1';
    option.textContent = 'Day 1 (Video)';
    daySelector.appendChild(option);
}

async function loadDayData(day) {
    statusSummary.textContent = 'Loading video data...';
    
    const result = await StorageModule.getVideoReviewList(day);
    if (!result || !result.items || result.items.length === 0) {
        showEmptyState();
        return;
    }

    reviewList = result.items;
    currentSegmentIndex = 0;
    statusSummary.textContent = `${reviewList.length} segments to review`;
    
    showFlashcardState();
    
    // Initialize or Update YouTube Player
    if (!player) {
        // YT API will call onYouTubeIframeAPIReady when script loads
        // If it's already loaded but player is null (shouldn't happen often if we use global callback)
        if (window.YT && window.YT.Player) {
            createPlayer(result.videoID);
        } else {
            // Wait for onYouTubeIframeAPIReady
            window.pendingVideoId = result.videoID;
        }
    } else {
        // Player exists, just load new video
        player.loadVideoById(result.videoID);
        startSegment();
    }
}

// YouTube API Callback
function onYouTubeIframeAPIReady() {
    if (window.pendingVideoId) {
        createPlayer(window.pendingVideoId);
    }
}

function createPlayer(videoId) {
    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'controls': 0, // Hide YT controls
            'disablekb': 1,
            'rel': 0,
            'fs': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    isPlayerReady = true;
    startSegment();
}

function onPlayerStateChange(event) {
    // Handling buffering or other states if needed
}

function startSegment() {
    if (!isPlayerReady || currentSegmentIndex >= reviewList.length) return;
    
    currentSegment = reviewList[currentSegmentIndex];
    
    // Reset Card UI
    flashcard.classList.remove('is-flipped');
    chineseFront.textContent = currentSegment.chinese;
    englishBack.textContent = currentSegment.english;
    
    // Populate Key Words
    keyWordsList.innerHTML = '';
    if (currentSegment.key_words) {
        currentSegment.key_words.forEach(kw => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="kw-word">${kw.word}</span> <span class="kw-phonetic">${kw.phonetic || ''}</span><span class="kw-meaning">${kw.meaning}</span>`;
            keyWordsList.appendChild(li);
        });
    }

    // Play video segment
    playSegment();
}

function playSegment() {
    if (!currentSegment) return;
    
    clearInterval(checkTimeInterval);
    
    player.seekTo(currentSegment.startTime);
    player.playVideo();
    
    checkTimeInterval = setInterval(checkVideoTime, 100);
}

function checkVideoTime() {
    if (player && player.getCurrentTime) {
        const currentTime = player.getCurrentTime();
        if (currentTime >= currentSegment.endTime) {
            player.pauseVideo();
            clearInterval(checkTimeInterval);
        }
    }
}

function replayCurrentSegment() {
    if (player) {
        playSegment();
    }
}

function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

function handleSrsAction(statusId) {
    StorageModule.updateVideoSegmentStatus(currentDay, currentSegment.id, statusId);
    
    // Go to next segment
    currentSegmentIndex++;
    if (currentSegmentIndex < reviewList.length) {
        statusSummary.textContent = `${reviewList.length - currentSegmentIndex} segments remaining`;
        startSegment();
    } else {
        showEmptyState();
    }
}

function showEmptyState() {
    videoWrapper.style.display = 'none';
    flashcardContainer.style.display = 'none';
    emptyState.style.display = 'flex';
    statusSummary.textContent = 'All done for today!';
}

function showFlashcardState() {
    videoWrapper.style.display = 'block';
    flashcardContainer.style.display = 'flex';
    emptyState.style.display = 'none';
}

// Start app
init();
