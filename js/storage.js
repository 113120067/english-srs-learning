const StorageModule = {
    STORAGE_KEY: 'global_english_srs_data',

    // Load user's SRS progress from localStorage
    loadProgress: function() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    },

    // Save user's SRS progress to localStorage
    saveProgress: function(progressData) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progressData));
    },

    // Get today's date string (YYYY-MM-DD)
    getTodayStr: function() {
        return new Date().toISOString().split('T')[0];
    },

    // Add days to a date string
    addDays: function(dateStr, days) {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    },

    // Update status for a word
    updateWordStatus: function(dayId, word, statusId) {
        const progress = this.loadProgress();
        const key = `${dayId}_${word}`;
        
        let wordData = progress[key] || { status: 0, nextReview: this.getTodayStr() };
        
        const today = this.getTodayStr();
        
        if (statusId === 1) { // Bad / Needs Review
            wordData.status = 1;
            // Review tomorrow
            wordData.nextReview = this.addDays(today, 1);
        } else if (statusId === 2) { // Good / Mastered
            if (wordData.status !== 2) {
                // First time marked as mastered, delay 3 days
                wordData.nextReview = this.addDays(today, 3);
            } else {
                // Already mastered before, delay further (e.g. 6 days)
                wordData.nextReview = this.addDays(today, 6);
            }
            wordData.status = 2;
        }

        progress[key] = wordData;
        this.saveProgress(progress);
    },

    // Fetch lesson data from JSON file
    fetchLessonData: async function(dayId) {
        try {
            const response = await fetch(`lessons/${dayId}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${dayId}.json`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading lesson:', error);
            return null;
        }
    },

    // Get words to review today from a specific lesson
    getTodayReviewList: async function(dayId) {
        const words = await this.fetchLessonData(dayId);
        if (!words) return [];

        const progress = this.loadProgress();
        const today = this.getTodayStr();

        return words.filter(item => {
            const key = `${dayId}_${item.word}`;
            const wordProgress = progress[key];
            
            // If it's a new word (no progress), include it
            if (!wordProgress) return true;
            
            // If it has a review date, include if date is <= today
            return wordProgress.nextReview <= today;
        });
    }
};
