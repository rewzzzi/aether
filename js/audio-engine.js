/**
 * AETHER - Procedural Lo-Fi & Ambient Sound Engine
 * Real-time synthesis using Web Audio API (FM Rhodes, Tape Flutter, Vinyl Crackle, Generative Chords)
 */

class AetherAudioEngine {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.masterGain = null;
        this.filterNode = null;
        this.analyser = null;
        this.recorder = null;
        this.recordedChunks = [];
        this.isRecording = false;

        // Ambiance nodes
        this.vinylGain = null;
        this.vinylSource = null;
        this.rainGain = null;
        this.rainSource = null;

        // Sound parameters
        this.bpm = 72;
        this.currentMood = 'midnight';
        this.activeChordName = '--';
        this.activeNotes = [];
        this.stepIndex = 0;
        this.schedulerTimer = null;
        this.nextChordTime = 0;

        // Controls values
        this.params = {
            masterVolume: 0.50, // Comfortable 50% default
            warmth: 1200,       // Low-pass filter cutoff (Hz)
            tapeFlutter: 0.35,  // Pitch drift intensity
            vinylAmount: 0.04,  // Very soft & subtle vintage presence (no harsh clicks)
            rainAmount: 0.08,   // Subtle ambient rain noise
            space: 0.40         // Reverb / spatial presence
        };

        // Musical scales & Neo-soul chord progressions (Frequencies in Hz)
        // Root octaves 3 & 4
        this.moods = {
            midnight: {
                name: "Midnight Velvet",
                bpm: 68,
                scale: "D Dorian / Neo-Soul",
                progressions: [
                    // Dm9
                    { name: "Dm9", notes: [146.83, 220.00, 261.63, 329.63, 349.23], bass: 73.42, duration: 4 },
                    // G13
                    { name: "G13", notes: [196.00, 246.94, 329.63, 349.23, 440.00], bass: 98.00, duration: 4 },
                    // Cmaj9
                    { name: "Cmaj9", notes: [130.81, 196.00, 246.94, 293.66, 329.63], bass: 65.41, duration: 4 },
                    // Am11
                    { name: "Am11", notes: [110.00, 164.81, 261.63, 293.66, 329.63], bass: 55.00, duration: 4 }
                ],
                soloScale: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
            },
            rainy: {
                name: "Rainy Daydream",
                bpm: 72,
                scale: "F Lydian / Chillhop",
                progressions: [
                    // Fmaj9
                    { name: "Fmaj9", notes: [174.61, 261.63, 329.63, 392.00, 440.00], bass: 87.31, duration: 4 },
                    // Em7
                    { name: "Em7", notes: [164.81, 246.94, 293.66, 392.00], bass: 82.41, duration: 4 },
                    // Dm9
                    { name: "Dm9", notes: [146.83, 220.00, 261.63, 329.63, 349.23], bass: 73.42, duration: 4 },
                    // Cmaj7(add9)
                    { name: "Cmaj7(9)", notes: [130.81, 196.00, 246.94, 293.66, 329.63], bass: 65.41, duration: 4 }
                ],
                soloScale: [174.61, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00]
            },
            ethereal: {
                name: "Ethereal Drift",
                bpm: 60,
                scale: "Ab Major / Floating Ambient",
                progressions: [
                    // Abmaj9
                    { name: "Abmaj9", notes: [207.65, 261.63, 311.13, 392.00, 466.16], bass: 103.83, duration: 4 },
                    // Bb6/9
                    { name: "Bb6/9", notes: [233.08, 293.66, 349.23, 392.00, 466.16], bass: 116.54, duration: 4 },
                    // Cm9
                    { name: "Cm9", notes: [130.81, 196.00, 233.08, 311.13, 349.23], bass: 65.41, duration: 4 },
                    // Gm7
                    { name: "Gm7", notes: [196.00, 233.08, 293.66, 349.23], bass: 98.00, duration: 4 }
                ],
                soloScale: [207.65, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16]
            },
            solar: {
                name: "Solar Haze",
                bpm: 76,
                scale: "Eb Neo-Soul / Warm Groove",
                progressions: [
                    // Ebmaj9
                    { name: "Ebmaj9", notes: [155.56, 233.08, 293.66, 349.23, 392.00], bass: 77.78, duration: 4 },
                    // Abmaj7
                    { name: "Abmaj7", notes: [207.65, 261.63, 311.13, 392.00], bass: 103.83, duration: 4 },
                    // Dbmaj9
                    { name: "Dbmaj9", notes: [138.59, 207.65, 277.18, 311.13, 349.23], bass: 69.30, duration: 4 },
                    // Bb13
                    { name: "Bb13", notes: [233.08, 293.66, 349.23, 392.00, 415.30], bass: 116.54, duration: 4 }
                ],
                soloScale: [155.56, 174.61, 207.65, 233.08, 261.63, 311.13, 349.23]
            }
        };

