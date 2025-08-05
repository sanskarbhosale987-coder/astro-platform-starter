import { DubbingProject, DialogueSegment, Character, ProcessingProgress, APIResponse, DubbingSettings } from '../types';
import { TranslationService } from './TranslationService';
import { VoiceSynthesisService } from './VoiceSynthesisService';
import { LipSyncService } from './LipSyncService';
import { AudioProcessingService } from './AudioProcessingService';
import { SubtitleService } from './SubtitleService';
import { VideoAnalysisService } from './VideoAnalysisService';
import { CharacterDetectionService } from './CharacterDetectionService';
import fs from 'fs';
import path from 'path';

export class AutomationService {
  private translationService: TranslationService;
  private voiceSynthesisService: VoiceSynthesisService;
  private lipSyncService: LipSyncService;
  private audioProcessingService: AudioProcessingService;
  private subtitleService: SubtitleService;
  private videoAnalysisService: VideoAnalysisService;
  private characterDetectionService: CharacterDetectionService;
  private automationRules: AutomationRule[];
  private processingQueue: Map<string, AutomationJob>;

  constructor(
    translationService: TranslationService,
    voiceSynthesisService: VoiceSynthesisService,
    lipSyncService: LipSyncService,
    audioProcessingService: AudioProcessingService,
    subtitleService: SubtitleService,
    videoAnalysisService: VideoAnalysisService,
    characterDetectionService: CharacterDetectionService
  ) {
    this.translationService = translationService;
    this.voiceSynthesisService = voiceSynthesisService;
    this.lipSyncService = lipSyncService;
    this.audioProcessingService = audioProcessingService;
    this.subtitleService = subtitleService;
    this.videoAnalysisService = videoAnalysisService;
    this.characterDetectionService = characterDetectionService;
    this.automationRules = [];
    this.processingQueue = new Map();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default automation rules
   */
  private initializeDefaultRules(): void {
    this.automationRules = [
      {
        id: 'shounen_protagonist',
        name: 'Shounen Protagonist Auto-Voice',
        conditions: {
          characterType: 'protagonist',
          gender: 'male',
          age: 'teen',
          personality: ['energetic', 'determined', 'loud']
        },
        actions: {
          voiceId: 'male_young_energetic',
          emotionIntensity: 'high',
          voiceModifications: {
            pitch: 1.1,
            speed: 1.05,
            energy: 1.2
          }
        }
      },
      {
        id: 'moe_heroine',
        name: 'Moe Heroine Auto-Voice',
        conditions: {
          characterType: 'heroine',
          gender: 'female',
          age: 'teen',
          personality: ['cute', 'shy', 'innocent']
        },
        actions: {
          voiceId: 'female_young_cute',
          emotionIntensity: 'medium',
          voiceModifications: {
            pitch: 1.2,
            speed: 1.0,
            cuteness: 1.3
          }
        }
      },
      {
        id: 'wise_mentor',
        name: 'Wise Mentor Auto-Voice',
        conditions: {
          characterType: 'mentor',
          gender: 'male',
          age: 'adult',
          personality: ['wise', 'calm', 'experienced']
        },
        actions: {
          voiceId: 'male_adult_calm',
          emotionIntensity: 'low',
          voiceModifications: {
            pitch: 0.9,
            speed: 0.95,
            gravitas: 1.1
          }
        }
      },
      {
        id: 'tsundere_character',
        name: 'Tsundere Auto-Voice',
        conditions: {
          personality: ['tsundere', 'prideful', 'conflicted']
        },
        actions: {
          voiceId: 'female_adult_standard',
          emotionIntensity: 'high',
          voiceModifications: {
            pitch: 1.05,
            speed: 1.1,
            attitude: 1.4
          }
        }
      }
    ];
  }

  /**
   * Fully automated dubbing pipeline
   */
  async processVideoAutomatically(
    videoPath: string,
    settings: DubbingSettings,
    automationLevel: AutomationLevel = 'full'
  ): Promise<APIResponse<AutomationResult>> {
    try {
      const jobId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const job: AutomationJob = {
        id: jobId,
        videoPath,
        settings,
        automationLevel,
        status: 'initializing',
        startTime: new Date(),
        progress: {
          stage: 'upload',
          percentage: 0,
          currentTask: 'Initializing automation pipeline',
          estimatedTimeRemaining: 0,
          errors: []
        },
        results: {
          characters: [],
          dialogueSegments: [],
          voiceAssignments: [],
          outputFiles: []
        }
      };

      this.processingQueue.set(jobId, job);

      // Start automated processing
      const result = await this.executeAutomationPipeline(job);

      return {
        success: true,
        data: result,
        message: 'Automated dubbing completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Automation failed',
        message: 'Failed to process video automatically'
      };
    }
  }

  /**
   * Execute the complete automation pipeline
   */
  private async executeAutomationPipeline(job: AutomationJob): Promise<AutomationResult> {
    const stages = [
      { name: 'Video Analysis', handler: this.performVideoAnalysis.bind(this) },
      { name: 'Character Detection', handler: this.performCharacterDetection.bind(this) },
      { name: 'Dialogue Extraction', handler: this.performDialogueExtraction.bind(this) },
      { name: 'Auto Voice Assignment', handler: this.performAutoVoiceAssignment.bind(this) },
      { name: 'Translation', handler: this.performTranslation.bind(this) },
      { name: 'Voice Synthesis', handler: this.performVoiceSynthesis.bind(this) },
      { name: 'Lip Synchronization', handler: this.performLipSynchronization.bind(this) },
      { name: 'Audio Processing', handler: this.performAudioProcessing.bind(this) },
      { name: 'Video Composition', handler: this.performVideoComposition.bind(this) },
      { name: 'Quality Validation', handler: this.performQualityValidation.bind(this) }
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      
      job.progress = {
        stage: stage.name.toLowerCase().replace(' ', '_') as any,
        percentage: (i / stages.length) * 100,
        currentTask: `Executing ${stage.name}...`,
        estimatedTimeRemaining: (stages.length - i) * 60,
        errors: []
      };

      this.processingQueue.set(job.id, job);

      try {
        await stage.handler(job);
      } catch (error) {
        job.progress.errors.push({
          code: 'AUTOMATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          severity: 'error'
        });
        throw error;
      }
    }

    job.status = 'completed';
    job.endTime = new Date();
    job.progress.percentage = 100;
    job.progress.currentTask = 'Automation completed successfully';

    return job.results;
  }

  /**
   * Stage 1: Video Analysis
   */
  private async performVideoAnalysis(job: AutomationJob): Promise<void> {
    const analysis = await this.videoAnalysisService.analyzeVideo(job.videoPath);
    
    if (!analysis.success || !analysis.data) {
      throw new Error('Video analysis failed');
    }

    job.results.videoMetadata = analysis.data;
    job.progress.currentTask = 'Video analysis completed - extracting metadata';
  }

  /**
   * Stage 2: Character Detection
   */
  private async performCharacterDetection(job: AutomationJob): Promise<void> {
    const detection = await this.characterDetectionService.detectCharacters(
      job.videoPath,
      job.results.videoMetadata
    );

    if (!detection.success || !detection.data) {
      throw new Error('Character detection failed');
    }

    job.results.characters = detection.data;
    job.progress.currentTask = `Detected ${detection.data.length} characters`;
  }

  /**
   * Stage 3: Dialogue Extraction
   */
  private async performDialogueExtraction(job: AutomationJob): Promise<void> {
    const extraction = await this.videoAnalysisService.extractDialogue(
      job.videoPath,
      job.results.characters
    );

    if (!extraction.success || !extraction.data) {
      throw new Error('Dialogue extraction failed');
    }

    job.results.dialogueSegments = extraction.data;
    job.progress.currentTask = `Extracted ${extraction.data.length} dialogue segments`;
  }

  /**
   * Stage 4: Auto Voice Assignment
   */
  private async performAutoVoiceAssignment(job: AutomationJob): Promise<void> {
    const assignments: VoiceAssignment[] = [];

    for (const character of job.results.characters) {
      const assignment = await this.assignVoiceAutomatically(character, job.settings);
      assignments.push(assignment);
    }

    job.results.voiceAssignments = assignments;
    job.progress.currentTask = `Assigned voices to ${assignments.length} characters`;
  }

  /**
   * Stage 5: Translation
   */
  private async performTranslation(job: AutomationJob): Promise<void> {
    const translatedSegments: DialogueSegment[] = [];

    for (const segment of job.results.dialogueSegments) {
      const translation = await this.translationService.translateDialogue({
        text: segment.originalText,
        sourceLanguage: job.settings.targetLanguage === 'ja' ? 'ja' : 'auto-detect',
        targetLanguage: job.settings.targetLanguage,
        characterName: this.getCharacterName(segment.characterId, job.results.characters),
        emotion: segment.emotion,
        context: 'anime_dialogue'
      });

      if (translation.success && translation.data) {
        translatedSegments.push({
          ...segment,
          translatedText: translation.data
        });
      }
    }

    job.results.dialogueSegments = translatedSegments;
    job.progress.currentTask = `Translated ${translatedSegments.length} dialogue segments`;
  }

  /**
   * Stage 6: Voice Synthesis
   */
  private async performVoiceSynthesis(job: AutomationJob): Promise<void> {
    const voiceFiles: string[] = [];

    for (const segment of job.results.dialogueSegments) {
      const assignment = job.results.voiceAssignments.find(a => a.characterId === segment.characterId);
      if (!assignment) continue;

      const synthesis = await this.voiceSynthesisService.synthesizeVoice({
        text: segment.translatedText,
        voiceId: assignment.voiceId,
        emotion: segment.emotion,
        intensity: segment.intensity,
        speed: assignment.voiceModifications?.speed || 1.0,
        pitch: assignment.voiceModifications?.pitch || 1.0
      });

      if (synthesis.success && synthesis.data) {
        voiceFiles.push(synthesis.data);
        segment.audioPath = synthesis.data;
      }
    }

    job.results.voiceFiles = voiceFiles;
    job.progress.currentTask = `Generated ${voiceFiles.length} voice files`;
  }

  /**
   * Stage 7: Lip Synchronization
   */
  private async performLipSynchronization(job: AutomationJob): Promise<void> {
    for (const segment of job.results.dialogueSegments) {
      if (!segment.audioPath) continue;

      const lipSync = await this.lipSyncService.generateLipSync(
        segment.audioPath,
        segment.translatedText,
        job.settings.lipSyncAccuracy
      );

      if (lipSync.success && lipSync.data) {
        segment.lipSyncData = lipSync.data;
      }
    }

    job.progress.currentTask = 'Lip synchronization completed for all segments';
  }

  /**
   * Stage 8: Audio Processing
   */
  private async performAudioProcessing(job: AutomationJob): Promise<void> {
    // Extract original audio
    const originalAudio = await this.audioProcessingService.extractAudioFromVideo(job.videoPath);
    if (!originalAudio.success || !originalAudio.data) {
      throw new Error('Failed to extract original audio');
    }

    // Process and mix all voice tracks
    const audioTracks = job.results.dialogueSegments
      .filter(segment => segment.audioPath)
      .map(segment => ({
        path: segment.audioPath!,
        volume: 1.0,
        startTime: segment.startTime,
        duration: segment.endTime - segment.startTime
      }));

    const mixedAudio = await this.audioProcessingService.mixAudioTracks(audioTracks);
    if (!mixedAudio.success || !mixedAudio.data) {
      throw new Error('Failed to mix audio tracks');
    }

    // Apply studio processing
    const processedAudio = await this.audioProcessingService.applyStudioProcessing(
      mixedAudio.data,
      job.settings.qualityPreset
    );

    if (processedAudio.success && processedAudio.data) {
      job.results.finalAudioPath = processedAudio.data;
    }

    job.progress.currentTask = 'Audio processing and mixing completed';
  }

  /**
   * Stage 9: Video Composition
   */
  private async performVideoComposition(job: AutomationJob): Promise<void> {
    const outputPath = this.generateOutputPath(job.videoPath, 'dubbed');
    
    // Combine video with new audio and apply lip sync
    const composition = await this.composeVideo(
      job.videoPath,
      job.results.finalAudioPath!,
      job.results.dialogueSegments,
      outputPath
    );

    if (!composition.success || !composition.data) {
      throw new Error('Video composition failed');
    }

    job.results.outputFiles.push({
      type: 'video',
      path: composition.data,
      format: 'mp4'
    });

    // Generate subtitles if enabled
    if (job.settings.subtitlesEnabled) {
      const subtitles = await this.subtitleService.generateSubtitles(
        job.results.dialogueSegments,
        'srt'
      );

      if (subtitles.success && subtitles.data) {
        const subtitlePath = outputPath.replace('.mp4', '.srt');
        fs.writeFileSync(subtitlePath, subtitles.data);
        
        job.results.outputFiles.push({
          type: 'subtitle',
          path: subtitlePath,
          format: 'srt'
        });
      }
    }

    job.progress.currentTask = 'Video composition completed';
  }

  /**
   * Stage 10: Quality Validation
   */
  private async performQualityValidation(job: AutomationJob): Promise<void> {
    const validationResults: QualityMetrics = {
      overallScore: 0,
      lipSyncAccuracy: 0,
      audioQuality: 0,
      translationQuality: 0,
      voiceMatching: 0,
      recommendations: []
    };

    // Validate lip sync quality
    if (job.results.outputFiles.find(f => f.type === 'video')) {
      const lipSyncValidation = await this.lipSyncService.validateLipSync(
        job.videoPath,
        job.results.outputFiles.find(f => f.type === 'video')!.path
      );

      if (lipSyncValidation.success && lipSyncValidation.data) {
        validationResults.lipSyncAccuracy = lipSyncValidation.data.overallScore;
      }
    }

    // Validate audio quality
    if (job.results.finalAudioPath) {
      const audioValidation = await this.audioProcessingService.analyzeAudioQuality(
        job.results.finalAudioPath
      );

      if (audioValidation.success && audioValidation.data) {
        validationResults.audioQuality = this.calculateAudioQualityScore(audioValidation.data);
      }
    }

    // Calculate overall quality score
    validationResults.overallScore = (
      validationResults.lipSyncAccuracy * 0.3 +
      validationResults.audioQuality * 0.3 +
      validationResults.translationQuality * 0.2 +
      validationResults.voiceMatching * 0.2
    );

    // Generate recommendations
    if (validationResults.overallScore < 0.8) {
      validationResults.recommendations.push('Consider using higher quality settings for better results');
    }
    if (validationResults.lipSyncAccuracy < 0.7) {
      validationResults.recommendations.push('Lip sync accuracy could be improved with ultra precision mode');
    }

    job.results.qualityMetrics = validationResults;
    job.progress.currentTask = `Quality validation completed - Overall score: ${(validationResults.overallScore * 100).toFixed(1)}%`;
  }

  /**
   * Automatically assign voice to character based on rules
   */
  private async assignVoiceAutomatically(
    character: Character,
    settings: DubbingSettings
  ): Promise<VoiceAssignment> {
    // Find matching automation rule
    const matchingRule = this.automationRules.find(rule => 
      this.evaluateRuleConditions(rule.conditions, character)
    );

    if (matchingRule) {
      return {
        characterId: character.id,
        voiceId: matchingRule.actions.voiceId,
        confidence: 0.9,
        reasoning: `Matched automation rule: ${matchingRule.name}`,
        voiceModifications: matchingRule.actions.voiceModifications
      };
    }

    // Fallback to basic matching
    const voiceProfiles = this.voiceSynthesisService.getFilteredVoiceProfiles(
      character.gender,
      character.age,
      settings.voiceStyle
    );

    const selectedVoice = voiceProfiles[0] || this.voiceSynthesisService.getVoiceProfiles()[0];

    return {
      characterId: character.id,
      voiceId: selectedVoice.id,
      confidence: 0.6,
      reasoning: 'Basic gender and age matching',
      voiceModifications: {
        pitch: 1.0,
        speed: 1.0
      }
    };
  }

  /**
   * Evaluate rule conditions against character
   */
  private evaluateRuleConditions(conditions: RuleConditions, character: Character): boolean {
    if (conditions.gender && character.gender !== conditions.gender) return false;
    if (conditions.age && character.age !== conditions.age) return false;
    
    if (conditions.personality) {
      const hasMatchingPersonality = conditions.personality.some(trait => 
        character.personality.includes(trait)
      );
      if (!hasMatchingPersonality) return false;
    }

    return true;
  }

  /**
   * Compose final video with new audio and lip sync
   */
  private async composeVideo(
    videoPath: string,
    audioPath: string,
    segments: DialogueSegment[],
    outputPath: string
  ): Promise<APIResponse<string>> {
    try {
      // This would use FFmpeg to combine video with new audio
      // For now, simulate the process
      await this.delay(5000);
      
      // In production, this would execute:
      // ffmpeg -i video.mp4 -i audio.wav -c:v copy -c:a aac -strict experimental output.mp4
      
      return {
        success: true,
        data: outputPath,
        message: 'Video composition completed'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Video composition failed',
        message: 'Failed to compose final video'
      };
    }
  }

  /**
   * Get automation job status
   */
  getAutomationJobStatus(jobId: string): APIResponse<AutomationJob> {
    const job = this.processingQueue.get(jobId);
    
    if (!job) {
      return {
        success: false,
        error: 'Job not found',
        message: `Automation job ${jobId} not found`
      };
    }

    return {
      success: true,
      data: job,
      message: 'Job status retrieved successfully'
    };
  }

  /**
   * Cancel automation job
   */
  cancelAutomationJob(jobId: string): APIResponse<boolean> {
    const job = this.processingQueue.get(jobId);
    
    if (!job) {
      return {
        success: false,
        error: 'Job not found',
        message: `Automation job ${jobId} not found`
      };
    }

    job.status = 'cancelled';
    
    return {
      success: true,
      data: true,
      message: 'Automation job cancelled successfully'
    };
  }

  /**
   * Add custom automation rule
   */
  addAutomationRule(rule: AutomationRule): APIResponse<string> {
    try {
      this.automationRules.push(rule);
      
      return {
        success: true,
        data: rule.id,
        message: 'Automation rule added successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add rule',
        message: 'Failed to add automation rule'
      };
    }
  }

  /**
   * Get all automation rules
   */
  getAutomationRules(): AutomationRule[] {
    return [...this.automationRules];
  }

  /**
   * Utility functions
   */
  private getCharacterName(characterId: string, characters: Character[]): string {
    const character = characters.find(c => c.id === characterId);
    return character?.name || 'Unknown';
  }

  private calculateAudioQualityScore(metrics: any): number {
    // Simplified quality scoring based on audio metrics
    let score = 0.8; // Base score
    
    if (metrics.sampleRate >= 44100) score += 0.1;
    if (metrics.bitRate >= 128000) score += 0.1;
    
    return Math.min(1.0, score);
  }

  private generateOutputPath(inputPath: string, suffix: string): string {
    const ext = path.extname(inputPath);
    const base = path.basename(inputPath, ext);
    const dir = path.dirname(inputPath);
    return path.join(dir, `${base}_${suffix}${ext}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Supporting interfaces and types
export interface AutomationJob {
  id: string;
  videoPath: string;
  settings: DubbingSettings;
  automationLevel: AutomationLevel;
  status: 'initializing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  progress: ProcessingProgress;
  results: AutomationResult;
}

export interface AutomationResult {
  characters: Character[];
  dialogueSegments: DialogueSegment[];
  voiceAssignments: VoiceAssignment[];
  voiceFiles?: string[];
  finalAudioPath?: string;
  outputFiles: OutputFile[];
  videoMetadata?: VideoMetadata;
  qualityMetrics?: QualityMetrics;
}

export interface AutomationRule {
  id: string;
  name: string;
  conditions: RuleConditions;
  actions: RuleActions;
}

export interface RuleConditions {
  characterType?: string;
  gender?: 'male' | 'female' | 'other';
  age?: 'child' | 'teen' | 'adult' | 'elderly';
  personality?: string[];
  voiceActorStyle?: string;
}

export interface RuleActions {
  voiceId: string;
  emotionIntensity: 'low' | 'medium' | 'high';
  voiceModifications?: {
    pitch?: number;
    speed?: number;
    energy?: number;
    cuteness?: number;
    gravitas?: number;
    attitude?: number;
  };
}

export interface VoiceAssignment {
  characterId: string;
  voiceId: string;
  confidence: number;
  reasoning: string;
  voiceModifications?: {
    pitch?: number;
    speed?: number;
    [key: string]: number | undefined;
  };
}

export interface OutputFile {
  type: 'video' | 'audio' | 'subtitle';
  path: string;
  format: string;
}

export interface VideoMetadata {
  duration: number;
  resolution: string;
  frameRate: number;
  hasSubtitles: boolean;
  audioTracks: number;
  language?: string;
}

export interface QualityMetrics {
  overallScore: number;
  lipSyncAccuracy: number;
  audioQuality: number;
  translationQuality: number;
  voiceMatching: number;
  recommendations: string[];
}

export type AutomationLevel = 'basic' | 'standard' | 'full' | 'custom';