import { BatchJob, DubbingProject, ProcessingProgress, APIResponse, DubbingSettings } from '../types';
import { TranslationService } from './TranslationService';
import { VoiceSynthesisService } from './VoiceSynthesisService';
import { LipSyncService } from './LipSyncService';
import { AudioProcessingService } from './AudioProcessingService';
import fs from 'fs';
import path from 'path';

export class BatchProcessingService {
  private translationService: TranslationService;
  private voiceSynthesisService: VoiceSynthesisService;
  private lipSyncService: LipSyncService;
  private audioProcessingService: AudioProcessingService;
  private activeJobs: Map<string, BatchJob>;
  private processingQueue: BatchJob[];
  private maxConcurrentJobs: number;
  private currentlyProcessing: number;

  constructor(
    translationService: TranslationService,
    voiceSynthesisService: VoiceSynthesisService,
    lipSyncService: LipSyncService,
    audioProcessingService: AudioProcessingService,
    maxConcurrentJobs: number = 3
  ) {
    this.translationService = translationService;
    this.voiceSynthesisService = voiceSynthesisService;
    this.lipSyncService = lipSyncService;
    this.audioProcessingService = audioProcessingService;
    this.activeJobs = new Map();
    this.processingQueue = [];
    this.maxConcurrentJobs = maxConcurrentJobs;
    this.currentlyProcessing = 0;
  }

  /**
   * Create a new batch job for multiple projects
   */
  async createBatchJob(
    name: string,
    projectFiles: BatchProjectFile[],
    settings: DubbingSettings
  ): Promise<APIResponse<string>> {
    try {
      const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create individual projects for each file
      const projects: string[] = [];
      for (const file of projectFiles) {
        const projectId = await this.createProject(file, settings);
        projects.push(projectId);
      }

      const batchJob: BatchJob = {
        id: jobId,
        name,
        projects,
        status: 'queued',
        createdAt: new Date()
      };

      this.activeJobs.set(jobId, batchJob);
      this.processingQueue.push(batchJob);

      // Start processing if capacity allows
      this.processNextInQueue();

      return {
        success: true,
        data: jobId,
        message: `Batch job created with ${projects.length} episodes`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create batch job',
        message: 'Batch job creation failed'
      };
    }
  }

  /**
   * Create individual project from batch file
   */
  private async createProject(file: BatchProjectFile, settings: DubbingSettings): Promise<string> {
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const project: DubbingProject = {
      id: projectId,
      name: file.name,
      sourceLanguage: settings.targetLanguage === 'ja' ? 'ja' : 'auto-detect',
      targetLanguage: settings.targetLanguage,
      status: 'uploading',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings,
      files: [{
        id: `file_${Date.now()}`,
        filename: file.name,
        type: 'video',
        size: file.size,
        path: file.path,
        uploadedAt: new Date()
      }],
      progress: {
        stage: 'upload',
        percentage: 0,
        currentTask: 'Preparing for processing',
        estimatedTimeRemaining: 0,
        errors: []
      }
    };

    // Store project (in production, this would be in a database)
    this.saveProject(project);
    
    return projectId;
  }

  /**
   * Process next job in queue
   */
  private async processNextInQueue(): Promise<void> {
    if (this.currentlyProcessing >= this.maxConcurrentJobs || this.processingQueue.length === 0) {
      return;
    }

    const job = this.processingQueue.shift();
    if (!job) return;

    this.currentlyProcessing++;
    job.status = 'processing';
    this.activeJobs.set(job.id, job);

    try {
      await this.processBatchJob(job);
      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'error';
      console.error(`Batch job ${job.id} failed:`, error);
    } finally {
      this.currentlyProcessing--;
      this.activeJobs.set(job.id, job);
      
      // Process next job in queue
      setTimeout(() => this.processNextInQueue(), 1000);
    }
  }

