"""
AETHER - Python DSP Audio Synthesis Core
Generates procedural lo-fi ambient tracks (Rhodes FM, Tape Flutter, Vinyl Crackle, Sub-Bass)
and exports to pristine 44.1kHz 16-bit Stereo WAV files.
"""

import math
import struct
import wave
import numpy as np

SAMPLE_RATE = 44100

MOODS = {
    "midnight": {
        "name": "Midnight Velvet",
        "bpm": 68,
        "progressions": [
            {"name": "Dm9", "notes": [146.83, 220.00, 261.63, 329.63, 349.23], "bass": 73.42, "beats": 4},
            {"name": "G13", "notes": [196.00, 246.94, 329.63, 349.23, 440.00], "bass": 98.00, "beats": 4},
            {"name": "Cmaj9", "notes": [130.81, 196.00, 246.94, 293.66, 329.63], "bass": 65.41, "beats": 4},
            {"name": "Am11", "notes": [110.00, 164.81, 261.63, 293.66, 329.63], "bass": 55.00, "beats": 4},
        ],
        "solo_scale": [220.00, 261.63, 293.66, 329.63, 392.00, 440.00]
    },
    "rainy": {
        "name": "Rainy Daydream",
        "bpm": 72,
        "progressions": [
            {"name": "Fmaj9", "notes": [174.61, 261.63, 329.63, 392.00, 440.00], "bass": 87.31, "beats": 4},
            {"name": "Em7", "notes": [164.81, 246.94, 293.66, 392.00], "bass": 82.41, "beats": 4},
            {"name": "Dm9", "notes": [146.83, 220.00, 261.63, 329.63, 349.23], "bass": 73.42, "beats": 4},
            {"name": "Cmaj7(9)", "notes": [130.81, 196.00, 246.94, 293.66, 329.63], "bass": 65.41, "beats": 4},
        ],
        "solo_scale": [174.61, 196.00, 220.00, 261.63, 293.66, 329.63]
    },
    "ethereal": {
        "name": "Ethereal Drift",
        "bpm": 60,
        "progressions": [
            {"name": "Abmaj9", "notes": [207.65, 261.63, 311.13, 392.00, 466.16], "bass": 103.83, "beats": 4},
            {"name": "Bb6/9", "notes": [233.08, 293.66, 349.23, 392.00, 466.16], "bass": 116.54, "beats": 4},
            {"name": "Cm9", "notes": [130.81, 196.00, 233.08, 311.13, 349.23], "bass": 65.41, "beats": 4},
            {"name": "Gm7", "notes": [196.00, 233.08, 293.66, 349.23], "bass": 98.00, "beats": 4},
        ],
        "solo_scale": [207.65, 233.08, 261.63, 311.13, 349.23, 466.16]
    }
}


