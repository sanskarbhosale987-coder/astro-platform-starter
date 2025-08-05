import { VoiceSynthesisRequest, Character, EmotionType, EmotionLevel, VoiceStyle, APIResponse, AudioConfig } from '../types';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export class VoiceSynthesisService {
  private openaiApiKey: string;
  private elevenlabsApiKey: string;
  private voiceProfiles: Map<string, VoiceProfile>;
  private audioConfig: AudioConfig;

  constructor(openaiApiKey: string, elevenlabsApiKey: string) {
    this.openaiApiKey = openaiApiKey;
    this.elevenlabsApiKey = elevenlabsApiKey;
    this.voiceProfiles = new Map();
    this.audioConfig = {
      sampleRate: 44100,
      bitRate: 128000,
      channels: 2,
      format: 'wav'
    };
    this.initializeVoiceProfiles();
  }

  /**
   * Initialize default voice profiles for different character types
   */
  private initializeVoiceProfiles(): void {
    const profiles: VoiceProfile[] = [
      // Male voices
      {
        id: 'male_young_energetic',
        name: 'Young Male (Energetic)',
        gender: 'male',
        age: 'teen',
        style: 'energetic',
        pitch: 1.1,
        speed: 1.05,
        emotionalRange: ['excited', 'happy', 'surprised', 'angry'],
        voiceId: 'pNInz6obpgDQGcFmaJgB' // ElevenLabs voice ID
      },
      {
        id: 'male_adult_calm',
        name: 'Adult Male (Calm)',
        gender: 'male',
        age: 'adult',
        style: 'calm',
        pitch: 0.9,
        speed: 0.95,
        emotionalRange: ['neutral', 'sad', 'angry', 'surprised'],
        voiceId: 'EXAVITQu4vr4xnSDxMaL'
      },
      {
        id: 'male_deep_mature',
        name: 'Mature Male (Deep)',
        gender: 'male',
        age: 'adult',
        style: 'deep',
        pitch: 0.8,
        speed: 0.9,
        emotionalRange: ['neutral', 'angry', 'sad'],
        voiceId: '29vD33N1CtxCmqQRPOHJ'
      },
      // Female voices
      {
        id: 'female_young_cute',
        name: 'Young Female (Cute)',
        gender: 'female',
        age: 'teen',
        style: 'cute',
        pitch: 1.2,
        speed: 1.0,
        emotionalRange: ['happy', 'excited', 'surprised', 'scared'],
        voiceId: 'XB0fDUnXU5powFXDhCwa'
      },
      {
        id: 'female_adult_standard',
        name: 'Adult Female (Standard)',
        gender: 'female',
        age: 'adult',
        style: 'standard',
        pitch: 1.0,
        speed: 1.0,
        emotionalRange: ['neutral', 'happy', 'sad', 'angry', 'surprised'],
        voiceId: 'pFGS64oj6vXBUqIQBE7I'
      },
      {
        id: 'female_mature_elegant',
        name: 'Mature Female (Elegant)',
        gender: 'female',
        age: 'adult',
        style: 'mature',
        pitch: 0.95,
        speed: 0.9,
        emotionalRange: ['neutral', 'sad', 'angry'],
        voiceId: 'oWAxZDx7w5VEj9dCyTzz'
      }
    ];

    profiles.forEach(profile => {
      this.voiceProfiles.set(profile.id, profile);
    });
  }

  /**
   * Synthesize voice for a dialogue segment
   */
  async synthesizeVoice(request: VoiceSynthesisRequest): Promise<APIResponse<string>> {
    try {
      // Get voice profile
      const profile = this.voiceProfiles.get(request.voiceId);
      if (!profile) {
        throw new Error(`Voice profile not found: ${request.voiceId}`);
      }

      // Adjust parameters based on emotion and intensity
      const adjustedParams = this.adjustVoiceParameters(profile, request.emotion, request.intensity);
      
      // Generate voice using ElevenLabs API
      const audioPath = await this.generateVoiceElevenLabs(
        request.text,
        profile.voiceId,
        adjustedParams,
        request.emotion
      );

      return {
        success: true,
        data: audioPath,
        message: 'Voice synthesis completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice synthesis failed',
        message: 'Failed to synthesize voice'
      };
    }
  }

  /**
   * Generate voice using ElevenLabs API
   */
  private async generateVoiceElevenLabs(
    text: string,
    voiceId: string,
    params: VoiceParameters,
    emotion: EmotionType
  ): Promise<string> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    // Prepare emotional styling
    const styledText = this.applyEmotionalStyling(text, emotion);
    
    const response = await axios.post(url, {
      text: styledText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: params.stability,
        similarity_boost: params.similarityBoost,
        style: params.style,
        use_speaker_boost: true
      }
    }, {
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.elevenlabsApiKey
      },
      responseType: 'arraybuffer'
    });

    // Save audio file
    const filename = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
    const audioPath = path.join(process.cwd(), 'temp', filename);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(audioPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(audioPath, Buffer.from(response.data));
    
    return audioPath;
  }

  /**
   * Apply emotional styling to text for better voice synthesis
   */
  private applyEmotionalStyling(text: string, emotion: EmotionType): string {
    let styledText = text;

    switch (emotion) {
      case 'excited':
        styledText = `*excited* ${text}`;
        break;
      case 'angry':
        styledText = `*angry* ${text}`;
        break;
      case 'sad':
        styledText = `*sad* ${text}`;
        break;
      case 'scared':
        styledText = `*scared* ${text}`;
        break;
      case 'surprised':
        styledText = `*surprised* ${text}`;
        break;
      case 'whispering':
        styledText = `*whisper* ${text}`;
        break;
      case 'shouting':
        styledText = `*shouting* ${text.toUpperCase()}`;
        break;
      case 'crying':
        styledText = `*crying* ${text}`;
        break;
      case 'happy':
        styledText = `*happy* ${text}`;
        break;
      case 'disgusted':
        styledText = `*disgusted* ${text}`;
        break;
      default:
        // Keep original text for neutral emotion
        break;
    }

    return styledText;
  }

  /**
   * Adjust voice parameters based on emotion and intensity
   */
  private adjustVoiceParameters(
    profile: VoiceProfile,
    emotion: EmotionType,
    intensity: EmotionLevel
  ): VoiceParameters {
    const baseParams: VoiceParameters = {
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.5,
      pitch: profile.pitch,
      speed: profile.speed
    };

    // Intensity multiplier
    const intensityMultiplier = this.getIntensityMultiplier(intensity);

    // Adjust based on emotion
    switch (emotion) {
      case 'excited':
        baseParams.stability = Math.max(0.1, 0.3 * intensityMultiplier);
        baseParams.style = Math.min(1.0, 0.8 * intensityMultiplier);
        baseParams.pitch = profile.pitch * (1 + 0.1 * intensityMultiplier);
        baseParams.speed = profile.speed * (1 + 0.05 * intensityMultiplier);
        break;
      
      case 'angry':
        baseParams.stability = Math.max(0.2, 0.4 * intensityMultiplier);
        baseParams.style = Math.min(1.0, 0.9 * intensityMultiplier);
        baseParams.pitch = profile.pitch * (1 - 0.05 * intensityMultiplier);
        baseParams.speed = profile.speed * (1 + 0.1 * intensityMultiplier);
        break;
      
      case 'sad':
        baseParams.stability = Math.min(0.8, 0.6 + 0.2 * intensityMultiplier);
        baseParams.style = Math.max(0.2, 0.4 - 0.1 * intensityMultiplier);
        baseParams.pitch = profile.pitch * (1 - 0.1 * intensityMultiplier);
        baseParams.speed = profile.speed * (1 - 0.1 * intensityMultiplier);
        break;
      
      case 'scared':
        baseParams.stability = Math.max(0.1, 0.2 * intensityMultiplier);
        baseParams.style = Math.min(1.0, 0.7 * intensityMultiplier);
        baseParams.pitch = profile.pitch * (1 + 0.15 * intensityMultiplier);
        baseParams.speed = profile.speed * (1 + 0.15 * intensityMultiplier);
        break;
      
      case 'surprised':
        baseParams.stability = Math.max(0.2, 0.3 * intensityMultiplier);
        baseParams.style = Math.min(1.0, 0.6 * intensityMultiplier);
        baseParams.pitch = profile.pitch * (1 + 0.2 * intensityMultiplier);
        break;
      
      case 'whispering':
        baseParams.stability = Math.min(0.9, 0.7 + 0.2 * intensityMultiplier);
        baseParams.style = Math.max(0.1, 0.3 - 0.1 * intensityMultiplier);
        baseParams.speed = profile.speed * (1 - 0.2 * intensityMultiplier);
        break;
      
      case 'shouting':
        baseParams.stability = Math.max(0.1, 0.2 * intensityMultiplier);
        baseParams.style = Math.min(1.0, 0.9 * intensityMultiplier);
        baseParams.pitch = profile.pitch * (1 - 0.05 * intensityMultiplier);
        baseParams.speed = profile.speed * (1 + 0.2 * intensityMultiplier);
        break;
      
      default:
        // Keep base parameters for neutral
        break;
    }

    return baseParams;
  }

  /**
   * Get intensity multiplier based on emotion level
   */
  private getIntensityMultiplier(intensity: EmotionLevel): number {
    switch (intensity) {
      case 'low': return 0.5;
      case 'medium': return 1.0;
      case 'high': return 1.5;
      case 'ultra': return 2.0;
      default: return 1.0;
    }
  }

  /**
   * Create custom voice profile from audio samples
   */
  async createCustomVoice(
    name: string,
    audioSamples: string[],
    character: Character
  ): Promise<APIResponse<string>> {
    try {
      // Upload samples to ElevenLabs for voice cloning
      const voiceId = await this.cloneVoiceElevenLabs(name, audioSamples);
      
      // Create custom voice profile
      const customProfile: VoiceProfile = {
        id: `custom_${Date.now()}`,
        name: name,
        gender: character.gender,
        age: character.age,
        style: 'custom',
        pitch: 1.0,
        speed: 1.0,
        emotionalRange: ['neutral', 'happy', 'sad', 'angry', 'surprised'],
        voiceId: voiceId
      };

      this.voiceProfiles.set(customProfile.id, customProfile);

      return {
        success: true,
        data: customProfile.id,
        message: 'Custom voice created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Custom voice creation failed',
        message: 'Failed to create custom voice'
      };
    }
  }

  /**
   * Clone voice using ElevenLabs API
   */
  private async cloneVoiceElevenLabs(name: string, audioSamples: string[]): Promise<string> {
    const formData = new FormData();
    formData.append('name', name);
    
    // Add audio samples
    audioSamples.forEach((samplePath, index) => {
      const audioBuffer = fs.readFileSync(samplePath);
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('files', blob, `sample_${index}.wav`);
    });

    const response = await axios.post('https://api.elevenlabs.io/v1/voices/add', formData, {
      headers: {
        'xi-api-key': this.elevenlabsApiKey,
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data.voice_id;
  }

  /**
   * Get available voice profiles
   */
  getVoiceProfiles(): VoiceProfile[] {
    return Array.from(this.voiceProfiles.values());
  }

  /**
   * Get voice profiles filtered by criteria
   */
  getFilteredVoiceProfiles(
    gender?: 'male' | 'female' | 'other',
    age?: 'child' | 'teen' | 'adult' | 'elderly',
    style?: VoiceStyle
  ): VoiceProfile[] {
    return Array.from(this.voiceProfiles.values()).filter(profile => {
      if (gender && profile.gender !== gender) return false;
      if (age && profile.age !== age) return false;
      if (style && profile.style !== style) return false;
      return true;
    });
  }

  /**
   * Batch synthesize multiple voice segments
   */
  async batchSynthesize(requests: VoiceSynthesisRequest[]): Promise<APIResponse<string[]>> {
    try {
      const results = await Promise.allSettled(
        requests.map(request => this.synthesizeVoice(request))
      );

      const audioPaths: string[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          audioPaths.push(result.value.data!);
        } else {
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          errors.push(`Request ${index}: ${error}`);
        }
      });

      return {
        success: errors.length === 0,
        data: audioPaths,
        message: errors.length > 0 ? `${errors.length} synthesis requests failed` : 'All synthesis completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch synthesis failed',
        message: 'Failed to process batch synthesis'
      };
    }
  }

  /**
   * Test voice with sample text
   */
  async testVoice(voiceId: string, sampleText: string = "Hello, this is a voice test."): Promise<APIResponse<string>> {
    const testRequest: VoiceSynthesisRequest = {
      text: sampleText,
      voiceId: voiceId,
      emotion: 'neutral',
      intensity: 'medium',
      speed: 1.0,
      pitch: 1.0
    };

    return this.synthesizeVoice(testRequest);
  }
}

// Supporting interfaces
interface VoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  age: 'child' | 'teen' | 'adult' | 'elderly';
  style: VoiceStyle;
  pitch: number;
  speed: number;
  emotionalRange: EmotionType[];
  voiceId: string; // ElevenLabs voice ID
}

interface VoiceParameters {
  stability: number;
  similarityBoost: number;
  style: number;
  pitch: number;
  speed: number;
}