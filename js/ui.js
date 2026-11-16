/**
 * AETHER - UI Controller
 * Manages Liquid Glass HUD events, slider binds, chord displays, and recording triggers
 */

document.addEventListener('DOMContentLoaded', () => {
    const audioEngine = new AetherAudioEngine();
    const visualizer = new LiquidGlassVisualizer('liquid-canvas', audioEngine);

    // DOM Elements
    const playBtn = document.getElementById('play-btn');
    const playBtnText = document.getElementById('play-btn-text');
    const playIcon = document.getElementById('play-icon');
    const chordBadge = document.getElementById('chord-display');
    const scaleBadge = document.getElementById('scale-display');
    const bpmBadge = document.getElementById('bpm-display');
    const moodPills = document.querySelectorAll('.mood-pill');
    const recordBtn = document.getElementById('record-btn');
    const recordIndicator = document.getElementById('record-indicator');
    const recordText = document.getElementById('record-text');
    const randomizeBtn = document.getElementById('randomize-btn');

    // Glass Sliders
    const sliders = {
        warmth: document.getElementById('slider-warmth'),
        tapeFlutter: document.getElementById('slider-flutter'),
        vinylAmount: document.getElementById('slider-vinyl'),
        rainAmount: document.getElementById('slider-rain'),
        space: document.getElementById('slider-space'),
        masterVolume: document.getElementById('slider-volume')
    };

    // Update Slider Value Readouts
    const bindSlider = (key, sliderEl, formatter = v => v) => {
        if (!sliderEl) return;
        const valEl = document.getElementById(`val-${key}`);
        sliderEl.addEventListener('input', (e) => {
            const val = e.target.value;
            audioEngine.updateParam(key, val);
            if (valEl) valEl.textContent = formatter(val);
        });
    };

    bindSlider('warmth', sliders.warmth, v => `${Math.round(v)} Hz`);
    bindSlider('tapeFlutter', sliders.tapeFlutter, v => `${Math.round(v * 100)}%`);
    bindSlider('vinylAmount', sliders.vinylAmount, v => `${Math.round(v * 100)}%`);
    bindSlider('rainAmount', sliders.rainAmount, v => `${Math.round(v * 100)}%`);
    bindSlider('space', sliders.space, v => `${Math.round(v * 100)}%`);
    bindSlider('masterVolume', sliders.masterVolume, v => `${Math.round(v * 100)}%`);

    // Chord Change Callback
    audioEngine.onChordChange = (data) => {
        if (chordBadge) {
            chordBadge.classList.add('pulse');
            chordBadge.textContent = data.name;
            setTimeout(() => chordBadge.classList.remove('pulse'), 450);
        }
        if (scaleBadge && data.scale) {
            scaleBadge.textContent = data.scale;
        }
        if (bpmBadge && data.bpm) {
            bpmBadge.textContent = `${data.bpm} BPM`;
        }
    };

    // Play / Pause Toggle
    playBtn.addEventListener('click', async () => {
        if (!audioEngine.isPlaying) {
            await audioEngine.start();
            playBtn.classList.add('playing');
            playBtnText.textContent = 'PAUSE DRIFT';
            playIcon.innerHTML = `<rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"></rect><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"></rect>`;
        } else {
            audioEngine.stop();
            playBtn.classList.remove('playing');
            playBtnText.textContent = 'BEGIN DRIFT';
            playIcon.innerHTML = `<polygon points="7,5 19,12 7,19" fill="currentColor"></polygon>`;
        }
    });

    // Mood Selection
    moodPills.forEach(pill => {
        pill.addEventListener('click', () => {
            moodPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const mood = pill.dataset.mood;
            audioEngine.setMood(mood);
        });
    });

    // Recording Session
    recordBtn.addEventListener('click', async () => {
        if (!audioEngine.isPlaying) {
            alert('Please start playback first to record your generative session.');
            return;
        }

        if (!audioEngine.isRecording) {
            audioEngine.startRecording();
            recordBtn.classList.add('recording');
            recordIndicator.classList.add('active');
            recordText.textContent = 'STOP & DOWNLOAD';
        } else {
            recordText.textContent = 'SAVING AUDIO...';
            await audioEngine.stopRecording();
            recordBtn.classList.remove('recording');
            recordIndicator.classList.remove('active');
            recordText.textContent = 'RECORD SESSION';
        }
    });

    // Randomize Presets / Seed
    if (randomizeBtn) {
        randomizeBtn.addEventListener('click', () => {
            const moods = ['midnight', 'rainy', 'ethereal', 'solar'];
            const randomMood = moods[Math.floor(Math.random() * moods.length)];
            
            moodPills.forEach(p => {
                p.classList.toggle('active', p.dataset.mood === randomMood);
            });
            audioEngine.setMood(randomMood);

            // Slightly randomize sliders for unpredictable unique ambient textures
            const randWarmth = 800 + Math.random() * 1100;
            const randFlutter = 0.2 + Math.random() * 0.45;
            const randVinyl = 0.05 + Math.random() * 0.15;
            const randRain = 0.04 + Math.random() * 0.12;

            sliders.warmth.value = randWarmth;
            sliders.tapeFlutter.value = randFlutter;
            sliders.vinylAmount.value = randVinyl;
            sliders.rainAmount.value = randRain;

            audioEngine.updateParam('warmth', randWarmth);
            audioEngine.updateParam('tapeFlutter', randFlutter);
            audioEngine.updateParam('vinylAmount', randVinyl);
            audioEngine.updateParam('rainAmount', randRain);

            document.getElementById('val-warmth').textContent = `${Math.round(randWarmth)} Hz`;
            document.getElementById('val-flutter').textContent = `${Math.round(randFlutter * 100)}%`;
            document.getElementById('val-vinyl').textContent = `${Math.round(randVinyl * 100)}%`;
            document.getElementById('val-rain').textContent = `${Math.round(randRain * 100)}%`;
        });
    }
});