  /**
   * Process entire batch job
   */
  private async processBatchJob(job: BatchJob): Promise<void> {
    const totalProjects = job.projects.length;
    let completedProjects = 0;

    // Process projects in parallel (limited by maxConcurrentJobs)
    const processingPromises = job.projects.map(async (projectId, index) => {
      try {
        await this.processProject(projectId, (progress) => {
          // Update job progress based on individual project progress
          const overallProgress = ((completedProjects + progress.percentage / 100) / totalProjects) * 100;
          this.updateJobProgress(job.id, overallProgress, `Processing episode ${index + 1}/${totalProjects}`);
        });
        
        completedProjects++;
      } catch (error) {
        console.error(`Project ${projectId} failed:`, error);
        throw error;
      }
    });

    await Promise.all(processingPromises);
  }

  /**
   * Process individual project
   */
  private async processProject(
    projectId: string, 
    progressCallback: (progress: ProcessingProgress) => void
  ): Promise<void> {
    const project = this.loadProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const stages = [
      { name: 'analysis', handler: this.analyzeVideo.bind(this) },
      { name: 'translation', handler: this.translateDialogue.bind(this) },
      { name: 'voice_synthesis', handler: this.synthesizeVoices.bind(this) },
      { name: 'lip_sync', handler: this.applyLipSync.bind(this) },
      { name: 'audio_mixing', handler: this.mixAudio.bind(this) },
      { name: 'finalization', handler: this.finalizeVideo.bind(this) }
    ];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const progress: ProcessingProgress = {
        stage: stage.name as any,
        percentage: (i / stages.length) * 100,
        currentTask: `Processing ${stage.name}...`,
        estimatedTimeRemaining: (stages.length - i) * 30, // Rough estimate
        errors: []
      };

      progressCallback(progress);
      project.progress = progress;
      this.saveProject(project);

      try {
        await stage.handler(project);
      } catch (error) {
        progress.errors.push({
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          severity: 'error'
        });
        throw error;
      }
    }

    // Mark project as completed
    project.status = 'completed';
    project.progress.percentage = 100;
    project.progress.currentTask = 'Completed';
    project.updatedAt = new Date();
    this.saveProject(project);

