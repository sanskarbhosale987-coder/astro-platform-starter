import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const urlParams = new URL(context.url);
  const jobId = urlParams.searchParams.get('jobId');
  const format = urlParams.searchParams.get('format') || 'mp4';
  
  if (!jobId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Job ID required'
    }), { status: 400 });
  }

  try {
    const blobStore = getStore('videos');
    
    // Get the final dubbed video
    const dubbedVideoKey = `dubbed_${jobId}`;
    const dubbedVideo = await blobStore.get(dubbedVideoKey);
    
    if (!dubbedVideo) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Dubbed video not found. Processing may still be in progress.'
      }), { status: 404 });
    }

    // Get project metadata
    const projectKey = `project_${jobId}`;
    const projectMetadata = await blobStore.get(projectKey, { type: 'json' });
    
    // Get quality report
    const qualityKey = `quality_${jobId}`;
    const qualityReport = await blobStore.get(qualityKey, { type: 'json' });

    // Generate filename
    const originalName = projectMetadata?.name || 'anime_episode';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${originalName}_dubbed_${timestamp}.${format}`;

    // Set appropriate headers for download
    const headers = new Headers();
    headers.set('Content-Type', `video/${format}`);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', dubbedVideo.length.toString());
    
    // Add metadata headers
    if (qualityReport) {
      headers.set('X-Quality-Score', qualityReport.overallScore.toString());
      headers.set('X-Processing-Status', qualityReport.passed ? 'passed' : 'needs_review');
    }

    return new Response(dubbedVideo, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Download error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    }), { status: 500 });
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { jobId, includeSubtitles = true, format = 'mp4', quality = 'high' } = body;

    if (!jobId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Job ID required'
      }), { status: 400 });
    }

    const blobStore = getStore('videos');
    
    // Check if processing is complete
    const dubbedVideoKey = `dubbed_${jobId}`;
    const dubbedVideo = await blobStore.get(dubbedVideoKey);
    
    if (!dubbedVideo) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Dubbed video not found. Processing may still be in progress.',
        data: {
          status: 'processing',
          estimatedTimeRemaining: '10-15 minutes'
        }
      }), { status: 202 });
    }

    // Get project metadata
    const projectKey = `project_${jobId}`;
    const projectMetadata = await blobStore.get(projectKey, { type: 'json' });
    
    // Get quality report
    const qualityKey = `quality_${jobId}`;
    const qualityReport = await blobStore.get(qualityKey, { type: 'json' });

    // Generate download URL
    const downloadUrl = `/api/download?jobId=${jobId}&format=${format}`;
    
    // Generate subtitle URL if requested
    let subtitleUrl = null;
    if (includeSubtitles) {
      const subtitleKey = `subtitles_${jobId}`;
      const subtitles = await blobStore.get(subtitleKey, { type: 'json' });
      if (subtitles) {
        subtitleUrl = `/api/download/subtitles?jobId=${jobId}`;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        downloadUrl,
        subtitleUrl,
        filename: `${projectMetadata?.name || 'anime_episode'}_dubbed.${format}`,
        fileSize: dubbedVideo.length,
        quality: qualityReport?.overallScore || 0,
        passedQualityCheck: qualityReport?.passed || false,
        processingCompleted: true,
        metadata: {
          originalName: projectMetadata?.name,
          targetLanguage: projectMetadata?.settings?.targetLanguage,
          voiceStyle: projectMetadata?.settings?.voiceStyle,
          subtitlesEnabled: projectMetadata?.settings?.subtitlesEnabled
        }
      },
      message: 'Download ready'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Download preparation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare download'
    }), { status: 500 });
  }
};