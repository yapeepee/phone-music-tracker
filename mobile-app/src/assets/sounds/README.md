# Sound Assets for Metronome

This directory is for metronome sound files.

## Required Files:
- `click.mp3` or `click.wav` - Regular beat sound
- `accent.mp3` or `accent.wav` - Accent beat sound

## Recommended Specifications:
- Duration: 30-50ms
- Format: MP3 or WAV
- Sample Rate: 44.1kHz
- Bit Depth: 16-bit
- Channels: Mono

## Sources:
1. Generate using audio software (Audacity, Logic Pro, etc.)
2. Download from free sound libraries
3. Record actual metronome clicks

## Implementation:
Once files are added, update metronome.service.ts:
```typescript
const clickSound = await Audio.Sound.createAsync(
  require('../assets/sounds/click.mp3')
);
```