    progressCallback(project.progress);
  }

  /**
   * Analyze video for dialogue and characters
   */
  private async analyzeVideo(project: DubbingProject): Promise<void> {
    try {
      console.log(`Starting video analysis for project ${project.id}`);
      
      // Get video file from blob storage
      const { getStore } = await import('@netlify/blobs');
      const blobStore = getStore('videos');
      const videoKey = project.files[0]?.path;
      
      if (!videoKey) {
        throw new Error('Video file not found');
      }
      
      const videoBuffer = await blobStore.get(videoKey);
      if (!videoBuffer) {
        throw new Error('Video buffer not found');
      }

      // Extract audio from video for speech recognition
      const audioBuffer = await this.audioProcessingService.extractAudio(videoBuffer);
      
      // Use OpenAI Whisper for speech recognition
      const transcription = await this.transcribeAudio(audioBuffer);
      
      // Analyze characters using computer vision (simplified for demo)
      const characters = await this.detectCharacters(videoBuffer);
      
      // Store analysis results
      const analysisKey = `analysis_${project.id}`;
      await blobStore.set(analysisKey, JSON.stringify({
        transcription,
        characters,
        metadata: {
          videoDuration: project.files[0]?.duration || 0,
          totalSegments: transcription.segments.length,
          totalCharacters: characters.length,
          analyzedAt: new Date().toISOString()
        }
      }));

      console.log(`Video analysis completed for project ${project.id}`);
    } catch (error) {
      console.error('Video analysis failed:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<any> {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // For demo purposes, we'll use a mock transcription
      // In production, you would send audioBuffer to OpenAI Whisper API
      const mockTranscription = {
        segments: [
          {
            start: 0.0,
            end: 3.5,
            text: "こんにちは！今日はいい天気ですね。",
            characterId: "char_1"
          },
          {
            start: 4.0,
            end: 7.2,
            text: "はい、本当に素晴らしいですね。",
            characterId: "char_2"
          },
          {
            start: 8.0,
            end: 12.5,
            text: "若者たち、今日は特別な訓練がある。",
            characterId: "char_3"
          }
        ],
        language: "ja"
      };

      return mockTranscription;
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Detect characters in video
   */
  private async detectCharacters(videoBuffer: Buffer): Promise<any[]> {
    // In production, you would use computer vision to detect characters
    // For now, we'll use mock character detection
    return [
      {
        id: "char_1",
        name: "Main Protagonist",
        voiceId: "male_young_energetic",
        voiceStyle: "energetic",
        gender: "male",
        age: "teen",
        personality: ["brave", "determined", "friendly"]
      },
      {
        id: "char_2",
        name: "Female Lead",
        voiceId: "female_young_cute",
        voiceStyle: "cute",
        gender: "female",
        age: "teen",
        personality: ["kind", "intelligent", "shy"]
      },
      {
        id: "char_3",
        name: "Mentor Figure",
        voiceId: "male_deep_mature",
        voiceStyle: "deep",
        gender: "male",
        age: "adult",
        personality: ["wise", "serious", "protective"]
      }
    ];
  }

  /**
   * Translate dialogue with cultural context
   */
  private async translateDialogue(project: DubbingProject): Promise<void> {
    try {
      console.log(`Starting dialogue translation for project ${project.id}`);
      
      // Get analysis results
      const { getStore } = await import('@netlify/blobs');
      const blobStore = getStore('videos');
      const analysisKey = `analysis_${project.id}`;
      const analysis = await blobStore.get(analysisKey, { type: 'json' });
      
      if (!analysis) {
        throw new Error('Analysis results not found');
      }

      const translatedSegments = [];
      
      // Translate each dialogue segment
      for (const segment of analysis.transcription.segments) {
        const translation = await this.translationService.translateDialogue({
          text: segment.text,
          sourceLanguage: project.sourceLanguage,
          targetLanguage: project.targetLanguage,
          context: 'anime_dialogue',
          characterName: segment.characterId,
          emotion: 'neutral'
        });

        if (translation.success && translation.data) {
          translatedSegments.push({
            ...segment,
            originalText: segment.text,
            translatedText: translation.data,
            characterId: segment.characterId
          });
        }
      }

      // Store translated dialogue
      const translationKey = `translation_${project.id}`;
      await blobStore.set(translationKey, JSON.stringify({
        segments: translatedSegments,
        sourceLanguage: project.sourceLanguage,
        targetLanguage: project.targetLanguage,
        translatedAt: new Date().toISOString()
      }));

      console.log(`Dialogue translation completed for project ${project.id}`);
    } catch (error) {
      console.error('Dialogue translation failed:', error);
      throw error;
    }
  }

  /**
   * Synthesize AI voices for characters
   */
  private async synthesizeVoices(project: DubbingProject): Promise<void> {
    try {
      console.log(`Starting voice synthesis for project ${project.id}`);
      
      // Get translated dialogue
      const { getStore } = await import('@netlify/blobs');
      const blobStore = getStore('videos');
      const translationKey = `translation_${project.id}`;
      const translation = await blobStore.get(translationKey, { type: 'json' });
      
      if (!translation) {
        throw new Error('Translation results not found');
      }

      const synthesizedAudio = [];
      
      // Synthesize voice for each dialogue segment
      for (const segment of translation.segments) {
        const voiceRequest = {
          text: segment.translatedText,
          voiceId: segment.characterId === 'char_1' ? 'male_young_energetic' : 
                   segment.characterId === 'char_2' ? 'female_young_cute' : 'male_deep_mature',
          emotion: 'neutral' as const,
          intensity: 'medium' as const,
          speed: 1.0,
          pitch: 1.0
        };

        const synthesis = await this.voiceSynthesisService.synthesizeVoice(voiceRequest);
        
        if (synthesis.success && synthesis.data) {
          synthesizedAudio.push({
            ...segment,
            audioPath: synthesis.data,
            voiceId: voiceRequest.voiceId
          });
        }
      }

      // Store synthesized audio
      const synthesisKey = `synthesis_${project.id}`;
      await blobStore.set(synthesisKey, JSON.stringify({
        audioSegments: synthesizedAudio,
        synthesizedAt: new Date().toISOString()
      }));

      console.log(`Voice synthesis completed for project ${project.id}`);
    } catch (error) {
      console.error('Voice synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Apply lip sync to video
   */
  private async applyLipSync(project: DubbingProject): Promise<void> {
    try {
      console.log(`Starting lip sync for project ${project.id}`);
      
      // Get synthesized audio
      const { getStore } = await import('@netlify/blobs');
      const blobStore = getStore('videos');
      const synthesisKey = `synthesis_${project.id}`;
      const synthesis = await blobStore.get(synthesisKey, { type: 'json' });
      
      if (!synthesis) {
        throw new Error('Synthesis results not found');
      }

      // Apply lip sync to each audio segment
      const lipSyncData = [];
      
      for (const audioSegment of synthesis.audioSegments) {
        const lipSync = await this.lipSyncService.generateLipSync({
          audioPath: audioSegment.audioPath,
          startTime: audioSegment.start,
          endTime: audioSegment.end,
          characterId: audioSegment.characterId
        });

        if (lipSync.success && lipSync.data) {
          lipSyncData.push({
            ...audioSegment,
            lipSyncData: lipSync.data
          });
        }
      }

      // Store lip sync data
      const lipSyncKey = `lipsync_${project.id}`;
      await blobStore.set(lipSyncKey, JSON.stringify({
        lipSyncSegments: lipSyncData,
        appliedAt: new Date().toISOString()
      }));

      console.log(`Lip sync completed for project ${project.id}`);
    } catch (error) {
      console.error('Lip sync failed:', error);
      throw error;
    }
  }

  /**
   * Mix audio and create final video
   */
  private async mixAudio(project: DubbingProject): Promise<void> {
    try {
      console.log(`Starting audio mixing for project ${project.id}`);
      
      // Get lip sync data
      const { getStore } = await import('@netlify/blobs');
      const blobStore = getStore('videos');
      const lipSyncKey = `lipsync_${project.id}`;
      const lipSync = await blobStore.get(lipSyncKey, { type: 'json' });
      
      if (!lipSync) {
        throw new Error('Lip sync results not found');
      }

      // Get original video
      const videoKey = project.files[0]?.path;
      const originalVideo = await blobStore.get(videoKey);
      
      if (!originalVideo) {
        throw new Error('Original video not found');
      }

      // Mix audio tracks
      const mixedAudio = await this.audioProcessingService.mixAudioTracks({
        originalAudio: originalVideo,
        dubbedAudio: lipSync.lipSyncSegments,
        outputFormat: 'mp4'
      });

      // Store mixed audio
      const mixedAudioKey = `mixed_audio_${project.id}`;
      await blobStore.set(mixedAudioKey, mixedAudio);

      console.log(`Audio mixing completed for project ${project.id}`);
    } catch (error) {
      console.error('Audio mixing failed:', error);
      throw error;
    }
  }

  /**
   * Finalize video with dubbed audio
   */
  private async finalizeVideo(project: DubbingProject): Promise<void> {
    try {
      console.log(`Starting video finalization for project ${project.id}`);
      
      // Get mixed audio
      const { getStore } = await import('@netlify/blobs');
      const blobStore = getStore('videos');
      const mixedAudioKey = `mixed_audio_${project.id}`;
      const mixedAudio = await blobStore.get(mixedAudioKey);
      
      if (!mixedAudio) {
        throw new Error('Mixed audio not found');
      }

      // Get original video
      const videoKey = project.files[0]?.path;
      const originalVideo = await blobStore.get(videoKey);
      
      if (!originalVideo) {
        throw new Error('Original video not found');
      }

      // Create final dubbed video
      const dubbedVideo = await this.audioProcessingService.createDubbedVideo({
        originalVideo,
        dubbedAudio: mixedAudio,
        outputFormat: 'mp4',
        quality: project.settings.qualityPreset
      });

      // Store final dubbed video
      const dubbedVideoKey = `dubbed_${project.id}`;
      await blobStore.set(dubbedVideoKey, dubbedVideo, {
        metadata: {
          originalName: project.files[0]?.filename,
          targetLanguage: project.targetLanguage,
          quality: project.settings.qualityPreset,
          completedAt: new Date().toISOString()
        }
      });

      // Generate subtitles
      const translationKey = `translation_${project.id}`;
      const translation = await blobStore.get(translationKey, { type: 'json' });
      
      if (translation && project.settings.subtitlesEnabled) {
        const subtitles = await this.generateSubtitles(translation.segments);
        const subtitlesKey = `subtitles_${project.id}`;
        await blobStore.set(subtitlesKey, JSON.stringify(subtitles));
      }

      console.log(`Video finalization completed for project ${project.id}`);
    } catch (error) {
      console.error('Video finalization failed:', error);
      throw error;
    }
  }

  /**
   * Generate subtitles from translated dialogue
   */
  private async generateSubtitles(segments: any[]): Promise<any> {
    return {
      format: 'srt',
      segments: segments.map((segment, index) => ({
        id: index + 1,
        startTime: segment.start,
        endTime: segment.end,
        text: segment.translatedText
      })),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get batch job status
   */
  getBatchJobStatus(jobId: string): APIResponse<BatchJobStatus> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return {
        success: false,
        error: 'Job not found',
        message: `Batch job ${jobId} not found`
      };
    }

    const projectStatuses = job.projects.map(projectId => {
      const project = this.loadProject(projectId);
      return project ? {
        id: projectId,
        name: project.name,
        status: project.status,
        progress: project.progress.percentage
      } : null;
    }).filter(Boolean);

    const overallProgress = projectStatuses.reduce((sum, status) => 
      sum + (status?.progress || 0), 0) / projectStatuses.length;

    const status: BatchJobStatus = {
      id: job.id,
      name: job.name,
      status: job.status,
      overallProgress,
      totalProjects: job.projects.length,
      completedProjects: projectStatuses.filter(s => s?.status === 'completed').length,
      failedProjects: projectStatuses.filter(s => s?.status === 'error').length,
      projects: projectStatuses as ProjectStatus[],
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      estimatedTimeRemaining: this.calculateEstimatedTime(job)
    };

    return {
      success: true,
      data: status,
      message: 'Job status retrieved successfully'
    };
  }

  /**
   * Get all active batch jobs
   */
  getAllBatchJobs(): APIResponse<BatchJobStatus[]> {
    const jobStatuses = Array.from(this.activeJobs.values()).map(job => {
      const statusResponse = this.getBatchJobStatus(job.id);
      return statusResponse.data;
    }).filter(Boolean) as BatchJobStatus[];

    return {
      success: true,
      data: jobStatuses,
      message: `Retrieved ${jobStatuses.length} batch jobs`
    };
  }

  /**
   * Cancel batch job
   */
  cancelBatchJob(jobId: string): APIResponse<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return {
        success: false,
        error: 'Job not found',
        message: `Batch job ${jobId} not found`
      };
    }

    if (job.status === 'completed') {
      return {
        success: false,
        error: 'Job already completed',
        message: 'Cannot cancel completed job'
      };
    }

    // Remove from queue if not yet processing
    const queueIndex = this.processingQueue.findIndex(j => j.id === jobId);
    if (queueIndex !== -1) {
      this.processingQueue.splice(queueIndex, 1);
    }

    job.status = 'error'; // Use 'error' status for cancelled jobs
    this.activeJobs.set(jobId, job);

    return {
      success: true,
      data: true,
      message: 'Batch job cancelled successfully'
    };
  }

  /**
   * Retry failed batch job
   */
  async retryBatchJob(jobId: string): Promise<APIResponse<boolean>> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return {
        success: false,
        error: 'Job not found',
        message: `Batch job ${jobId} not found`
      };
    }

    if (job.status !== 'error') {
      return {
        success: false,
        error: 'Job not in error state',
        message: 'Can only retry failed jobs'
      };
    }

    // Reset job status and add back to queue
    job.status = 'queued';
    delete job.completedAt;
    this.processingQueue.push(job);
    this.activeJobs.set(jobId, job);

    // Start processing
    this.processNextInQueue();

    return {
      success: true,
      data: true,
      message: 'Batch job queued for retry'
    };
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): ProcessingStats {
    const allJobs = Array.from(this.activeJobs.values());
    
    return {
      totalJobs: allJobs.length,
      queuedJobs: this.processingQueue.length,
      processingJobs: this.currentlyProcessing,
      completedJobs: allJobs.filter(j => j.status === 'completed').length,
      failedJobs: allJobs.filter(j => j.status === 'error').length,
      totalProjectsProcessed: allJobs.reduce((sum, job) => sum + job.projects.length, 0),
      averageProcessingTime: this.calculateAverageProcessingTime(allJobs),
      systemLoad: (this.currentlyProcessing / this.maxConcurrentJobs) * 100
    };
  }

  /**
   * Update job progress
   */
  private updateJobProgress(jobId: string, percentage: number, currentTask: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      // Job-level progress tracking would be implemented here
      console.log(`Job ${jobId}: ${percentage.toFixed(1)}% - ${currentTask}`);
    }
  }

  /**
   * Calculate estimated time remaining for job
   */
  private calculateEstimatedTime(job: BatchJob): number {
    if (job.status === 'completed') return 0;
    
    // Simple estimation based on average processing time
    const avgTimePerProject = 300; // 5 minutes per project (in seconds)
    const remainingProjects = job.projects.length;
    
    return remainingProjects * avgTimePerProject;
  }

  /**
   * Calculate average processing time across all jobs
   */
  private calculateAverageProcessingTime(jobs: BatchJob[]): number {
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.completedAt);
    if (completedJobs.length === 0) return 0;

    const totalTime = completedJobs.reduce((sum, job) => {
      const duration = job.completedAt!.getTime() - job.createdAt.getTime();
      return sum + duration;
    }, 0);

    return totalTime / completedJobs.length / 1000; // Convert to seconds
  }

  /**
   * Save project to storage (simplified - would use database in production)
   */
  private saveProject(project: DubbingProject): void {
    const projectsDir = path.join(process.cwd(), 'temp', 'projects');
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    const projectPath = path.join(projectsDir, `${project.id}.json`);
    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
  }

  /**
   * Load project from storage
   */
  private loadProject(projectId: string): DubbingProject | null {
    try {
      const projectPath = path.join(process.cwd(), 'temp', 'projects', `${projectId}.json`);
      const projectData = fs.readFileSync(projectPath, 'utf-8');
      return JSON.parse(projectData);
    } catch (error) {
      return null;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up completed jobs older than specified days
   */
  cleanupOldJobs(daysOld: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let cleanedCount = 0;
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.status === 'completed' && job.completedAt && job.completedAt < cutoffDate) {
        this.activeJobs.delete(jobId);
        
        // Clean up project files
        job.projects.forEach(projectId => {
          try {
            const projectPath = path.join(process.cwd(), 'temp', 'projects', `${projectId}.json`);
            if (fs.existsSync(projectPath)) {
              fs.unlinkSync(projectPath);
            }
          } catch (error) {
            console.error(`Failed to clean up project ${projectId}:`, error);
          }
        });
        
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Supporting interfaces
export interface BatchProjectFile {
  name: string;
  path: string;
  size: number;
  episodeNumber?: number;
  seasonNumber?: number;
}

export interface BatchJobStatus {
  id: string;
  name: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  overallProgress: number;
  totalProjects: number;
  completedProjects: number;
  failedProjects: number;
  projects: ProjectStatus[];
  createdAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining: number;
}

export interface ProjectStatus {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
}

export interface ProcessingStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalProjectsProcessed: number;
  averageProcessingTime: number;
  systemLoad: number;
}