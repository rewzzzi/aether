#!/usr/bin/env python3
"""
AETHER CLI — Procedural Lo-Fi Generator
Usage:
    python cli.py --mood midnight --duration 45 --output chill.wav
"""

import argparse
import sys
import time
from generator import LoFiSynthesizer, MOODS

def print_banner():
    banner = r"""
    ___   ______ _____ _   _ ___________ 
   / _ \  | ___ \_   _| | | |  ___| ___ \
  / /_\ \ | |_/ / | | | |_| | |__ | |_/ /
  |  _  | |  __/  | | |  _  |  __||    / 
  | | | | | |     | | | | | | |___| |\ \ 
  \_| |_/ \_|     \_/ \_| |_/\____/\_| \_|
    PROCEDURAL LO-FI & AMBIENT DSP ENGINE
    """
    print(banner)

def main():
    print_banner()
    parser = argparse.ArgumentParser(description="Generate procedural lo-fi ambient audio files.")
    parser.add_argument("--mood", choices=list(MOODS.keys()), default="midnight",
                        help="Atmospheric mood preset (midnight, rainy, ethereal)")
    parser.add_argument("--duration", type=int, default=30,
                        help="Track duration in seconds (default: 30)")
    parser.add_argument("--output", type=str, default="aether_drift.wav",
                        help="Output WAV file path (default: aether_drift.wav)")

    args = parser.parse_args()

    mood_meta = MOODS[args.mood]
    print(f"[*] Mood Selected:   {mood_meta['name']} ({mood_meta['bpm']} BPM)")
    print(f"[*] Duration:        {args.duration} seconds")
    print(f"[*] Output Target:   {args.output}")
    print("[*] Synthesizing acoustic textures (Rhodes, Sub-Bass, Tape Wobble, Vinyl)...")

    start_time = time.time()
    synth = LoFiSynthesizer()

    left, right = synth.render_track(mood_key=args.mood, total_seconds=args.duration)
    render_time = time.time() - start_time
    print(f"[+] Audio synthesis complete in {render_time:.2f}s!")

    print(f"[*] Encoding to 16-bit 44.1kHz Stereo WAV: {args.output}...")
    synth.export_wav(args.output, left, right)
    print(f"[✔] Successfully exported: {args.output}")
    print("\nTip: Host the 'index.html' folder on GitHub Pages for the full Liquid Glass interactive visualizer!")

if __name__ == "__main__":
    main()
