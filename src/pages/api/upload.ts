import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';
import formidable from 'formidable';
import { BatchProcessingService } from '../../services/BatchProcessingService';
import { TranslationService } from '../../services/TranslationService';
import { VoiceSynthesisService } from '../../services/VoiceSynthesisService';
import { LipSyncService } from '../../services/LipSyncService';
import { AudioProcessingService } from '../../services/AudioProcessingService';
import { DubbingSettings, APIResponse } from '../../types';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const form = formidable({
      maxFileSize: 500 * 1024 * 1024, // 500MB limit
      allowEmptyFiles: false,
      filter: (part) => {
        return part.mimetype?.includes('video/') || false;
      }
    });

    const [fields, files] = await form.parse(context.request);
    
    if (!files.video || !Array.isArray(files.video) || files.video.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No video file provided'
      }), { status: 400 });
    }

    const videoFile = files.video[0];
    const settings: DubbingSettings = {
      targetLanguage: fields.targetLanguage?.[0] || 'en',
      voiceStyle: (fields.voiceStyle?.[0] as any) || 'standard',
      emotionIntensity: (fields.emotionIntensity?.[0] as any) || 'medium',
      lipSyncAccuracy: (fields.lipSyncAccuracy?.[0] as any) || 'high',
      subtitlesEnabled: fields.subtitlesEnabled?.[0] === 'true',
      regionalAccent: (fields.regionalAccent?.[0] as any) || 'us_english',
      qualityPreset: (fields.qualityPreset?.[0] as any) || 'balanced'
    };

    // Store video file in blob storage
    const blobStore = getStore('videos');
    const videoKey = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const videoBuffer = await fs.promises.readFile(videoFile.filepath);
    await blobStore.set(videoKey, videoBuffer, {
      metadata: {
        filename: videoFile.originalFilename || 'uploaded_video',
        size: videoFile.size,
        mimetype: videoFile.mimetype,
        uploadedAt: new Date().toISOString()
      }
    });

    // Initialize services
    const translationService = new TranslationService(
      process.env.GOOGLE_API_KEY || '',
      process.env.OPENAI_API_KEY || ''
    );
    
    const voiceSynthesisService = new VoiceSynthesisService(
      process.env.OPENAI_API_KEY || '',
      process.env.ELEVENLABS_API_KEY || ''
    );
    
    const lipSyncService = new LipSyncService();
    const audioProcessingService = new AudioProcessingService();
    
    const batchProcessingService = new BatchProcessingService(
      translationService,
      voiceSynthesisService,
      lipSyncService,
      audioProcessingService
    );

    // Create batch job for automatic processing
    const batchJob = await batchProcessingService.createBatchJob(
      `Auto-Dub_${videoFile.originalFilename}`,
      [{
        name: videoFile.originalFilename || 'uploaded_video',
        path: videoKey,
        size: videoFile.size
      }],
      settings
    );

    // Clean up temporary file
    await fs.promises.unlink(videoFile.filepath);

    return new Response(JSON.stringify({
      success: true,
      data: {
        jobId: batchJob.data,
        videoKey,
        settings
      },
      message: 'Video uploaded and processing started'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }), { status: 500 });
  }
};

export const GET: APIRoute = async (context) => {
  const urlParams = new URL(context.url);
  const jobId = urlParams.searchParams.get('jobId');
  
  if (!jobId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Job ID required'
    }), { status: 400 });
  }

  try {
    // Initialize services
    const translationService = new TranslationService(
      process.env.GOOGLE_API_KEY || '',
      process.env.OPENAI_API_KEY || ''
    );
    
    const voiceSynthesisService = new VoiceSynthesisService(
      process.env.OPENAI_API_KEY || '',
      process.env.ELEVENLABS_API_KEY || ''
    );
    
    const lipSyncService = new LipSyncService();
    const audioProcessingService = new AudioProcessingService();
    
    const batchProcessingService = new BatchProcessingService(
      translationService,
      voiceSynthesisService,
      lipSyncService,
      audioProcessingService
    );

    const status = batchProcessingService.getBatchJobStatus(jobId);
    
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get job status'
    }), { status: 500 });
  }
};