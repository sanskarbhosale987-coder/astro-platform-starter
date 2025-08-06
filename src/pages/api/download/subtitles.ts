import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const urlParams = new URL(context.url);
  const jobId = urlParams.searchParams.get('jobId');
  const format = urlParams.searchParams.get('format') || 'srt';
  
  if (!jobId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Job ID required'
    }), { status: 400 });
  }

  try {
    const blobStore = getStore('videos');
    
    // Get subtitles
    const subtitleKey = `subtitles_${jobId}`;
    const subtitles = await blobStore.get(subtitleKey, { type: 'json' });
    
    if (!subtitles) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Subtitles not found'
      }), { status: 404 });
    }

    // Get project metadata
    const projectKey = `project_${jobId}`;
    const projectMetadata = await blobStore.get(projectKey, { type: 'json' });
    
    // Generate filename
    const originalName = projectMetadata?.name || 'anime_episode';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${originalName}_subtitles_${timestamp}.${format}`;

    // Convert subtitles to requested format
    const subtitleContent = convertSubtitlesToFormat(subtitles, format);

    // Set appropriate headers for download
    const headers = new Headers();
    headers.set('Content-Type', getContentType(format));
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', subtitleContent.length.toString());

    return new Response(subtitleContent, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Subtitle download error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Subtitle download failed'
    }), { status: 500 });
  }
};

/**
 * Convert subtitles to the requested format
 */
function convertSubtitlesToFormat(subtitles: any, format: string): string {
  switch (format.toLowerCase()) {
    case 'srt':
      return convertToSRT(subtitles);
    case 'vtt':
      return convertToVTT(subtitles);
    case 'ass':
      return convertToASS(subtitles);
    case 'json':
      return JSON.stringify(subtitles, null, 2);
    default:
      return convertToSRT(subtitles);
  }
}

/**
 * Convert to SRT format
 */
function convertToSRT(subtitles: any): string {
  let srtContent = '';
  
  subtitles.segments.forEach((segment: any, index: number) => {
    const startTime = formatTime(segment.startTime);
    const endTime = formatTime(segment.endTime);
    
    srtContent += `${index + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${segment.translatedText}\n\n`;
  });
  
  return srtContent;
}

/**
 * Convert to VTT format
 */
function convertToVTT(subtitles: any): string {
  let vttContent = 'WEBVTT\n\n';
  
  subtitles.segments.forEach((segment: any, index: number) => {
    const startTime = formatTimeVTT(segment.startTime);
    const endTime = formatTimeVTT(segment.endTime);
    
    vttContent += `${index + 1}\n`;
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${segment.translatedText}\n\n`;
  });
  
  return vttContent;
}

/**
 * Convert to ASS format
 */
function convertToASS(subtitles: any): string {
  let assContent = '[Script Info]\n';
  assContent += 'Title: Anime Dubbing Subtitles\n';
  assContent += 'ScriptType: v4.00+\n';
  assContent += 'WrapStyle: 1\n';
  assContent += 'ScaledBorderAndShadow: yes\n';
  assContent += 'YCbCr Matrix: TV.601\n\n';
  
  assContent += '[V4+ Styles]\n';
  assContent += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
  assContent += 'Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1\n\n';
  
  assContent += '[Events]\n';
  assContent += 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
  
  subtitles.segments.forEach((segment: any) => {
    const startTime = formatTimeASS(segment.startTime);
    const endTime = formatTimeASS(segment.endTime);
    const text = segment.translatedText.replace(/\n/g, '\\N');
    
    assContent += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}\n`;
  });
  
  return assContent;
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Format time for VTT (HH:MM:SS.mmm)
 */
function formatTimeVTT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Format time for ASS (H:MM:SS.cc)
 */
function formatTimeASS(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

/**
 * Get content type for the format
 */
function getContentType(format: string): string {
  switch (format.toLowerCase()) {
    case 'srt':
      return 'text/plain';
    case 'vtt':
      return 'text/vtt';
    case 'ass':
      return 'text/plain';
    case 'json':
      return 'application/json';
    default:
      return 'text/plain';
  }
}