// Core AniDub AI Types and Interfaces

export interface DubbingProject {
  id: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  settings: DubbingSettings;
  files: MediaFile[];
  progress: ProcessingProgress;
}

export interface MediaFile {
  id: string;
  filename: string;
  type: 'video' | 'audio' | 'subtitle';
  size: number;
  duration?: number;
  path: string;
  uploadedAt: Date;
}

export interface DubbingSettings {
  targetLanguage: string;
  voiceStyle: VoiceStyle;
  emotionIntensity: EmotionLevel;
  lipSyncAccuracy: LipSyncAccuracy;
  subtitlesEnabled: boolean;
  regionalAccent?: RegionalAccent;
  customVoices?: CustomVoice[];
  qualityPreset: QualityPreset;
}

export interface Character {
  id: string;
  name: string;
  voiceId: string;
  voiceStyle: VoiceStyle;
  gender: 'male' | 'female' | 'other';
  age: 'child' | 'teen' | 'adult' | 'elderly';
  personality: string[];
  originalVoiceActor?: string;
}

export interface DialogueSegment {
  id: string;
  characterId: string;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText: string;
  emotion: EmotionType;
  intensity: EmotionLevel;
  audioPath?: string;
  lipSyncData?: LipSyncData;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
  characterName?: string;
  emotion?: EmotionType;
}

export interface VoiceSynthesisRequest {
  text: string;
  voiceId: string;
  emotion: EmotionType;
  intensity: EmotionLevel;
  speed: number;
  pitch: number;
}

export interface LipSyncData {
  phonemes: Phoneme[];
  mouthShapes: MouthShape[];
  timing: number[];
}

export interface ProcessingProgress {
  stage: ProcessingStage;
  percentage: number;
  currentTask: string;
  estimatedTimeRemaining: number;
  errors: ProcessingError[];
}

// Enums and Union Types
export type ProjectStatus = 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
export type ProcessingStage = 'upload' | 'analysis' | 'translation' | 'voice_synthesis' | 'lip_sync' | 'audio_mixing' | 'finalization';
export type VoiceStyle = 'standard' | 'energetic' | 'calm' | 'deep' | 'cute' | 'mature' | 'custom';
export type EmotionLevel = 'low' | 'medium' | 'high' | 'ultra';
export type LipSyncAccuracy = 'standard' | 'high' | 'ultra';
export type QualityPreset = 'fast' | 'balanced' | 'high_quality';
export type RegionalAccent = 'us_english' | 'uk_english' | 'australian_english' | 'indian_english' | 'canadian_english';
export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'surprised' | 'scared' | 'disgusted' | 'crying' | 'shouting' | 'whispering';

export interface Phoneme {
  sound: string;
  startTime: number;
  endTime: number;
}

export interface MouthShape {
  shape: string;
  timestamp: number;
  intensity: number;
}

export interface CustomVoice {
  id: string;
  name: string;
  characterId: string;
  audioSamples: string[];
  trained: boolean;
}

export interface ProcessingError {
  code: string;
  message: string;
  timestamp: Date;
  severity: 'warning' | 'error' | 'critical';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BatchJob {
  id: string;
  name: string;
  projects: string[];
  status: 'queued' | 'processing' | 'completed' | 'error';
  createdAt: Date;
  completedAt?: Date;
}

// Language Support
export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  voicesAvailable: number;
  accents: RegionalAccent[];
}

// Audio Processing
export interface AudioConfig {
  sampleRate: number;
  bitRate: number;
  channels: number;
  format: 'wav' | 'mp3' | 'aac';
}

// Video Processing
export interface VideoConfig {
  resolution: string;
  frameRate: number;
  codec: string;
  bitRate: number;
}
