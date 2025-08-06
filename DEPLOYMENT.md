# AniDub AI Deployment Guide

This guide will help you deploy the AniDub AI system to production environments.

## 🚀 Quick Deployment Options

### Option 1: Netlify (Recommended)

1. **Fork/Clone Repository**
   ```bash
   git clone https://github.com/your-username/anidub-ai.git
   cd anidub-ai
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub account
   - Select the anidub-ai repository

3. **Configure Build Settings**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`

4. **Set Environment Variables**
   In Netlify dashboard → Site settings → Environment variables:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   GOOGLE_API_KEY=your_google_api_key
   NETLIFY_BLOBS_STORE_ID=your_blobs_store_id
   ```

5. **Deploy**
   - Push to main branch triggers automatic deployment
   - Or manually deploy from Netlify dashboard

### Option 2: Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add OPENAI_API_KEY
   vercel env add ELEVENLABS_API_KEY
   vercel env add GOOGLE_API_KEY
   ```

### Option 3: Self-Hosted

1. **Server Requirements**
   - Node.js 18+
   - 4GB+ RAM
   - 50GB+ storage
   - FFmpeg installed

2. **Install Dependencies**
   ```bash
   npm install
   npm run build
   ```

3. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start Production Server**
   ```bash
   npm run preview
   ```

## 🔧 Advanced Configuration

### API Key Setup

#### OpenAI API
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create account and add billing
3. Generate API key
4. Add to environment variables

#### ElevenLabs API
1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Create account
3. Get API key from dashboard
4. Add to environment variables

#### Google Cloud Translation (Optional)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project
3. Enable Translation API
4. Create service account and download key
5. Add to environment variables

### Netlify Blobs Setup

1. **Create Blob Store**
   ```bash
   npx @netlify/blobs-cli store create
   ```

2. **Get Store ID**
   ```bash
   npx @netlify/blobs-cli store list
   ```

3. **Add to Environment Variables**
   ```env
   NETLIFY_BLOBS_STORE_ID=your_store_id
   ```

### Custom Domain Setup

1. **Netlify**
   - Go to Site settings → Domain management
   - Add custom domain
   - Configure DNS records

2. **Vercel**
   ```bash
   vercel domains add yourdomain.com
   ```

## 📊 Performance Optimization

### Production Build
```bash
npm run build
```

### Environment Optimization
```env
NODE_ENV=production
DEBUG=false
MAX_CONCURRENT_JOBS=2
PROCESSING_TIMEOUT=1800
```

### CDN Configuration
- Enable Netlify CDN for static assets
- Configure cache headers for video files
- Set up image optimization

### Monitoring Setup

1. **Error Tracking**
   ```bash
   npm install @sentry/astro
   ```

2. **Analytics**
   ```bash
   npm install @vercel/analytics
   ```

3. **Health Checks**
   Create `/api/health` endpoint:
   ```typescript
   export const GET: APIRoute = async () => {
     return new Response(JSON.stringify({
       status: 'healthy',
       timestamp: new Date().toISOString()
     }));
   };
   ```

## 🔒 Security Configuration

### Environment Variables Security
- Never commit API keys to repository
- Use environment variables for all secrets
- Rotate API keys regularly

### CORS Configuration
```typescript
// astro.config.mjs
export default defineConfig({
  server: {
    headers: {
      'Access-Control-Allow-Origin': 'https://yourdomain.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  }
});
```

### Rate Limiting
```typescript
// Add to API endpoints
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
};
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### API Key Issues
- Verify API keys are correct
- Check API quotas and billing
- Test API endpoints manually

#### File Upload Issues
- Check file size limits
- Verify blob storage configuration
- Test upload endpoint

#### Processing Failures
- Check server logs
- Verify FFmpeg installation
- Monitor memory usage

### Debug Mode
```env
DEBUG=true
NODE_ENV=development
```

### Log Analysis
```bash
# View Netlify function logs
netlify functions:log

# View Vercel logs
vercel logs
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use multiple serverless functions
- Implement job queuing
- Add load balancers

### Vertical Scaling
- Increase memory allocation
- Optimize processing algorithms
- Use GPU acceleration

### Cost Optimization
- Monitor API usage
- Implement caching
- Use appropriate instance sizes

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Netlify
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: './dist'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
```

### Environment Management
```bash
# Staging environment
netlify env:set OPENAI_API_KEY staging_key --context staging

# Production environment
netlify env:set OPENAI_API_KEY production_key --context production
```

## 📞 Support

### Deployment Issues
- Check [Netlify Status](https://status.netlify.com)
- Review [Vercel Status](https://vercel-status.com)
- Consult deployment logs

### API Issues
- OpenAI: [status.openai.com](https://status.openai.com)
- ElevenLabs: [status.elevenlabs.io](https://status.elevenlabs.io)

### Community Support
- GitHub Issues
- Discord Community
- Documentation Wiki

---

**Happy Deploying! 🚀**

For additional help, check our [documentation](https://docs.anidub-ai.com) or join our [Discord community](https://discord.gg/anidub-ai).