class LoFiSynthesizer:
    def __init__(self, sample_rate=SAMPLE_RATE):
        self.sample_rate = sample_rate

    def generate_rhodes_note(self, freq, duration, velocity=0.7, flutter_depth=0.0035):
        """
        Synthesizes an electric piano / Rhodes note with FM overtone and tape wow/flutter.
        """
        num_samples = int(self.sample_rate * duration)
        t = np.linspace(0, duration, num_samples, endpoint=False)

        # Tape flutter: subtle low-frequency pitch drift (~0.85 Hz)
        flutter_lfo = np.sin(2 * np.pi * 0.85 * t) * (freq * flutter_depth)
        instantaneous_freq = freq + flutter_lfo
        phase = 2 * np.pi * np.cumsum(instantaneous_freq) / self.sample_rate

        # Fundamental + harmonic overtones
        carrier = np.sin(phase)

        # FM Modulator for bell chime attack (3x harmonic ratio, decays in ~0.35s)
        mod_env = np.exp(-t * 9.0)
        modulator = np.sin(2 * np.pi * (freq * 3.01) * t) * (freq * 0.85 * velocity * mod_env)
        carrier_with_fm = np.sin(phase + (modulator / freq))

        # 2nd harmonic (adds warmth)
        harmonic_2 = np.sin(2 * phase) * 0.25 * np.exp(-t * 1.5)

        # Note Envelope (ADSR)
        attack_samples = int(0.018 * self.sample_rate)
        attack = np.linspace(0.001, 1.0, attack_samples)
        decay = np.exp(-t[attack_samples:] * 1.25)
        envelope = np.concatenate([attack, decay])
        if len(envelope) > num_samples:
            envelope = envelope[:num_samples]
        elif len(envelope) < num_samples:
            envelope = np.pad(envelope, (0, num_samples - len(envelope)))

        signal = (carrier_with_fm * 0.75 + harmonic_2) * envelope * velocity * 0.28
        return signal

    def generate_sub_bass(self, freq, duration):
        """
        Synthesizes deep analog sub-bass (triangle-ish saturation).
        """
        num_samples = int(self.sample_rate * duration)
        t = np.linspace(0, duration, num_samples, endpoint=False)
        phase = 2 * np.pi * freq * t

        # Fundamental sine + tiny 2nd harmonic
        signal = np.sin(phase) + 0.15 * np.sin(2 * phase)

        # Soft envelope
        attack_len = int(0.04 * self.sample_rate)
        attack = np.linspace(0.001, 1.0, attack_len)
        decay = np.exp(-t[attack_len:] * 0.9)
        env = np.concatenate([attack, decay])[:num_samples]

        return signal * env * 0.35

    def generate_vinyl_noise(self, duration, amount=0.05):
        """
        Generates a warm, filtered analog pink noise texture with very rare, gentle pops.
        """
        num_samples = int(self.sample_rate * duration)
        # Pink noise via 1/f filter approximation
        white = np.random.randn(num_samples)
        # Lowpass filter approximation for muffled dust
        b0, b1, b2 = 0.0, 0.0, 0.0
        pink = np.zeros(num_samples)
        for i in range(num_samples):
            w = white[i]
            b0 = 0.997 * b0 + w * 0.05
            b1 = 0.985 * b1 + w * 0.08
            b2 = 0.950 * b2 + w * 0.14
            pink[i] = (b0 + b1 + b2) * 0.03

        # Rare, soft clicks (e.g. 1 pop every 2-3 seconds instead of 25/sec)
        click_mask = np.random.rand(num_samples) < 0.000018
        clicks = np.random.uniform(-0.15, 0.15, num_samples) * click_mask

        # Apply simple convolution smoothing to eliminate sharp digital Dirac clicks
        smooth_kernel = np.array([0.2, 0.6, 1.0, 0.6, 0.2]) / 2.6
        smoothed_clicks = np.convolve(clicks, smooth_kernel, mode='same')

        return (pink + smoothed_clicks) * amount

    def render_track(self, mood_key="midnight", total_seconds=30):
        """
        Renders a full multi-track stereo lo-fi session.
        """
        mood = MOODS.get(mood_key, MOODS["midnight"])
        bpm = mood["bpm"]
        beat_seconds = 60.0 / bpm
        progression = mood["progressions"]

        total_samples = int(self.sample_rate * total_seconds)
        left_channel = np.zeros(total_samples, dtype=np.float32)
        right_channel = np.zeros(total_samples, dtype=np.float32)

        current_sample = 0
        chord_idx = 0

        while current_sample < total_samples:
            chord = progression[chord_idx % len(progression)]
            chord_duration = chord["beats"] * beat_seconds
            chord_samples = int(self.sample_rate * chord_duration)

            # Synthesize chord notes with strumming micro-delays
            for note_idx, freq in enumerate(chord["notes"]):
                strum_delay_samples = int((note_idx * 0.03 + np.random.uniform(0, 0.015)) * self.sample_rate)
                note_wave = self.generate_rhodes_note(freq, chord_duration * 1.1)

                start_idx = current_sample + strum_delay_samples
                end_idx = min(start_idx + len(note_wave), total_samples)
                note_slice = note_wave[:end_idx - start_idx]

                if start_idx < total_samples:
                    # Slight stereo panning across keys
                    pan = (note_idx / (len(chord["notes"]) - 1)) - 0.5  # -0.5 to +0.5
                    left_gain = math.cos((pan + 1) * math.pi / 4)
                    right_gain = math.sin((pan + 1) * math.pi / 4)

                    left_channel[start_idx:end_idx] += note_slice * left_gain
                    right_channel[start_idx:end_idx] += note_slice * right_gain

            # Synthesize Bass
            if "bass" in chord:
                bass_wave = self.generate_sub_bass(chord["bass"], chord_duration * 0.95)
                start_idx = current_sample
                end_idx = min(start_idx + len(bass_wave), total_samples)
                bass_slice = bass_wave[:end_idx - start_idx]

                left_channel[start_idx:end_idx] += bass_slice * 0.8
                right_channel[start_idx:end_idx] += bass_slice * 0.8

            current_sample += chord_samples
            chord_idx += 1

        # Add vinyl crackle & dust ambience
        vinyl = self.generate_vinyl_noise(total_seconds, amount=0.15)
        left_channel += vinyl
        right_channel += vinyl

        # Simple soft-clipping / limiting
        left_channel = np.tanh(left_channel * 0.9)
        right_channel = np.tanh(right_channel * 0.9)

        return left_channel, right_channel

    def export_wav(self, filename, left_channel, right_channel):
        """
        Exports stereo float arrays to a 16-bit PCM WAV file.
        """
        # Convert float (-1.0 to 1.0) to 16-bit int (-32768 to 32767)
        left_int = np.int16(left_channel * 32767)
        right_int = np.int16(right_channel * 32767)

        # Interleave stereo channels
        stereo = np.empty((len(left_int) * 2,), dtype=np.int16)
        stereo[0::2] = left_int
        stereo[1::2] = right_int

        with wave.open(filename, 'wb') as wav_file:
            wav_file.setnchannels(2)        # Stereo
            wav_file.setsampwidth(2)        # 2 bytes = 16-bit
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(stereo.tobytes())
