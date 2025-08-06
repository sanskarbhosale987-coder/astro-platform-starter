#!/usr/bin/env node

// Setup script for AniDub AI
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎬 AniDub AI Setup\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env file...');
  
  const envContent = `# AniDub AI Environment Variables

# OpenAI API Configuration (Required for translation)
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API Configuration (Required for voice synthesis)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Google Cloud Translation API (Optional, for additional translation services)
GOOGLE_API_KEY=your_google_api_key_here

# Netlify Configuration (Required for deployment)
NETLIFY_BLOBS_STORE_ID=your_netlify_blobs_store_id

# Processing Configuration
MAX_FILE_SIZE=524288000  # 500MB in bytes
MAX_CONCURRENT_JOBS=3
PROCESSING_TIMEOUT=3600  # 1 hour in seconds

# Quality Control Settings
MIN_QUALITY_SCORE=0.8
AUTO_RETRY_FAILED_JOBS=true

# Development Settings
NODE_ENV=development
DEBUG=false
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created');
} else {
  console.log('✅ .env file already exists');
}

// Check dependencies
console.log('\n📦 Checking dependencies...');
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const requiredDeps = [
  'openai',
  'axios',
  'fluent-ffmpeg',
  '@netlify/blobs',
  'formidable'
];

const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);

if (missingDeps.length > 0) {
  console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
  console.log('Run: npm install');
} else {
  console.log('✅ All required dependencies are installed');
}

// Create temp directory
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('✅ Created temp directory');
} else {
  console.log('✅ Temp directory exists');
}

// Check FFmpeg
console.log('\n🎵 Checking FFmpeg...');
import { exec } from 'child_process';
exec('ffmpeg -version', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ FFmpeg not found. Please install FFmpeg:');
    console.log('  macOS: brew install ffmpeg');
    console.log('  Ubuntu: sudo apt install ffmpeg');
    console.log('  Windows: Download from https://ffmpeg.org/');
  } else {
    console.log('✅ FFmpeg is installed');
  }
});

// Instructions
console.log('\n📋 Setup Instructions:');
console.log('1. Edit .env file with your API keys:');
console.log('   - Get OpenAI API key from: https://platform.openai.com/api-keys');
console.log('   - Get ElevenLabs API key from: https://elevenlabs.io/');
console.log('   - Get Google API key from: https://console.cloud.google.com/');

console.log('\n2. Test the AI services:');
console.log('   node test-ai-services.js');

console.log('\n3. Start the development server:');
console.log('   npm run dev');

console.log('\n4. Open your browser to: http://localhost:4321/dubbing');

console.log('\n🚀 You\'re ready to start dubbing anime!');