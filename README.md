# Aether

A procedural lo-fi & ambient sound synthesizer built with the Web Audio API and Python.

Everything is synthesized in real time using mathematical oscillators, FM synthesis, and noise generators — zero pre-recorded audio files or sample loops.

[**Live Demo**](https://rewzzzi.github.io/aether/)

---

## Features

- **Pure code synthesis:** Rhodes-style electric piano via FM synthesis, analog tape flutter via LFO, procedural vinyl dust and rainfall ambiance.
- **Audio-reactive visualizer:** Real-time fluid canvas responding dynamically to bass and chord frequencies.
- **Interactive sound controls:** Live adjustment of tape flutter, warmth filter, vinyl crackle, room space, and master volume.
- **In-browser recording:** Record live generative sessions directly to audio files.
- **Python CLI engine:** Standalone DSP script to render uncompressed 16-bit 44.1kHz stereo WAV tracks from the terminal.

---

## Quick Start

### Web
Open `index.html` in any browser, or check out the [Live Demo](https://rewzzzi.github.io/aether/).

### Python CLI
Requires Python 3.10+ and `numpy`.

```bash
cd python
pip install -r requirements.txt

# Render a 60-second lo-fi track
python cli.py --mood midnight --duration 60 --output session.wav
```

Available CLI flags:
- `--mood`: `midnight` (default), `rainy`, `ethereal`
- `--duration`: Track length in seconds (default: 30)
- `--output`: Output `.wav` file path

### Tests
```bash
python -m unittest python/test_generator.py
```

---

## How It Works

- **Rhodes Chords:** Dual sine oscillators with a decaying FM modulator ratio (`3.01x`) to emulate vintage electric piano tines.
- **Tape Wobble:** Low-frequency oscillator (~0.8Hz) slightly modulating pitch to recreate analog tape drift.
- **Vinyl Dust:** Filtered pink noise with sparse, smoothed micro-impulses to avoid harsh digital clicks.
- **Sub-Bass:** Triangle-derived low-end following chord roots through a lowpass filter.

---

## Tech Stack

- **Audio & Visuals:** Web Audio API, HTML5 Canvas, Vanilla JavaScript
- **DSP & CLI:** Python 3, NumPy
- **CI/CD:** GitHub Actions

---

## License

MIT
