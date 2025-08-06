# AniDub AI Troubleshooting Guide

This guide helps you resolve common issues with the AI dubbing system.

## 🚨 Common Issues & Solutions

### 1. **Video Upload Not Working**

**Problem**: Video upload fails or doesn't start processing.

**Solutions**:
- Check file size (max 500MB)
- Ensure video format is supported (MP4, WebM, AVI, MOV)
- Verify browser supports File API
- Check network connection

**Debug Steps**:
```bash
# Check browser console for errors
# Test upload endpoint
curl -X POST /api/upload -F "video=@test.mp4"
```

### 2. **Translation Not Working**

**Problem**: Videos are not being dubbed in the selected language.

**Solutions**:
- Verify OpenAI API key is set correctly
- Check API quota and billing
- Ensure target language is supported
- Test translation service directly

**Debug Steps**:
```bash
# Test translation endpoint
curl http://localhost:4321/api/test
```

**Environment Variables**:
```env
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_api_key
```

### 3. **Voice Synthesis Issues**

**Problem**: AI voices are not being generated.

**Solutions**:
- Verify ElevenLabs API key
- Check voice synthesis service status
- Ensure text is being translated properly
- Test voice synthesis directly

**Debug Steps**:
```bash
# Test voice synthesis
curl -X POST /api/voice-synthesis \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voiceId":"male_young_energetic"}'
```

### 4. **Download Not Working**

**Problem**: Can't download the dubbed video.

**Solutions**:
- Check if processing is complete
- Verify dubbed video exists in storage
- Ensure proper file permissions
- Check download endpoint

**Debug Steps**:
```bash
# Check job status
curl "http://localhost:4321/api/upload?jobId=YOUR_JOB_ID"

# Test download endpoint
curl "http://localhost:4321/api/download?jobId=YOUR_JOB_ID"
```

### 5. **Processing Stuck**

**Problem**: Processing gets stuck at a certain stage.

**Solutions**:
- Check server logs for errors
- Verify all API keys are valid
- Restart the processing job
- Check blob storage connectivity

**Debug Steps**:
```bash
# Check processing logs
npm run dev
# Look for error messages in console

# Test individual services
curl http://localhost:4321/api/test
```

## 🔧 Service-Specific Issues

### OpenAI API Issues

**Common Problems**:
- Rate limiting
- Invalid API key
- Insufficient credits
- Model availability

**Solutions**:
```bash
# Check API key
curl -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  https://api.openai.com/v1/models

# Test translation
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'
```

### ElevenLabs API Issues

**Common Problems**:
- Invalid API key
- Voice ID not found
- Rate limiting
- Audio generation failed

**Solutions**:
```bash
# Check API key
curl -H "xi-api-key: YOUR_ELEVENLABS_KEY" \
  https://api.elevenlabs.io/v1/voices

# Test voice synthesis
curl -X POST https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID \
  -H "xi-api-key: YOUR_ELEVENLABS_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}'
```

### Netlify Blobs Issues

**Common Problems**:
- Store not found
- Permission denied
- Storage quota exceeded
- Network connectivity

**Solutions**:
```bash
# Check blob store
npx @netlify/blobs-cli store list

# Test blob operations
npx @netlify/blobs-cli set test-key "test-value"
npx @netlify/blobs-cli get test-key
```

## 🛠️ Development Debugging

### Enable Debug Mode

```env
DEBUG=true
NODE_ENV=development
LOG_LEVEL=debug
```

### Check Service Status

```bash
# Test all services
curl http://localhost:4321/api/test

# Check individual endpoints
curl http://localhost:4321/api/upload
curl http://localhost:4321/api/analysis
curl http://localhost:4321/api/quality-control
curl http://localhost:4321/api/download
```

### Monitor Processing

```bash
# Watch server logs
npm run dev

# Check blob storage
npx @netlify/blobs-cli list

# Monitor API calls
# Check browser Network tab
```

## 🔍 Log Analysis

### Common Error Messages

**"OpenAI API key not configured"**
- Set OPENAI_API_KEY environment variable
- Verify API key is valid
- Check billing status

**"ElevenLabs API key not configured"**
- Set ELEVENLABS_API_KEY environment variable
- Verify API key is valid
- Check account status

**"Video file not found"**
- Check blob storage connectivity
- Verify video was uploaded successfully
- Check file permissions

**"Translation failed"**
- Check OpenAI API status
- Verify text is not empty
- Check language support

**"Voice synthesis failed"**
- Check ElevenLabs API status
- Verify voice ID exists
- Check text length limits

## 📊 Performance Issues

### Slow Processing

**Causes**:
- Large video files
- High quality settings
- API rate limits
- Network latency

**Solutions**:
- Use smaller video files for testing
- Lower quality presets
- Implement caching
- Use CDN for static assets

### Memory Issues

**Causes**:
- Large video buffers
- Multiple concurrent jobs
- Insufficient server resources

**Solutions**:
- Reduce concurrent job limit
- Implement streaming processing
- Increase server memory
- Use external processing services

## 🔒 Security Issues

### API Key Security

**Best Practices**:
- Never commit API keys to repository
- Use environment variables
- Rotate keys regularly
- Monitor API usage

**Check for Exposed Keys**:
```bash
# Search for hardcoded keys
grep -r "sk-" .
grep -r "xi-api-key" .
```

### File Upload Security

**Issues**:
- Malicious file uploads
- File size limits
- Type validation

**Solutions**:
- Implement file type validation
- Set appropriate size limits
- Scan uploaded files
- Use secure storage

## 📞 Getting Help

### Before Asking for Help

1. **Check the logs**: Look for error messages
2. **Test individual services**: Use the test endpoint
3. **Verify configuration**: Check environment variables
4. **Reproduce the issue**: Create a minimal test case

### Useful Commands

```bash
# Check system status
npm run dev
curl http://localhost:4321/api/test

# Check environment
echo $OPENAI_API_KEY
echo $ELEVENLABS_API_KEY

# Check dependencies
npm list
npm audit

# Clear cache
rm -rf node_modules package-lock.json
npm install
```

### Contact Information

- **GitHub Issues**: Report bugs and feature requests
- **Discord Community**: Get help from other users
- **Documentation**: Check the README and API docs
- **Email Support**: For urgent issues

## 🚀 Quick Fixes

### Most Common Solutions

1. **Restart the server**:
   ```bash
   npm run dev
   ```

2. **Check API keys**:
   ```bash
   curl http://localhost:4321/api/test
   ```

3. **Clear browser cache**:
   - Hard refresh (Ctrl+F5)
   - Clear browser data
   - Try incognito mode

4. **Check file upload**:
   - Use smaller test file
   - Check file format
   - Verify network connection

5. **Monitor processing**:
   - Check browser console
   - Watch server logs
   - Verify blob storage

---

**Remember**: Most issues can be resolved by checking the logs and verifying your configuration. If you're still having trouble, provide detailed error messages and steps to reproduce the issue.