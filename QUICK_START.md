# 🚀 AniDub AI Quick Start Guide

Get your AI anime dubbing system up and running in 5 minutes!

## ⚡ Quick Setup (5 minutes)

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Run Setup Script**
```bash
npm run setup
```

### 3. **Get API Keys**
You need these API keys for the AI services to work:

#### **OpenAI API Key** (Required for translation)
1. Go to [platform.openai.com](https://platform.openai.com/api-keys)
2. Create account and add billing
3. Generate API key
4. Add to `.env` file: `OPENAI_API_KEY=your_key_here`

#### **ElevenLabs API Key** (Required for voice synthesis)
1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Create account
3. Get API key from dashboard
4. Add to `.env` file: `ELEVENLABS_API_KEY=your_key_here`

### 4. **Test AI Services**
```bash
npm run test
```

You should see:
```
🧪 Testing AI Services...

📋 Environment Variables:
OpenAI API Key: ✅ Set
ElevenLabs API Key: ✅ Set

🔤 Testing Translation Service...
✅ Translation successful: "Hello! The weather is nice today."

🎤 Testing Voice Synthesis Service...
✅ Voice synthesis successful: /path/to/audio/file.mp3
```

### 5. **Start the Application**
```bash
npm run dev
```

### 6. **Open the Dashboard**
Visit: http://localhost:4321/dubbing

## 🎬 How to Use

### **Step 1: Upload Anime Video**
- Drag and drop your anime video file
- Supported formats: MP4, WebM, AVI, MOV
- Maximum size: 500MB

### **Step 2: Select Target Language**
- Choose your desired language (English, Spanish, French, etc.)
- Select voice style and quality settings

### **Step 3: Start Processing**
- Click "🚀 Start Dubbing Process"
- Watch real-time progress updates
- AI automatically:
  - Analyzes video and detects characters
  - Translates dialogue to your language
  - Generates AI voices for characters
  - Creates final dubbed video

### **Step 4: Download Results**
- Download dubbed video in MP4 format
- Get subtitles in SRT, VTT, or ASS format
- Review quality report and recommendations

## 🔧 Troubleshooting

### **"Translation not working"**
```bash
# Check OpenAI API key
curl -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  https://api.openai.com/v1/models
```

### **"Voice synthesis not working"**
```bash
# Check ElevenLabs API key
curl -H "xi-api-key: YOUR_ELEVENLABS_KEY" \
  https://api.elevenlabs.io/v1/voices
```

### **"Video upload fails"**
- Check file size (max 500MB)
- Ensure video format is supported
- Check browser console for errors

### **"Processing stuck"**
```bash
# Check server logs
npm run dev
# Look for error messages in console

# Test AI services
npm run test
```

## 🌍 Supported Languages

### **Source Languages**
- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- English (en)

### **Target Languages**
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Hindi (hi)
- Tamil (ta)
- Portuguese (pt)
- Italian (it)
- Russian (ru)
- Arabic (ar)

## 🎯 Example Workflow

1. **Upload**: Drop a Japanese anime episode
2. **Select**: Choose "English" as target language
3. **Process**: AI translates and dubs automatically
4. **Download**: Get English-dubbed video with subtitles

## 📊 Quality Settings

### **Fast Preset** (5-10 minutes)
- Quick processing for previews
- Lower quality but faster results

### **Balanced Preset** (10-15 minutes) ⭐ **Recommended**
- Good quality and reasonable speed
- Best for most use cases

### **High Quality** (15-25 minutes)
- Maximum quality output
- Slower processing time

## 🔑 API Key Setup

### **OpenAI API**
1. Visit [platform.openai.com](https://platform.openai.com/api-keys)
2. Sign up and add billing information
3. Create a new API key
4. Copy the key and add to `.env` file

### **ElevenLabs API**
1. Visit [elevenlabs.io](https://elevenlabs.io)
2. Create a free account
3. Go to Profile → API Key
4. Copy the key and add to `.env` file

### **Google API** (Optional)
1. Visit [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable Translation API
4. Create credentials and download JSON
5. Extract API key and add to `.env` file

## 🚨 Common Issues

### **"API key not configured"**
- Check your `.env` file exists
- Verify API keys are correct
- Restart the development server

### **"Translation failed"**
- Check OpenAI API quota
- Verify billing is set up
- Test with smaller text first

### **"Voice synthesis failed"**
- Check ElevenLabs API key
- Verify voice ID exists
- Check text length limits

### **"Video not processing"**
- Check file format and size
- Verify FFmpeg is installed
- Check server logs for errors

## 📞 Getting Help

### **Before asking for help:**
1. Run `npm run test` to check AI services
2. Check browser console for errors
3. Verify API keys are set correctly
4. Try with a smaller test file

### **Useful commands:**
```bash
# Test AI services
npm run test

# Check setup
npm run setup

# Start development server
npm run dev

# Check environment variables
cat .env
```

### **Support channels:**
- **GitHub Issues**: Report bugs
- **Discord**: Community help
- **Documentation**: Check README.md

---

**🎉 You're ready to start dubbing anime with AI!**

Upload your first video and watch the magic happen! 🎬✨