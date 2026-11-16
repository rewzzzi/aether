"""
Unit tests for AETHER DSP Generator
"""

import os
import sys
import wave
import unittest
import numpy as np

# Ensure the module directory is in sys.path regardless of execution root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from generator import LoFiSynthesizer, MOODS, SAMPLE_RATE

class TestLoFiGenerator(unittest.TestCase):
    def setUp(self):
        self.synth = LoFiSynthesizer(sample_rate=SAMPLE_RATE)
        self.test_output = "temp_test_audio.wav"

    def tearDown(self):
        if os.path.exists(self.test_output):
            os.remove(self.test_output)

    def test_rhodes_synthesis(self):
        duration = 1.0
        note = self.synth.generate_rhodes_note(freq=440.0, duration=duration)
        self.assertEqual(len(note), int(SAMPLE_RATE * duration))
        self.assertGreater(np.max(np.abs(note)), 0.05)
        self.assertLessEqual(np.max(np.abs(note)), 1.0)

    def test_sub_bass_synthesis(self):
        duration = 0.5
        bass = self.synth.generate_sub_bass(freq=65.0, duration=duration)
        self.assertEqual(len(bass), int(SAMPLE_RATE * duration))
        self.assertGreater(np.max(np.abs(bass)), 0.05)

    def test_vinyl_noise_generation(self):
        duration = 0.5
        vinyl = self.synth.generate_vinyl_noise(duration=duration, amount=0.2)
        self.assertEqual(len(vinyl), int(SAMPLE_RATE * duration))
        self.assertGreater(np.std(vinyl), 0.001)

    def test_full_track_render_and_export(self):
        duration = 2.0
        left, right = self.synth.render_track(mood_key="midnight", total_seconds=duration)
        self.assertEqual(len(left), int(SAMPLE_RATE * duration))
        self.assertEqual(len(right), int(SAMPLE_RATE * duration))

        self.synth.export_wav(self.test_output, left, right)

        self.assertTrue(os.path.exists(self.test_output))
        with wave.open(self.test_output, 'rb') as wav_file:
            self.assertEqual(wav_file.getnchannels(), 2)
            self.assertEqual(wav_file.getsampwidth(), 2)  # 16-bit
            self.assertEqual(wav_file.getframerate(), SAMPLE_RATE)
            self.assertEqual(wav_file.getnframes(), int(SAMPLE_RATE * duration))

if __name__ == "__main__":
    unittest.main()
