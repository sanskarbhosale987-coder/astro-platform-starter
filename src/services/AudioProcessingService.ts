import { AudioConfig, APIResponse, QualityPreset } from '../types';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

export class AudioProcessingService {
  private audioConfig: AudioConfig;
  private tempDir: string;

  constructor() {
    this.audioConfig = {
      sampleRate: 44100,
      bitRate: 128000,
      channels: 2,
      format: 'wav'
    };
    this.tempDir = path.join(process.cwd(), 'temp', 'audio');
    this.ensureTempDirectory();
  }

  /**
   * Ensure temporary directory exists
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Extract audio from video file
   */
  async extractAudioFromVideo(videoPath: string): Promise<APIResponse<string>> {
    try {
      const outputPath = path.join(this.tempDir, `extracted_${Date.now()}.wav`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .audioCodec('pcm_s16le')
          .audioFrequency(this.audioConfig.sampleRate)
          .audioChannels(this.audioConfig.channels)
          .format('wav')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        success: true,
        data: outputPath,
        message: 'Audio extracted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio extraction failed',
        message: 'Failed to extract audio from video'
      };
    }
  }

  /**
   * Apply noise reduction to audio
   */
  async applyNoiseReduction(
    audioPath: string,
    intensity: 'light' | 'medium' | 'heavy' = 'medium'
  ): Promise<APIResponse<string>> {
    try {
      const outputPath = path.join(this.tempDir, `denoised_${Date.now()}.wav`);
      
      // Noise reduction parameters based on intensity
      const noiseParams = this.getNoiseReductionParams(intensity);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(audioPath)
          .audioFilters([
            `afftdn=nr=${noiseParams.noiseReduction}:nf=${noiseParams.noiseFloor}:tn=1`,
            `highpass=f=${noiseParams.highpassFreq}`,
            `lowpass=f=${noiseParams.lowpassFreq}`,
            `dynaudnorm=p=${noiseParams.normalizationPeak}:m=${noiseParams.maxGain}`
          ])
          .audioCodec('pcm_s16le')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        success: true,
        data: outputPath,
        message: 'Noise reduction applied successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Noise reduction failed',
        message: 'Failed to apply noise reduction'
      };
    }
  }

  /**
   * Get noise reduction parameters based on intensity
   */
  private getNoiseReductionParams(intensity: 'light' | 'medium' | 'heavy') {
    const params = {
      light: {
        noiseReduction: 10,
        noiseFloor: -50,
        highpassFreq: 80,
        lowpassFreq: 15000,
        normalizationPeak: 0.9,
        maxGain: 10
      },
      medium: {
        noiseReduction: 20,
        noiseFloor: -40,
        highpassFreq: 100,
        lowpassFreq: 12000,
        normalizationPeak: 0.85,
        maxGain: 15
      },
      heavy: {
        noiseReduction: 30,
        noiseFloor: -30,
        highpassFreq: 120,
        lowpassFreq: 10000,
        normalizationPeak: 0.8,
        maxGain: 20
      }
    };

    return params[intensity];
  }

  /**
   * Normalize audio levels
   */
  async normalizeAudio(
    audioPath: string,
    targetLUFS: number = -16
  ): Promise<APIResponse<string>> {
    try {
      const outputPath = path.join(this.tempDir, `normalized_${Date.now()}.wav`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(audioPath)
          .audioFilters([
            `loudnorm=I=${targetLUFS}:TP=-1.5:LRA=11:linear=true`,
            'dynaudnorm=p=0.9:m=15:s=5'
          ])
          .audioCodec('pcm_s16le')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        success: true,
        data: outputPath,
        message: 'Audio normalized successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio normalization failed',
        message: 'Failed to normalize audio'
      };
    }
  }

  /**
   * Mix multiple audio tracks
   */
  async mixAudioTracks(
    tracks: AudioTrack[],
    outputPath?: string
  ): Promise<APIResponse<string>> {
    try {
      const finalOutputPath = outputPath || path.join(this.tempDir, `mixed_${Date.now()}.wav`);
      
      // Build FFmpeg command for mixing
      const command = ffmpeg();
      
      // Add all input tracks
      tracks.forEach(track => {
        command.input(track.path);
      });

      // Build filter complex for mixing
      const filterComplex = this.buildMixingFilter(tracks);
      
      await new Promise<void>((resolve, reject) => {
        command
          .complexFilter(filterComplex, 'mixed')
          .map('mixed')
          .audioCodec('pcm_s16le')
          .audioFrequency(this.audioConfig.sampleRate)
          .audioChannels(this.audioConfig.channels)
          .output(finalOutputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        success: true,
        data: finalOutputPath,
        message: 'Audio tracks mixed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio mixing failed',
        message: 'Failed to mix audio tracks'
      };
    }
  }

  /**
   * Build FFmpeg filter for mixing multiple audio tracks
   */
  private buildMixingFilter(tracks: AudioTrack[]): string {
    if (tracks.length === 1) {
      return `[0:a]volume=${tracks[0].volume}[mixed]`;
    }

    const inputs = tracks.map((track, index) => 
      `[${index}:a]volume=${track.volume}[a${index}]`
    ).join(';');

    const mixInputs = tracks.map((_, index) => `[a${index}]`).join('');
    const mixFilter = `${mixInputs}amix=inputs=${tracks.length}:duration=longest:dropout_transition=2[mixed]`;

    return `${inputs};${mixFilter}`;
  }

  /**
   * Apply audio effects for emotional enhancement
   */
  async applyEmotionalEffects(
    audioPath: string,
    emotion: string,
    intensity: number = 1.0
  ): Promise<APIResponse<string>> {
    try {
      const outputPath = path.join(this.tempDir, `emotional_${Date.now()}.wav`);
      const effects = this.getEmotionalEffects(emotion, intensity);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(audioPath)
          .audioFilters(effects)
          .audioCodec('pcm_s16le')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        success: true,
        data: outputPath,
        message: 'Emotional effects applied successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emotional effects application failed',
        message: 'Failed to apply emotional effects'
      };
    }
  }

  /**
   * Get audio effects based on emotion
   */
  private getEmotionalEffects(emotion: string, intensity: number): string[] {
    const baseIntensity = Math.max(0.1, Math.min(2.0, intensity));
    
    const effectsMap: { [key: string]: string[] } = {
      'happy': [
        `equalizer=f=2000:width_type=h:width=500:g=${3 * baseIntensity}`,
        `equalizer=f=8000:width_type=h:width=1000:g=${2 * baseIntensity}`,
        `chorus=0.5:0.9:50:0.4:0.25:2`
      ],
      'sad': [
        `equalizer=f=200:width_type=h:width=100:g=${-2 * baseIntensity}`,
        `equalizer=f=4000:width_type=h:width=2000:g=${-3 * baseIntensity}`,
        `reverb=0.8:0.7:0.9:0.3`
      ],
      'angry': [
        `equalizer=f=1000:width_type=h:width=200:g=${4 * baseIntensity}`,
        `equalizer=f=3000:width_type=h:width=500:g=${3 * baseIntensity}`,
        `overdrive=10:20`
      ],
      'excited': [
        `equalizer=f=5000:width_type=h:width=1000:g=${4 * baseIntensity}`,
        `chorus=0.7:0.9:55:0.4:0.25:2`,
        `tremolo=f=5:d=0.5`
      ],
      'scared': [
        `equalizer=f=100:width_type=h:width=50:g=${-4 * baseIntensity}`,
        `tremolo=f=8:d=0.8`,
        `reverb=0.9:0.8:1.0:0.4`
      ],
      'whispering': [
        `volume=${0.3 * baseIntensity}`,
        `equalizer=f=8000:width_type=h:width=4000:g=${-6 * baseIntensity}`,
        `compand=0.3,1:6:-70/-60,-20/-20,0/-10:6:0:-90:0.2`
      ],
      'shouting': [
        `volume=${1.5 * baseIntensity}`,
        `equalizer=f=2000:width_type=h:width=1000:g=${5 * baseIntensity}`,
        `compand=0.02,0.2:6:-70/-60,-20/-10,0/0:6:0:-90:0.1`
      ]
    };

    return effectsMap[emotion] || [`volume=${baseIntensity}`];
  }

  /**
   * Synchronize audio with video timing
   */
  async synchronizeAudioWithVideo(
    audioPath: string,
    videoPath: string,
    timingAdjustment: number = 0
  ): Promise<APIResponse<string>> {
    try {
      const outputPath = path.join(this.tempDir, `synced_${Date.now()}.wav`);

      // Get video duration for reference
      const videoDuration = await this.getMediaDuration(videoPath);
      
      await new Promise<void>((resolve, reject) => {
        let command = ffmpeg(audioPath);

        // Apply timing adjustment if needed
        if (timingAdjustment !== 0) {
          if (timingAdjustment > 0) {
            // Delay audio
            command = command.audioFilters([`adelay=${Math.abs(timingAdjustment * 1000)}|${Math.abs(timingAdjustment * 1000)}`]);
          } else {
            // Trim audio from beginning
            command = command.seekInput(Math.abs(timingAdjustment));
          }
        }

        command
          .duration(videoDuration)
          .audioCodec('pcm_s16le')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        success: true,
        data: outputPath,
        message: 'Audio synchronized successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio synchronization failed',
        message: 'Failed to synchronize audio'
      };
    }
  }

  /**
   * Get media duration
   */
  private async getMediaDuration(mediaPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(mediaPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(metadata.format.duration || 0);
      });
    });
  }

  /**
   * Apply studio-quality processing pipeline
   */
  async applyStudioProcessing(
    audioPath: string,
    preset: QualityPreset = 'balanced'
  ): Promise<APIResponse<string>> {
    try {
      const outputPath = path.join(this.tempDir, `studio_${Date.now()}.wav`);
      const processingChain = this.getStudioProcessingChain(preset);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(audioPath)
          .audioFilters(processingChain)
          .audioCodec('pcm_s24le') // Higher bit depth for studio quality
          .audioFrequency(48000) // Higher sample rate
          .audioChannels(2)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        success: true,
        data: outputPath,
        message: 'Studio processing applied successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Studio processing failed',
        message: 'Failed to apply studio processing'
      };
    }
  }

  /**
   * Get studio processing chain based on quality preset
   */
  private getStudioProcessingChain(preset: QualityPreset): string[] {
    const chains = {
      fast: [
        'afftdn=nr=10:nf=-50',
        'dynaudnorm=p=0.9',
        'equalizer=f=100:width_type=h:width=50:g=2'
      ],
      balanced: [
        'afftdn=nr=15:nf=-45',
        'compand=0.02,0.2:6:-70/-60,-20/-10,0/0:6:0:-90:0.1',
        'equalizer=f=100:width_type=h:width=50:g=1.5',
        'equalizer=f=3000:width_type=h:width=1000:g=0.5',
        'dynaudnorm=p=0.85:m=12',
        'limiter=level_in=1:level_out=0.95:limit=0.95'
      ],
      high_quality: [
        'afftdn=nr=20:nf=-40:tn=1',
        'compand=0.01,0.1:6:-80/-70,-30/-15,0/0:6:0:-90:0.05',
        'equalizer=f=80:width_type=h:width=40:g=2',
        'equalizer=f=200:width_type=h:width=100:g=1',
        'equalizer=f=1000:width_type=h:width=200:g=0.5',
        'equalizer=f=3000:width_type=h:width=1000:g=1',
        'equalizer=f=8000:width_type=h:width=2000:g=0.5',
        'dynaudnorm=p=0.8:m=10:s=3',
        'limiter=level_in=1:level_out=0.9:limit=0.9:attack=5:release=50',
        'loudnorm=I=-16:TP=-1.5:LRA=11'
      ]
    };

    return chains[preset];
  }

  /**
   * Convert audio format
   */
  async convertAudioFormat(
    audioPath: string,
    targetFormat: 'wav' | 'mp3' | 'aac' | 'flac',
    quality?: number
  ): Promise<APIResponse<string>> {
    try {
      const extension = targetFormat === 'aac' ? 'm4a' : targetFormat;
      const outputPath = path.join(this.tempDir, `converted_${Date.now()}.${extension}`);

      let command = ffmpeg(audioPath);

      // Set codec and quality based on format
      switch (targetFormat) {
        case 'mp3':
          command = command.audioCodec('libmp3lame').audioBitrate(quality || 192);
          break;
        case 'aac':
          command = command.audioCodec('aac').audioBitrate(quality || 128);
          break;
        case 'flac':
          command = command.audioCodec('flac');
          break;
        case 'wav':
        default:
          command = command.audioCodec('pcm_s16le');
          break;
      }

      await new Promise<void>((resolve, reject) => {
        command
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        success: true,
        data: outputPath,
        message: `Audio converted to ${targetFormat} successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio conversion failed',
        message: `Failed to convert audio to ${targetFormat}`
      };
    }
  }

  /**
   * Analyze audio quality metrics
   */
  async analyzeAudioQuality(audioPath: string): Promise<APIResponse<AudioQualityMetrics>> {
    try {
      const metrics = await this.extractAudioMetrics(audioPath);

      return {
        success: true,
        data: metrics,
        message: 'Audio quality analysis completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio analysis failed',
        message: 'Failed to analyze audio quality'
      };
    }
  }

  /**
   * Extract audio quality metrics
   */
  private async extractAudioMetrics(audioPath: string): Promise<AudioQualityMetrics> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          reject(new Error('No audio stream found'));
          return;
        }

        const metrics: AudioQualityMetrics = {
          duration: metadata.format.duration || 0,
          sampleRate: audioStream.sample_rate || 0,
          bitRate: parseInt(audioStream.bit_rate || '0'),
          channels: audioStream.channels || 0,
          codec: audioStream.codec_name || 'unknown',
          dynamicRange: 0, // Would need additional analysis
          peakLevel: 0,    // Would need additional analysis
          rmsLevel: 0,     // Would need additional analysis
          thd: 0,          // Would need additional analysis
          snr: 0           // Would need additional analysis
        };

        resolve(metrics);
      });
    });
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Extract audio from video buffer
   */
  async extractAudio(videoBuffer: Buffer): Promise<Buffer> {
    try {
      const tempVideoPath = path.join(this.tempDir, `temp_video_${Date.now()}.mp4`);
      const tempAudioPath = path.join(this.tempDir, `extracted_audio_${Date.now()}.wav`);
      
      // Write video buffer to temp file
      fs.writeFileSync(tempVideoPath, videoBuffer);
      
      // Extract audio using FFmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .audioCodec('pcm_s16le')
          .audioFrequency(this.audioConfig.sampleRate)
          .audioChannels(this.audioConfig.channels)
          .format('wav')
          .output(tempAudioPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Read audio buffer
      const audioBuffer = fs.readFileSync(tempAudioPath);
      
      // Cleanup temp files
      fs.unlinkSync(tempVideoPath);
      fs.unlinkSync(tempAudioPath);
      
      return audioBuffer;
    } catch (error) {
      console.error('Audio extraction failed:', error);
      throw new Error('Failed to extract audio from video');
    }
  }

  /**
   * Mix audio tracks with new signature for dubbed audio
   */
  async mixAudioTracks(params: {
    originalAudio: Buffer;
    dubbedAudio: any[];
    outputFormat: string;
  }): Promise<Buffer> {
    try {
      const tempOriginalPath = path.join(this.tempDir, `original_${Date.now()}.wav`);
      const tempDubbedPath = path.join(this.tempDir, `dubbed_${Date.now()}.wav`);
      const outputPath = path.join(this.tempDir, `mixed_${Date.now()}.${params.outputFormat}`);
      
      // Write original audio to temp file
      fs.writeFileSync(tempOriginalPath, params.originalAudio);
      
      // For demo purposes, we'll create a simple mixed audio
      // In production, you would process each dubbed audio segment
      const mixedAudio = await this.createMixedAudio(params.dubbedAudio);
      fs.writeFileSync(tempDubbedPath, mixedAudio);
      
      // Mix original and dubbed audio
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(tempOriginalPath)
          .input(tempDubbedPath)
          .complexFilter([
            '[0:a]volume=0.3[original]',
            '[1:a]volume=0.7[dubbed]',
            '[original][dubbed]amix=inputs=2:duration=longest[mixed]'
          ])
          .output('[mixed]')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Read mixed audio buffer
      const mixedBuffer = fs.readFileSync(outputPath);
      
      // Cleanup temp files
      fs.unlinkSync(tempOriginalPath);
      fs.unlinkSync(tempDubbedPath);
      fs.unlinkSync(outputPath);
      
      return mixedBuffer;
    } catch (error) {
      console.error('Audio mixing failed:', error);
      throw new Error('Failed to mix audio tracks');
    }
  }

  /**
   * Create mixed audio from dubbed segments
   */
  private async createMixedAudio(dubbedSegments: any[]): Promise<Buffer> {
    // For demo purposes, create a simple audio buffer
    // In production, you would concatenate all dubbed audio segments
    const sampleRate = 44100;
    const duration = 15; // 15 seconds
    const samples = sampleRate * duration;
    
    // Create a simple sine wave as placeholder
    const audioBuffer = Buffer.alloc(samples * 2); // 16-bit samples
    
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3; // A4 note
      const intSample = Math.floor(sample * 32767);
      audioBuffer.writeInt16LE(intSample, i * 2);
    }
    
    return audioBuffer;
  }

  /**
   * Create final dubbed video
   */
  async createDubbedVideo(params: {
    originalVideo: Buffer;
    dubbedAudio: Buffer;
    outputFormat: string;
    quality: string;
  }): Promise<Buffer> {
    try {
      const tempVideoPath = path.join(this.tempDir, `original_video_${Date.now()}.mp4`);
      const tempAudioPath = path.join(this.tempDir, `dubbed_audio_${Date.now()}.wav`);
      const outputPath = path.join(this.tempDir, `dubbed_video_${Date.now()}.${params.outputFormat}`);
      
      // Write buffers to temp files
      fs.writeFileSync(tempVideoPath, params.originalVideo);
      fs.writeFileSync(tempAudioPath, params.dubbedAudio);
      
      // Create dubbed video by replacing audio track
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg(tempVideoPath)
          .input(tempAudioPath)
          .outputOptions([
            '-map 0:v', // Use video from first input
            '-map 1:a', // Use audio from second input
            '-c:v copy', // Copy video codec
            '-c:a aac', // Use AAC for audio
            '-b:a 128k' // Audio bitrate
          ])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Read dubbed video buffer
      const dubbedVideoBuffer = fs.readFileSync(outputPath);
      
      // Cleanup temp files
      fs.unlinkSync(tempVideoPath);
      fs.unlinkSync(tempAudioPath);
      fs.unlinkSync(outputPath);
      
      return dubbedVideoBuffer;
    } catch (error) {
      console.error('Dubbed video creation failed:', error);
      throw new Error('Failed to create dubbed video');
    }
  }
}

// Supporting interfaces
export interface AudioTrack {
  path: string;
  volume: number;
  startTime?: number;
  duration?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface AudioQualityMetrics {
  duration: number;
  sampleRate: number;
  bitRate: number;
  channels: number;
  codec: string;
  dynamicRange: number;
  peakLevel: number;
  rmsLevel: number;
  thd: number; // Total Harmonic Distortion
  snr: number; // Signal-to-Noise Ratio
}