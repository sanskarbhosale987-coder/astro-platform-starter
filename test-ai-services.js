#!/usr/bin/env node

// Test script to verify AI services are working
import { TranslationService } from './src/services/TranslationService.js';
import { VoiceSynthesisService } from './src/services/VoiceSynthesisService.js';
import fs from 'fs';

async function testAIServices() {
  console.log('🧪 Testing AI Services...\n');

  // Check environment variables
  const openaiKey = process.env.OPENAI_API_KEY;
  const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;

  console.log('📋 Environment Variables:');
  console.log(`OpenAI API Key: ${openaiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`ElevenLabs API Key: ${elevenlabsKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`Google API Key: ${googleKey ? '✅ Set' : '❌ Missing'}\n`);

  if (!openaiKey) {
    console.error('❌ OpenAI API key is required for translation');
    process.exit(1);
  }

  if (!elevenlabsKey) {
    console.error('❌ ElevenLabs API key is required for voice synthesis');
    process.exit(1);
  }

  // Test Translation Service
  console.log('🔤 Testing Translation Service...');
  try {
    const translationService = new TranslationService(googleKey || '', openaiKey);
    
    const translationResult = await translationService.translateDialogue({
      text: "こんにちは！今日はいい天気ですね。",
      sourceLanguage: 'ja',
      targetLanguage: 'en',
      context: 'anime_dialogue',
      characterName: 'test_character',
      emotion: 'happy'
    });

    if (translationResult.success) {
      console.log(`✅ Translation successful: "${translationResult.data}"`);
    } else {
      console.log(`❌ Translation failed: ${translationResult.error}`);
    }
  } catch (error) {
    console.error(`❌ Translation service error: ${error.message}`);
  }

  // Test Voice Synthesis Service
  console.log('\n🎤 Testing Voice Synthesis Service...');
  try {
    const voiceSynthesisService = new VoiceSynthesisService(openaiKey, elevenlabsKey);
    
    const voiceResult = await voiceSynthesisService.synthesizeVoice({
      text: "Hello! The weather is nice today.",
      voiceId: 'male_young_energetic',
      emotion: 'happy',
      intensity: 'medium',
      speed: 1.0,
      pitch: 1.0
    });

    if (voiceResult.success) {
      console.log(`✅ Voice synthesis successful: ${voiceResult.data}`);
      
      // Check if audio file exists
      if (fs.existsSync(voiceResult.data)) {
        const stats = fs.statSync(voiceResult.data);
        console.log(`📁 Audio file created: ${stats.size} bytes`);
      } else {
        console.log(`⚠️ Audio file not found: ${voiceResult.data}`);
      }
    } else {
      console.log(`❌ Voice synthesis failed: ${voiceResult.error}`);
    }
  } catch (error) {
    console.error(`❌ Voice synthesis service error: ${error.message}`);
  }

  // Test different languages
  console.log('\n🌍 Testing Multiple Languages...');
  const languages = [
    { source: 'ja', target: 'en', text: 'こんにちは！' },
    { source: 'ja', target: 'es', text: 'おはようございます！' },
    { source: 'ja', target: 'fr', text: 'さようなら！' },
    { source: 'ja', target: 'hi', text: 'ありがとうございます！' }
  ];

  const translationService = new TranslationService(googleKey || '', openaiKey);

  for (const lang of languages) {
    try {
      const result = await translationService.translateDialogue({
        text: lang.text,
        sourceLanguage: lang.source,
        targetLanguage: lang.target,
        context: 'anime_dialogue'
      });

      if (result.success) {
        console.log(`✅ ${lang.source} → ${lang.target}: "${lang.text}" → "${result.data}"`);
      } else {
        console.log(`❌ ${lang.source} → ${lang.target}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${lang.source} → ${lang.target}: ${error.message}`);
    }
  }

  console.log('\n🎉 AI Services Test Complete!');
}

// Run the test
testAIServices().catch(console.error);