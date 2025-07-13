import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

export interface MetronomeOptions {
  bpm: number;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
  accentBeats?: number; // Accent every N beats
}

export type BeatCallback = (beatNumber: number, isAccent: boolean) => void;

class MetronomeService {
  private intervalId: NodeJS.Timeout | null = null;
  private nextBeatTime: number = 0;
  private beatNumber: number = 0;
  private currentMeasure: number = 1;
  private isPlaying: boolean = false;
  private options: MetronomeOptions = {
    bpm: 120,
    soundEnabled: true,
    hapticEnabled: true,
    accentBeats: 4,
  };
  private beatCallbacks: BeatCallback[] = [];
  private audioInitialized: boolean = false;
  private audioContext: any = null;
  private clickSound: Audio.Sound | null = null;
  private accentSound: Audio.Sound | null = null;

  /**
   * Initialize audio for metronome
   */
  private async initializeAudio() {
    if (this.audioInitialized) return;
    
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });
      
      // Load sound files
      console.log('Loading metronome sounds...');
      const { sound: clickSound } = await Audio.Sound.createAsync(
        require('../assets/sounds/click.mp3'),
        { shouldPlay: false }
      );
      this.clickSound = clickSound;
      
      const { sound: accentSound } = await Audio.Sound.createAsync(
        require('../assets/sounds/accent.mp3'),
        { shouldPlay: false }
      );
      this.accentSound = accentSound;
      
      this.audioInitialized = true;
      console.log('Metronome audio initialized successfully with sound files');
    } catch (error) {
      console.log('Failed to initialize audio:', error);
      this.audioInitialized = false;
    }
  }

  /**
   * Start the metronome with the given options
   */
  async start(options: Partial<MetronomeOptions> = {}) {
    this.stop(); // Stop any existing metronome

    this.options = { ...this.options, ...options };
    this.isPlaying = true;
    this.beatNumber = 0;
    this.currentMeasure = 1;
    this.nextBeatTime = Date.now();

    // Initialize audio if needed
    if (this.options.soundEnabled && !this.audioInitialized) {
      await this.initializeAudio();
    }

    this.scheduleNextBeat();
  }

  /**
   * Stop the metronome
   */
  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    // Stop any playing sounds
    this.stopSounds();
  }

  /**
   * Stop any currently playing sounds
   */
  private async stopSounds() {
    try {
      if (this.clickSound) {
        await this.clickSound.stopAsync();
      }
      if (this.accentSound) {
        await this.accentSound.stopAsync();
      }
    } catch (error) {
      // Ignore errors when stopping sounds
    }
  }

  /**
   * Cleanup audio resources
   */
  async cleanup() {
    this.stop();
    try {
      if (this.clickSound) {
        await this.clickSound.unloadAsync();
        this.clickSound = null;
      }
      if (this.accentSound) {
        await this.accentSound.unloadAsync();
        this.accentSound = null;
      }
      this.audioInitialized = false;
    } catch (error) {
      console.log('Error cleaning up audio:', error);
    }
  }

  /**
   * Update metronome settings while playing
   */
  updateOptions(options: Partial<MetronomeOptions>) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current BPM
   */
  getBPM(): number {
    return this.options.bpm;
  }

  /**
   * Check if metronome is playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Subscribe to beat events
   */
  onBeat(callback: BeatCallback): () => void {
    this.beatCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.beatCallbacks.indexOf(callback);
      if (index > -1) {
        this.beatCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Schedule the next beat with drift correction
   */
  private scheduleNextBeat() {
    if (!this.isPlaying) return;

    const beatInterval = 60000 / this.options.bpm; // milliseconds per beat
    
    // Calculate next beat time
    this.nextBeatTime += beatInterval;
    
    // Calculate delay until next beat (with drift correction)
    const now = Date.now();
    const delay = Math.max(0, this.nextBeatTime - now);

    this.intervalId = setTimeout(() => {
      this.playBeat();
      this.scheduleNextBeat();
    }, delay);
  }

  /**
   * Play a single beat
   */
  private async playBeat() {
    this.beatNumber++;
    const beatInMeasure = ((this.beatNumber - 1) % this.options.accentBeats) + 1;
    const isAccent = beatInMeasure === 1;
    
    // Update measure count
    if (isAccent && this.beatNumber > 1) {
      this.currentMeasure++;
    }

    // Visual console feedback
    if (isAccent) {
      console.log(`\n=== MEASURE ${this.currentMeasure} ===`);
    }
    console.log(`Beat ${beatInMeasure}/${this.options.accentBeats}: ${isAccent ? '🔔 ACCENT!' : '🥁 tick'}`);

    // Haptic feedback - reduced priority as user doesn't care about vibration
    if (this.options.hapticEnabled) {
      // Using lighter haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Sound playback - create a simple beep
    if (this.options.soundEnabled) {
      this.playClickSound(isAccent);
    }

    // Notify subscribers
    this.beatCallbacks.forEach(callback => {
      callback(this.beatNumber, isAccent);
    });
  }

  /**
   * Play a click sound 
   */
  private async playClickSound(isAccent: boolean) {
    if (!this.audioInitialized || !this.clickSound || !this.accentSound) {
      console.log('Audio not initialized, initializing now...');
      await this.initializeAudio();
    }
    
    try {
      const sound = isAccent ? this.accentSound : this.clickSound;
      if (sound) {
        // Reset to beginning and play
        await sound.setPositionAsync(0);
        await sound.setVolumeAsync(isAccent ? 0.8 : 0.6);
        await sound.playAsync();
      }
    } catch (error) {
      console.log('Audio playback error:', error);
      // Fallback to console logging if audio fails
    }
  }

  /**
   * Calculate tempo difference percentage
   */
  calculateTempoDifference(actual: number, target: number): number {
    return ((actual - target) / target) * 100;
  }

  /**
   * Check if tempo is under target
   */
  isUnderTempo(actual: number, target: number): boolean {
    return actual < target;
  }

  /**
   * Get tempo state for visual representation
   */
  getTempoState(actual: number, target: number): 'happy' | 'neutral' | 'annoyed' | 'angry' {
    const diff = this.calculateTempoDifference(actual, target);
    
    if (diff < 0) return 'happy'; // Under tempo
    if (diff < 5) return 'neutral'; // Within 5%
    if (diff < 10) return 'annoyed'; // 5-10% over
    return 'angry'; // >10% over
  }
}

export const metronomeService = new MetronomeService();