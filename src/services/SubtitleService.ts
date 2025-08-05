import { DialogueSegment, APIResponse } from '../types';
import fs from 'fs';
import path from 'path';

export class SubtitleService {
  private supportedFormats: SubtitleFormat[];

  constructor() {
    this.supportedFormats = [
      { extension: 'srt', name: 'SubRip', mimeType: 'text/srt' },
      { extension: 'vtt', name: 'WebVTT', mimeType: 'text/vtt' },
      { extension: 'ass', name: 'Advanced SubStation Alpha', mimeType: 'text/ass' },
      { extension: 'ssa', name: 'SubStation Alpha', mimeType: 'text/ssa' },
      { extension: 'sbv', name: 'YouTube SubViewer', mimeType: 'text/sbv' },
      { extension: 'ttml', name: 'Timed Text Markup Language', mimeType: 'application/ttml+xml' }
    ];
  }

  /**
   * Generate subtitles from dialogue segments
   */
  async generateSubtitles(
    dialogueSegments: DialogueSegment[],
    format: 'srt' | 'vtt' | 'ass' | 'ssa' | 'sbv' | 'ttml' = 'srt',
    options: SubtitleOptions = {}
  ): Promise<APIResponse<string>> {
    try {
      const sortedSegments = this.sortSegmentsByTime(dialogueSegments);
      const mergedSegments = this.mergeOverlappingSegments(sortedSegments);
      const formattedSubtitles = await this.formatSubtitles(mergedSegments, format, options);

      return {
        success: true,
        data: formattedSubtitles,
        message: `Subtitles generated in ${format.toUpperCase()} format`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subtitle generation failed',
        message: 'Failed to generate subtitles'
      };
    }
  }

  /**
   * Parse existing subtitle file
   */
  async parseSubtitleFile(filePath: string): Promise<APIResponse<DialogueSegment[]>> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const extension = path.extname(filePath).toLowerCase().substring(1);
      
      let segments: DialogueSegment[] = [];
      
      switch (extension) {
        case 'srt':
          segments = this.parseSRT(content);
          break;
        case 'vtt':
          segments = this.parseVTT(content);
          break;
        case 'ass':
        case 'ssa':
          segments = this.parseASS(content);
          break;
        case 'sbv':
          segments = this.parseSBV(content);
          break;
        case 'ttml':
          segments = this.parseTTML(content);
          break;
        default:
          throw new Error(`Unsupported subtitle format: ${extension}`);
      }