        this.onChordChange = null; // Callback for UI updates
    }

    /**
     * Initializes the Web Audio Context after user interaction
     */
    async init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        this.setupAudioGraph();
    }

    /**
     * Sets up master bus, filters, limiter, analyser, and ambient loops
     */
    setupAudioGraph() {
        // Master Volume Gain (scaled quadratically for perceptual curve)
        this.masterGain = this.ctx.createGain();
        const initialGain = Math.pow(this.params.masterVolume, 2) * 0.45;
        this.masterGain.gain.setValueAtTime(initialGain, this.ctx.currentTime);

        // Analyser for Liquid Visualizer
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.82;

        // Warmth / Tape Low-pass Filter
        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = "lowpass";
        this.filterNode.frequency.setValueAtTime(this.params.warmth, this.ctx.currentTime);
        this.filterNode.Q.setValueAtTime(1.0, this.ctx.currentTime);

        // Master Bus Compressor / Limiter (prevents harsh volume spikes and clipping)
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(8, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(10, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.20, this.ctx.currentTime);

        // Simple Algorithmic Reverb / Space simulation (Convolver)
        this.reverbNode = this.createReverb(2.8, 0.4);

        // Routing: Filter -> Limiter -> Master -> Analyser -> Destination
        this.filterNode.connect(this.limiter);
        this.limiter.connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        // Init Ambient Sounds (Vinyl & Rain)
        this.initVinylSound();
        this.initRainSound();
    }

    /**
     * Creates an impulse response for gentle warm room reverb
     */
    createReverb(duration, decay) {
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.ctx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = i / length;
            // Exponential decay with slight stereo differentiation
            const env = Math.exp(-n * decay * 10);
            left[i] = (Math.random() * 2 - 1) * env;
            right[i] = (Math.random() * 2 - 1) * env;
        }

        const convolver = this.ctx.createConvolver();
        convolver.buffer = impulse;
        return convolver;
    }

    /**
     * Procedural Warm Vinyl Atmosphere (Soft analog hum, no harsh clicks)
     */
    initVinylSound() {
        const bufferSize = this.ctx.sampleRate * 6; // 6-second loop
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Soft pink noise base
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            data[i] = (b0 + b1 + b2) * 0.02; // Very quiet warm base
        }

        // Add rare, warm, smoothed micro-pops (only 1-2 per 3 seconds, NOT ear-piercing)
        for (let i = 10; i < bufferSize - 10; i++) {
            if (Math.random() < 0.000015) { // ~0.6 pops per second
                const popStrength = (Math.random() > 0.5 ? 1 : -1) * (0.04 + Math.random() * 0.05);
                // Smooth bell curve envelope over 5 samples to avoid sharp Dirac clicks
                data[i - 2] += popStrength * 0.2;
                data[i - 1] += popStrength * 0.6;
                data[i]     += popStrength * 1.0;
                data[i + 1] += popStrength * 0.6;
                data[i + 2] += popStrength * 0.2;
                i += 1200; // Minimum gap between pops
            }
        }

        this.vinylSource = this.ctx.createBufferSource();
        this.vinylSource.buffer = buffer;
        this.vinylSource.loop = true;

        this.vinylGain = this.ctx.createGain();
        this.vinylGain.gain.setValueAtTime(this.params.vinylAmount, this.ctx.currentTime);

        // Warm bandpass: Cut harsh highs (>2400Hz) and sub rumble (<250Hz)
        const vinylHighpass = this.ctx.createBiquadFilter();
        vinylHighpass.type = "highpass";
        vinylHighpass.frequency.setValueAtTime(250, this.ctx.currentTime);

        const vinylWarmLowpass = this.ctx.createBiquadFilter();
        vinylWarmLowpass.type = "lowpass";
        vinylWarmLowpass.frequency.setValueAtTime(2200, this.ctx.currentTime); // Softens all clicks

        this.vinylSource.connect(vinylHighpass);
        vinylHighpass.connect(vinylWarmLowpass);
        vinylWarmLowpass.connect(this.vinylGain);
        this.vinylGain.connect(this.limiter);
    }

    /**
     * Procedural Rain / Pink-noise Ambient Generator
     */
    initRainSound() {
        const bufferSize = this.ctx.sampleRate * 4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Brown noise approximation for warm rainfall
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut * 1.4;
        }

        this.rainSource = this.ctx.createBufferSource();
        this.rainSource.buffer = buffer;
        this.rainSource.loop = true;

        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.setValueAtTime(this.params.rainAmount, this.ctx.currentTime);

        const rainFilter = this.ctx.createBiquadFilter();
        rainFilter.type = "lowpass";
        rainFilter.frequency.setValueAtTime(950, this.ctx.currentTime);

        this.rainSource.connect(rainFilter);
        rainFilter.connect(this.rainGain);
        this.rainGain.connect(this.limiter);
    }

    /**
     * Synthesizes an electric piano / Rhodes note (FM + Harmonics + Tape Flutter)
     */
    playRhodesNote(freq, time, duration = 3.5, velocity = 0.7) {
        if (!this.ctx) return;

        // Carrier oscillator (Fundamental Sine)
        const carrier = this.ctx.createOscillator();
        carrier.type = "sine";

        // Tape Flutter LFO (creates authentic pitch instability)
        const flutterLFO = this.ctx.createOscillator();
        const flutterGain = this.ctx.createGain();
        flutterLFO.frequency.setValueAtTime(0.75 + Math.random() * 0.4, time); // ~1Hz wobble
        const wobbleAmount = freq * 0.0035 * (this.params.tapeFlutter / 0.35);
        flutterGain.gain.setValueAtTime(wobbleAmount, time);

        flutterLFO.connect(flutterGain);
        flutterGain.connect(carrier.frequency);

        // Base frequency with slight detune
        const detuneCents = (Math.random() - 0.5) * 6;
        carrier.frequency.setValueAtTime(freq, time);
        carrier.detune.setValueAtTime(detuneCents, time);

        // Modulator for FM chime (Rhodes tine bell sound)
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        modulator.type = "sine";
        modulator.frequency.setValueAtTime(freq * 3.01, time); // 3rd harmonic ratio
        
        // Fast decay on FM index for the metallic attack
        modGain.gain.setValueAtTime(freq * 0.9 * velocity, time);
        modGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        // Note Envelope (ADSR)
        const noteGain = this.ctx.createGain();
        noteGain.gain.setValueAtTime(0.0001, time);
        // Soft attack (20ms) - calibrated gentle level
        noteGain.gain.linearRampToValueAtTime(0.085 * velocity, time + 0.020);
        // Long gentle lo-fi decay
        noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        // Reverb Send
        const wetGain = this.ctx.createGain();
        wetGain.gain.setValueAtTime(this.params.space * 0.45, time);
        noteGain.connect(this.reverbNode);
        this.reverbNode.connect(wetGain);
        wetGain.connect(this.filterNode);

        // Direct connect to filter
        carrier.connect(noteGain);
        noteGain.connect(this.filterNode);

        // Start and stop nodes
        flutterLFO.start(time);
        modulator.start(time);
        carrier.start(time);

        flutterLFO.stop(time + duration);
        modulator.stop(time + duration);
        carrier.stop(time + duration);
    }

    /**
     * Synthesizes a deep, warm Sub-Bass note
     */
    playSubBass(freq, time, duration = 3.8) {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        osc.type = "triangle"; // Slightly richer than pure sine
        osc.frequency.setValueAtTime(freq, time);

        const bassGain = this.ctx.createGain();
        bassGain.gain.setValueAtTime(0.001, time);
        bassGain.gain.linearRampToValueAtTime(0.12, time + 0.06);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        // Dedicated low-pass filter for sub-bass
        const bassFilter = this.ctx.createBiquadFilter();
        bassFilter.type = "lowpass";
        bassFilter.frequency.setValueAtTime(120, time);

        osc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.filterNode);

        osc.start(time);
        osc.stop(time + duration);
    }

    /**
     * Plays a subtle top-line pentatonic droplet / melodic note
     */
    playMelodicDroplet(time) {
        const mood = this.moods[this.currentMood];
        const notes = mood.soloScale;
        const note = notes[Math.floor(Math.random() * notes.length)];

        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(note, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.12, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 2.0);

        osc.connect(gain);
        gain.connect(this.reverbNode);

        osc.start(time);
        osc.stop(time + 2.0);
    }

    /**
     * Master Music Scheduler Loop
     */
    scheduleNextStep() {
        if (!this.isPlaying) return;

        const mood = this.moods[this.currentMood];
        const progression = mood.progressions;
        const chord = progression[this.stepIndex % progression.length];

        const now = this.ctx.currentTime;
        const chordDurationSeconds = (60 / mood.bpm) * chord.duration;

        this.activeChordName = chord.name;
        this.activeNotes = chord.notes;

        if (this.onChordChange) {
            this.onChordChange({
                name: chord.name,
                notes: chord.notes,
                moodName: mood.name,
                bpm: mood.bpm,
                scale: mood.scale
            });
        }

        // Play chord notes with slight humanized micro-delays (strumming effect)
        chord.notes.forEach((freq, idx) => {
            const humanStrum = (idx * 0.035) + (Math.random() * 0.015);
            const vel = 0.6 + Math.random() * 0.25;
            this.playRhodesNote(freq, now + humanStrum, chordDurationSeconds * 1.1, vel);
        });

        // Play Sub-Bass
        if (chord.bass) {
            this.playSubBass(chord.bass, now + 0.02, chordDurationSeconds * 0.95);
        }

        // 60% chance to drop 1-2 melodic top-notes within the chord bar
        if (Math.random() < 0.65) {
            const dropTime1 = now + (chordDurationSeconds * 0.5) + (Math.random() * 0.3);
            this.playMelodicDroplet(dropTime1);
        }
        if (Math.random() < 0.4) {
            const dropTime2 = now + (chordDurationSeconds * 0.75) + (Math.random() * 0.3);
            this.playMelodicDroplet(dropTime2);
        }

        this.stepIndex++;

        // Schedule next chord
        const nextTimeMs = chordDurationSeconds * 1000;
        this.schedulerTimer = setTimeout(() => {
            this.scheduleNextStep();
        }, nextTimeMs);
    }

    /**
     * Start sound generation
     */
    async start() {
        await this.init();
        if (this.isPlaying) return;

        this.isPlaying = true;

        // Start vinyl and rain loops
        try {
            this.vinylSource.start(0);
            this.rainSource.start(0);
        } catch (e) {
            // Already started; re-init
            this.initVinylSound();
            this.initRainSound();
            this.vinylSource.start(0);
            this.rainSource.start(0);
        }

        this.scheduleNextStep();
    }

    /**
     * Stop sound generation
     */
    stop() {
        this.isPlaying = false;
        if (this.schedulerTimer) {
            clearTimeout(this.schedulerTimer);
            this.schedulerTimer = null;
        }

        try {
            this.vinylSource.stop();
            this.rainSource.stop();
        } catch (e) {}

        this.activeChordName = '--';
        if (this.onChordChange) {
            this.onChordChange({ name: '--', notes: [], moodName: 'Dormant', bpm: 0 });
        }
    }

    /**
     * Set mood preset
     */
    setMood(moodKey) {
        if (this.moods[moodKey]) {
            this.currentMood = moodKey;
            this.stepIndex = 0;
            if (this.isPlaying) {
                if (this.schedulerTimer) clearTimeout(this.schedulerTimer);
                this.scheduleNextStep();
            }
        }
    }

    /**
     * Update parameter dynamically from sliders
     */
    updateParam(param, value) {
        this.params[param] = parseFloat(value);

        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (param === 'masterVolume' && this.masterGain) {
            // Perceptual exponential curve for human ear comfort
            const scaledGain = Math.pow(this.params.masterVolume, 2) * 0.45;
            this.masterGain.gain.setTargetAtTime(scaledGain, now, 0.05);
        } else if (param === 'warmth' && this.filterNode) {
            this.filterNode.frequency.setTargetAtTime(this.params.warmth, now, 0.05);
        } else if (param === 'vinylAmount' && this.vinylGain) {
            this.vinylGain.gain.setTargetAtTime(this.params.vinylAmount, now, 0.05);
        } else if (param === 'rainAmount' && this.rainGain) {
            this.rainGain.gain.setTargetAtTime(this.params.rainAmount, now, 0.05);
        }
    }

    /**
     * Start live audio recording
     */
    startRecording() {
        if (!this.ctx || !this.isPlaying || this.isRecording) return;

        const dest = this.ctx.createMediaStreamDestination();
        this.masterGain.connect(dest);

        this.recordedChunks = [];
        this.recorder = new MediaRecorder(dest.stream);

        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data);
        };

        this.recorder.start();
        this.isRecording = true;
    }

    /**
     * Stop recording and trigger browser download
     */
    stopRecording() {
        if (!this.recorder || !this.isRecording) return;

        return new Promise((resolve) => {
            this.recorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `Aether_LoFi_${this.currentMood}_${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
                this.isRecording = false;
                resolve();
            };
            this.recorder.stop();
        });
    }
}

window.AetherAudioEngine = AetherAudioEngine;
