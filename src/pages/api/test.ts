import type { APIRoute } from 'astro';
import { TranslationService } from '../../services/TranslationService';
import { VoiceSynthesisService } from '../../services/VoiceSynthesisService';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // Test translation service
    const translationService = new TranslationService(
      process.env.GOOGLE_API_KEY || '',
      process.env.OPENAI_API_KEY || ''
    );

    const translationResult = await translationService.translateDialogue({
      text: "こんにちは！今日はいい天気ですね。",
      sourceLanguage: 'ja',
      targetLanguage: 'en',
      context: 'anime_dialogue',
      characterName: 'test_character',
      emotion: 'happy'
    });

    // Test voice synthesis service
    const voiceSynthesisService = new VoiceSynthesisService(
      process.env.OPENAI_API_KEY || '',
      process.env.ELEVENLABS_API_KEY || ''
    );

    const voiceResult = await voiceSynthesisService.synthesizeVoice({
      text: "Hello! The weather is nice today.",
      voiceId: 'male_young_energetic',
      emotion: 'happy',
      intensity: 'medium',
      speed: 1.0,
      pitch: 1.0
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        translation: translationResult,
        voiceSynthesis: voiceResult,
        services: {
          translation: translationResult.success ? 'working' : 'failed',
          voiceSynthesis: voiceResult.success ? 'working' : 'failed'
        }
      },
      message: 'AI services test completed'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      message: 'AI services test failed'
    }), { status: 500 });
  }
};