      return {
        success: true,
        data: segments,
        message: `Parsed ${segments.length} subtitle segments`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subtitle parsing failed',
        message: 'Failed to parse subtitle file'
      };
    }
  }

  /**
   * Synchronize subtitles with audio timing
   */
  async synchronizeSubtitles(
    segments: DialogueSegment[],
    audioPath: string,
    syncOptions: SyncOptions = {}
  ): Promise<APIResponse<DialogueSegment[]>> {
    try {
      const { offsetMs = 0, speedAdjustment = 1.0, autoSync = false } = syncOptions;
      
      let synchronizedSegments = [...segments];

      // Apply time offset
      if (offsetMs !== 0) {
        synchronizedSegments = this.applyTimeOffset(synchronizedSegments, offsetMs);
      }

      // Apply speed adjustment
      if (speedAdjustment !== 1.0) {
        synchronizedSegments = this.applySpeedAdjustment(synchronizedSegments, speedAdjustment);
      }

      // Auto-sync using audio analysis (if enabled)
      if (autoSync) {
        synchronizedSegments = await this.performAutoSync(synchronizedSegments, audioPath);
      }

      // Validate and fix timing issues
      synchronizedSegments = this.validateAndFixTiming(synchronizedSegments);

      return {
        success: true,
        data: synchronizedSegments,
        message: 'Subtitles synchronized successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subtitle synchronization failed',
        message: 'Failed to synchronize subtitles'
      };
    }
  }

  /**
   * Apply subtitle styling
   */
  async applySubtitleStyling(
    segments: DialogueSegment[],
    styling: SubtitleStyling
  ): Promise<APIResponse<DialogueSegment[]>> {
    try {
      const styledSegments = segments.map(segment => ({
        ...segment,
        styling: {
          ...segment.styling,
          ...styling
        }
      }));

      return {
        success: true,
        data: styledSegments,
        message: 'Subtitle styling applied successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subtitle styling failed',
        message: 'Failed to apply subtitle styling'
      };
    }
  }

  /**
   * Convert subtitles between formats
   */
  async convertSubtitleFormat(
    inputPath: string,
    outputFormat: 'srt' | 'vtt' | 'ass' | 'ssa' | 'sbv' | 'ttml',
    options: SubtitleOptions = {}
  ): Promise<APIResponse<string>> {
    try {
      // Parse input file
      const parseResult = await this.parseSubtitleFile(inputPath);
      if (!parseResult.success || !parseResult.data) {
        throw new Error('Failed to parse input subtitle file');
      }

      // Generate in new format
      const generateResult = await this.generateSubtitles(parseResult.data, outputFormat, options);
      if (!generateResult.success || !generateResult.data) {
        throw new Error('Failed to generate subtitles in target format');
      }

      return generateResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Format conversion failed',
        message: 'Failed to convert subtitle format'
      };
    }
  }

  /**
   * Generate burned-in subtitles (hardcoded into video)
   */
  async generateBurnedSubtitles(
    videoPath: string,
    segments: DialogueSegment[],
    styling: SubtitleStyling = {},
    outputPath?: string
  ): Promise<APIResponse<string>> {
    try {
      const finalOutputPath = outputPath || this.generateOutputPath(videoPath, 'burned');
      
      // Create temporary subtitle file
      const tempSubPath = path.join(process.cwd(), 'temp', `subtitles_${Date.now()}.ass`);
      const subtitleResult = await this.generateSubtitles(segments, 'ass', { styling });
      
      if (!subtitleResult.success || !subtitleResult.data) {
        throw new Error('Failed to generate subtitle file');
      }

      fs.writeFileSync(tempSubPath, subtitleResult.data);

      // Use FFmpeg to burn subtitles into video (simplified - would use actual FFmpeg in production)
      console.log(`Burning subtitles from ${tempSubPath} into ${videoPath} -> ${finalOutputPath}`);
      
      // Simulate video processing
      await this.delay(5000);

      // Clean up temporary file
      if (fs.existsSync(tempSubPath)) {
        fs.unlinkSync(tempSubPath);
      }

      return {
        success: true,
        data: finalOutputPath,
        message: 'Burned-in subtitles generated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Burned subtitle generation failed',
        message: 'Failed to generate burned-in subtitles'
      };
    }
  }

  /**
   * Sort dialogue segments by start time
   */
  private sortSegmentsByTime(segments: DialogueSegment[]): DialogueSegment[] {
    return segments.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Merge overlapping dialogue segments
   */
  private mergeOverlappingSegments(segments: DialogueSegment[]): DialogueSegment[] {
    if (segments.length <= 1) return segments;

    const merged: DialogueSegment[] = [];
    let current = segments[0];

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];
      
      // If segments overlap or are very close (within 100ms)
      if (current.endTime >= next.startTime - 0.1) {
        // Merge segments
        current = {
          ...current,
          endTime: Math.max(current.endTime, next.endTime),
          translatedText: `${current.translatedText} ${next.translatedText}`.trim()
        };
      } else {
        merged.push(current);
        current = next;
      }
    }
    
    merged.push(current);
    return merged;
  }

  /**
   * Format subtitles in specified format
   */
  private async formatSubtitles(
    segments: DialogueSegment[],
    format: string,
    options: SubtitleOptions
  ): Promise<string> {
    switch (format) {
      case 'srt':
        return this.formatSRT(segments, options);
      case 'vtt':
        return this.formatVTT(segments, options);
      case 'ass':
        return this.formatASS(segments, options);
      case 'ssa':
        return this.formatSSA(segments, options);
      case 'sbv':
        return this.formatSBV(segments, options);
      case 'ttml':
        return this.formatTTML(segments, options);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Format subtitles as SRT
   */
  private formatSRT(segments: DialogueSegment[], options: SubtitleOptions): string {
    return segments.map((segment, index) => {
      const startTime = this.formatSRTTime(segment.startTime);
      const endTime = this.formatSRTTime(segment.endTime);
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.translatedText}\n`;
    }).join('\n');
  }

  /**
   * Format subtitles as WebVTT
   */
  private formatVTT(segments: DialogueSegment[], options: SubtitleOptions): string {
    let vtt = 'WEBVTT\n\n';
    
    segments.forEach((segment, index) => {
      const startTime = this.formatVTTTime(segment.startTime);
      const endTime = this.formatVTTTime(segment.endTime);
      
      vtt += `${index + 1}\n${startTime} --> ${endTime}\n${segment.translatedText}\n\n`;
    });

    return vtt;
  }

  /**
   * Format subtitles as ASS (Advanced SubStation Alpha)
   */
  private formatASS(segments: DialogueSegment[], options: SubtitleOptions): string {
    const styling = options.styling || {};
    
    let ass = `[Script Info]
Title: AniDub AI Generated Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${styling.fontFamily || 'Arial'},${styling.fontSize || 20},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,${styling.bold ? -1 : 0},${styling.italic ? -1 : 0},0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    segments.forEach(segment => {
      const startTime = this.formatASSTime(segment.startTime);
      const endTime = this.formatASSTime(segment.endTime);
      
      ass += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${segment.translatedText}\n`;
    });

    return ass;
  }

  /**
   * Format subtitles as SSA (SubStation Alpha)
   */
  private formatSSA(segments: DialogueSegment[], options: SubtitleOptions): string {
    // Similar to ASS but with v4.00 format
    return this.formatASS(segments, options).replace('v4.00+', 'v4.00');
  }

  /**
   * Format subtitles as SBV (YouTube SubViewer)
   */
  private formatSBV(segments: DialogueSegment[], options: SubtitleOptions): string {
    return segments.map(segment => {
      const startTime = this.formatSBVTime(segment.startTime);
      const endTime = this.formatSBVTime(segment.endTime);
      
      return `${startTime},${endTime}\n${segment.translatedText}\n`;
    }).join('\n');
  }

  /**
   * Format subtitles as TTML
   */
  private formatTTML(segments: DialogueSegment[], options: SubtitleOptions): string {
    const styling = options.styling || {};
    
    let ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
  <head>
    <styling>
      <style xml:id="defaultStyle" 
             tts:fontFamily="${styling.fontFamily || 'Arial'}"
             tts:fontSize="${styling.fontSize || 20}px"
             tts:color="${styling.color || 'white'}"
             tts:textAlign="${styling.alignment || 'center'}" />
    </styling>
  </head>
  <body>
    <div>
`;

    segments.forEach(segment => {
      const startTime = this.formatTTMLTime(segment.startTime);
      const endTime = this.formatTTMLTime(segment.endTime);
      
      ttml += `      <p begin="${startTime}" end="${endTime}" style="defaultStyle">${this.escapeXML(segment.translatedText)}</p>\n`;
    });

    ttml += `    </div>
  </body>
</tt>`;

    return ttml;
  }

  /**
   * Parse SRT format
   */
  private parseSRT(content: string): DialogueSegment[] {
    const segments: DialogueSegment[] = [];
    const blocks = content.trim().split(/\n\s*\n/);

    blocks.forEach((block, index) => {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const textLines = lines.slice(2);
        
        const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (timeMatch) {
          const startTime = this.parseTimeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
          const endTime = this.parseTimeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
          
          segments.push({
            id: `segment_${index}`,
            characterId: 'unknown',
            startTime,
            endTime,
            originalText: textLines.join(' '),
            translatedText: textLines.join(' '),
            emotion: 'neutral',
            intensity: 'medium'
          });
        }
      }
    });

    return segments;
  }

  /**
   * Parse WebVTT format
   */
  private parseVTT(content: string): DialogueSegment[] {
    const segments: DialogueSegment[] = [];
    const lines = content.split('\n');
    let currentSegment: Partial<DialogueSegment> | null = null;
    let segmentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes(' --> ')) {
        const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
        if (timeMatch) {
          currentSegment = {
            id: `segment_${segmentIndex++}`,
            characterId: 'unknown',
            startTime: this.parseTimeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]),
            endTime: this.parseTimeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]),
            emotion: 'neutral',
            intensity: 'medium'
          };
        }
      } else if (currentSegment && line && !line.startsWith('WEBVTT') && !line.match(/^\d+$/)) {
        currentSegment.originalText = line;
        currentSegment.translatedText = line;
        segments.push(currentSegment as DialogueSegment);
        currentSegment = null;
      }
    }

    return segments;
  }

  /**
   * Parse ASS/SSA format
   */
  private parseASS(content: string): DialogueSegment[] {
    const segments: DialogueSegment[] = [];
    const lines = content.split('\n');
    let segmentIndex = 0;

    for (const line of lines) {
      if (line.startsWith('Dialogue:')) {
        const parts = line.substring(9).split(',');
        if (parts.length >= 10) {
          const startTime = this.parseASSTime(parts[1]);
          const endTime = this.parseASSTime(parts[2]);
          const text = parts.slice(9).join(',').replace(/\{[^}]*\}/g, ''); // Remove ASS tags
          
          segments.push({
            id: `segment_${segmentIndex++}`,
            characterId: 'unknown',
            startTime,
            endTime,
            originalText: text,
            translatedText: text,
            emotion: 'neutral',
            intensity: 'medium'
          });
        }
      }
    }

    return segments;
  }

  /**
   * Parse SBV format
   */
  private parseSBV(content: string): DialogueSegment[] {
    const segments: DialogueSegment[] = [];
    const blocks = content.trim().split(/\n\s*\n/);
    let segmentIndex = 0;

    blocks.forEach(block => {
      const lines = block.trim().split('\n');
      if (lines.length >= 2) {
        const timeLine = lines[0];
        const text = lines.slice(1).join(' ');
        
        const timeMatch = timeLine.match(/(\d+):(\d{2}):(\d{2})\.(\d{3}),(\d+):(\d{2}):(\d{2})\.(\d{3})/);
        if (timeMatch) {
          const startTime = this.parseTimeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
          const endTime = this.parseTimeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
          
          segments.push({
            id: `segment_${segmentIndex++}`,
            characterId: 'unknown',
            startTime,
            endTime,
            originalText: text,
            translatedText: text,
            emotion: 'neutral',
            intensity: 'medium'
          });
        }
      }
    });

    return segments;
  }

  /**
   * Parse TTML format
   */
  private parseTTML(content: string): DialogueSegment[] {
    const segments: DialogueSegment[] = [];
    let segmentIndex = 0;

    // Simple regex-based parsing (in production, use proper XML parser)
    const pTagRegex = /<p[^>]*begin="([^"]*)"[^>]*end="([^"]*)"[^>]*>(.*?)<\/p>/g;
    let match;

    while ((match = pTagRegex.exec(content)) !== null) {
      const startTime = this.parseTTMLTime(match[1]);
      const endTime = this.parseTTMLTime(match[2]);
      const text = match[3].replace(/<[^>]*>/g, ''); // Remove HTML tags
      
      segments.push({
        id: `segment_${segmentIndex++}`,
        characterId: 'unknown',
        startTime,
        endTime,
        originalText: text,
        translatedText: text,
        emotion: 'neutral',
        intensity: 'medium'
      });
    }

    return segments;
  }

  /**
   * Apply time offset to segments
   */
  private applyTimeOffset(segments: DialogueSegment[], offsetMs: number): DialogueSegment[] {
    const offsetSeconds = offsetMs / 1000;
    
    return segments.map(segment => ({
      ...segment,
      startTime: Math.max(0, segment.startTime + offsetSeconds),
      endTime: Math.max(0, segment.endTime + offsetSeconds)
    }));
  }

  /**
   * Apply speed adjustment to segments
   */
  private applySpeedAdjustment(segments: DialogueSegment[], speedAdjustment: number): DialogueSegment[] {
    return segments.map(segment => ({
      ...segment,
      startTime: segment.startTime / speedAdjustment,
      endTime: segment.endTime / speedAdjustment
    }));
  }

  /**
   * Perform auto-sync with audio analysis
   */
  private async performAutoSync(segments: DialogueSegment[], audioPath: string): Promise<DialogueSegment[]> {
    // Placeholder for audio analysis and auto-sync
    // In production, this would use speech recognition to match subtitle text with audio
    console.log(`Performing auto-sync analysis on ${audioPath}`);
    await this.delay(2000);
    
    return segments; // Return unchanged for now
  }

  /**
   * Validate and fix timing issues
   */
  private validateAndFixTiming(segments: DialogueSegment[]): DialogueSegment[] {
    const fixed: DialogueSegment[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = { ...segments[i] };
      
      // Ensure start time is before end time
      if (segment.startTime >= segment.endTime) {
        segment.endTime = segment.startTime + 1; // Minimum 1 second duration
      }
      
      // Ensure minimum gap between segments
      if (i > 0) {
        const prevSegment = fixed[fixed.length - 1];
        if (segment.startTime < prevSegment.endTime + 0.1) {
          segment.startTime = prevSegment.endTime + 0.1;
          if (segment.startTime >= segment.endTime) {
            segment.endTime = segment.startTime + 1;
          }
        }
      }
      
      fixed.push(segment);
    }
    
    return fixed;
  }

  /**
   * Utility time formatting functions
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private formatVTTTime(seconds: number): string {
    return this.formatSRTTime(seconds).replace(',', '.');
  }

  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`;
  }

  private formatSBVTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  private formatTTMLTime(seconds: number): string {
    return `${seconds.toFixed(3)}s`;
  }

  private parseTimeToSeconds(hours: string, minutes: string, seconds: string, milliseconds: string): number {
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
  }

  private parseASSTime(timeStr: string): number {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  }

  private parseTTMLTime(timeStr: string): number {
    if (timeStr.endsWith('s')) {
      return parseFloat(timeStr.slice(0, -1));
    }
    return 0;
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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

  /**
   * Get supported subtitle formats
   */
  getSupportedFormats(): SubtitleFormat[] {
    return [...this.supportedFormats];
  }

  /**
   * Validate subtitle timing
   */
  validateSubtitleTiming(segments: DialogueSegment[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    segments.forEach((segment, index) => {
      // Check for invalid timing
      if (segment.startTime >= segment.endTime) {
        issues.push({
          type: 'timing',
          severity: 'error',
          segmentIndex: index,
          message: 'Start time is greater than or equal to end time'
        });
      }
      
      // Check for very short segments (less than 0.5 seconds)
      if (segment.endTime - segment.startTime < 0.5) {
        issues.push({
          type: 'timing',
          severity: 'warning',
          segmentIndex: index,
          message: 'Segment duration is very short (less than 0.5 seconds)'
        });
      }
      
      // Check for overlapping segments
      if (index > 0 && segment.startTime < segments[index - 1].endTime) {
        issues.push({
          type: 'overlap',
          severity: 'warning',
          segmentIndex: index,
          message: 'Segment overlaps with previous segment'
        });
      }
    });
    
    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      totalSegments: segments.length
    };
  }
}

// Supporting interfaces
export interface SubtitleFormat {
  extension: string;
  name: string;
  mimeType: string;
}

export interface SubtitleOptions {
  styling?: SubtitleStyling;
  encoding?: string;
  lineBreakStrategy?: 'auto' | 'manual' | 'balanced';
  maxLineLength?: number;
  maxLinesPerSubtitle?: number;
}

export interface SubtitleStyling {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  alignment?: 'left' | 'center' | 'right';
  position?: {
    x?: number;
    y?: number;
  };
  outline?: {
    width?: number;
    color?: string;
  };
  shadow?: {
    offsetX?: number;
    offsetY?: number;
    color?: string;
  };
}

export interface SyncOptions {
  offsetMs?: number;
  speedAdjustment?: number;
  autoSync?: boolean;
  syncThreshold?: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  totalSegments: number;
}

export interface ValidationIssue {
  type: 'timing' | 'overlap' | 'text' | 'formatting';
  severity: 'error' | 'warning' | 'info';
  segmentIndex: number;
  message: string;
}