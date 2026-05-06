const TTSModule = {
  synth: window.speechSynthesis,
  voice: null,
  rate: 0.9,

  init: function () {
    // Wait for voices to be loaded
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = this.loadVoices.bind(this);
    }
    this.loadVoices();
  },

  loadVoices: function () {
    const voices = this.synth.getVoices();
    // Try to find a natural-sounding English US voice
    this.voice =
      voices.find((v) => v.lang === "en-US" && v.name.includes("Google")) ||
      voices.find((v) => v.lang === "en-US") ||
      voices[0];
  },

  setRate: function (value) {
    this.rate = Number(value);
  },

  speak: function (text) {
    if (!this.synth) return;

    if (this.synth.speaking) {
      this.synth.cancel();
    }

    const utterThis = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterThis.voice = this.voice;
    }
    utterThis.lang = "en-US";
    utterThis.rate = this.rate;

    this.synth.speak(utterThis);
  },
};

// Initialize on load
TTSModule.init();
