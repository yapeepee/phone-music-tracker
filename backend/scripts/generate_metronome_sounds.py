#!/usr/bin/env python3
"""
Generate metronome click sounds for the music tracker app
Creates two sound files:
- click.mp3: Regular beat click
- accent.mp3: Accent beat click (louder, higher pitch)
"""

import numpy as np
import wave
import struct
import os

def generate_click_sound(
    frequency=800,
    duration=0.05,
    sample_rate=44100,
    amplitude=0.8,
    envelope_attack=0.005,
    envelope_decay=0.045
):
    """
    Generate a simple click sound using a sine wave with envelope
    
    Args:
        frequency: Frequency of the click in Hz
        duration: Total duration in seconds
        sample_rate: Sample rate in Hz
        amplitude: Volume (0-1)
        envelope_attack: Attack time in seconds
        envelope_decay: Decay time in seconds
    
    Returns:
        numpy array of audio samples
    """
    # Generate time array
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Generate sine wave
    sine_wave = amplitude * np.sin(2 * np.pi * frequency * t)
    
    # Create envelope
    envelope = np.ones_like(t)
    attack_samples = int(envelope_attack * sample_rate)
    decay_samples = int(envelope_decay * sample_rate)
    
    # Attack phase
    envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
    
    # Decay phase
    decay_start = len(t) - decay_samples
    envelope[decay_start:] = np.linspace(1, 0, decay_samples)
    
    # Apply envelope
    click = sine_wave * envelope
    
    # Add a tiny bit of noise for more natural sound
    noise = np.random.normal(0, 0.01, len(click))
    click += noise
    
    # Normalize to prevent clipping
    click = np.clip(click, -1, 1)
    
    return click

def save_wav(filename, audio_data, sample_rate=44100):
    """Save audio data as WAV file"""
    # Convert to 16-bit PCM
    audio_16bit = (audio_data * 32767).astype(np.int16)
    
    # Create WAV file
    with wave.open(filename, 'w') as wav_file:
        # Set parameters
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)   # 16-bit
        wav_file.setframerate(sample_rate)
        
        # Write data
        wav_file.writeframes(audio_16bit.tobytes())

def main():
    # Output directory - use /tmp first
    temp_dir = "/tmp/metronome_sounds"
    os.makedirs(temp_dir, exist_ok=True)
    
    print("Generating metronome sounds...")
    
    # Generate regular click
    print("- Generating regular click...")
    regular_click = generate_click_sound(
        frequency=800,
        duration=0.04,
        amplitude=0.6,
        envelope_attack=0.003,
        envelope_decay=0.037
    )
    save_wav(os.path.join(temp_dir, "click.wav"), regular_click)
    
    # Generate accent click
    print("- Generating accent click...")
    accent_click = generate_click_sound(
        frequency=1000,
        duration=0.05,
        amplitude=0.8,
        envelope_attack=0.005,
        envelope_decay=0.045
    )
    save_wav(os.path.join(temp_dir, "accent.wav"), accent_click)
    
    print("\nMetronome sounds generated successfully!")
    print(f"Files saved to: {temp_dir}")
    print("\nNote: These are WAV files. You may need to convert them to MP3")
    print("using ffmpeg or another audio converter if required.")
    
    # Check if we can convert to MP3 using ffmpeg
    try:
        import subprocess
        result = subprocess.run(['which', 'ffmpeg'], capture_output=True, text=True)
        if result.returncode == 0:
            print("\nffmpeg found! Converting to MP3...")
            
            # Convert regular click
            subprocess.run([
                'ffmpeg', '-i', 
                os.path.join(temp_dir, 'click.wav'),
                '-acodec', 'mp3',
                '-ab', '128k',
                os.path.join(temp_dir, 'click.mp3'),
                '-y'
            ], capture_output=True)
            
            # Convert accent click
            subprocess.run([
                'ffmpeg', '-i',
                os.path.join(temp_dir, 'accent.wav'),
                '-acodec', 'mp3',
                '-ab', '128k',
                os.path.join(temp_dir, 'accent.mp3'),
                '-y'
            ], capture_output=True)
            
            print("MP3 conversion complete!")
            print(f"\nYou can find the files in: {temp_dir}")
            print("Copy them to: mobile-app/src/assets/sounds/")
            
            # Remove WAV files
            os.remove(os.path.join(temp_dir, 'click.wav'))
            os.remove(os.path.join(temp_dir, 'accent.wav'))
            
    except Exception as e:
        print(f"\nCould not convert to MP3: {e}")
        print("You'll need to convert the WAV files manually.")

if __name__ == "__main__":
    main()