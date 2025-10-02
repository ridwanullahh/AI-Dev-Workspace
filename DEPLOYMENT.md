# AI Dev Workspace - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Netlify Deployment](#netlify-deployment)
5. [GitHub Pages Deployment](#github-pages-deployment)
6. [Self-Hosted Deployment](#self-hosted-deployment)
7. [Environment Variables](#environment-variables)
8. [Post-Deployment](#post-deployment)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required
- Node.js 18+ and npm 9+
- Git
- A GitHub account

### Optional (for full functionality)
- GitHub OAuth App (for repository sync)
- Google Cloud Project (for Gemini AI OAuth)
- OpenAI API Account (for GPT models)

## Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ai-dev-workspace.git
cd ai-dev-workspace
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Environment File
Create `.env` file in project root:
```env
# GitHub OAuth (Required for GitHub integration)
VITE_GITHUB_CLIENT_ID=your_github_client_id_here

# Google OAuth (Required for Gemini AI)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Optional: OpenAI API Key
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Optional: Anthropic API Key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 4. Test Locally
```bash
npm run dev
```
Visit `http://localhost:3000` to verify everything works.

## Vercel Deployment

### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel
```

4. **Configure Environment Variables**
```bash
vercel env add VITE_GITHUB_CLIENT_ID
vercel env add VITE_GOOGLE_CLIENT_ID
vercel env add VITE_GOOGLE_CLIENT_SECRET
```

5. **Production Deployment**
```bash
vercel --prod
```

### Option 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables in dashboard
6. Click "Deploy"

### Vercel Configuration (vercel.json)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    }
  ]
}
```

## Netlify Deployment

### Option 1: Netlify CLI

1. **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

2. **Login to Netlify**
```bash
netlify login
```

3. **Initialize Site**
```bash
netlify init
```

4. **Deploy**
```bash
netlify deploy --prod
```

### Option 2: Netlify Dashboard

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site"
3. Connect to Git provider
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add environment variables
6. Click "Deploy site"

### Netlify Configuration (netlify.toml)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Service-Worker-Allowed = "/"
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/_app/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## GitHub Pages Deployment

### Setup

1. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: GitHub Actions

2. **Create Workflow File**
   
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_GITHUB_CLIENT_ID: ${{ secrets.VITE_GITHUB_CLIENT_ID }}
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
          VITE_GOOGLE_CLIENT_SECRET: ${{ secrets.VITE_GOOGLE_CLIENT_SECRET }}
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

3. **Add Secrets**
   - Go to repository Settings → Secrets
   - Add:
     - `VITE_GITHUB_CLIENT_ID`
     - `VITE_GOOGLE_CLIENT_ID`
     - `VITE_GOOGLE_CLIENT_SECRET`

4. **Trigger Deployment**
```bash
git push origin main
```

### Base Path Configuration
If deploying to `username.github.io/repo-name`, update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/repo-name/',
  // ... rest of config
})
```

## Self-Hosted Deployment

### Using Docker

1. **Create Dockerfile**
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. **Create nginx.conf**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Service Worker
    location = /sw.js {
        add_header Service-Worker-Allowed '/';
        add_header Cache-Control 'public, max-age=0, must-revalidate';
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

3. **Build and Run**
```bash
docker build -t ai-dev-workspace .
docker run -p 80:80 ai-dev-workspace
```

### Using PM2 (Node.js Process Manager)

1. **Install PM2**
```bash
npm install -g pm2
```

2. **Build Application**
```bash
npm run build
```

3. **Serve with PM2**
```bash
pm2 serve dist 3000 --spa --name ai-dev-workspace
pm2 save
pm2 startup
```

## Environment Variables

### Required Variables

#### GitHub OAuth
```env
VITE_GITHUB_CLIENT_ID=Ov23liFZOuwczRGBqhSo
```
Get from: https://github.com/settings/developers
- Create OAuth App
- Callback URL: `https://yourdomain.com/oauth/callback`

#### Google OAuth (for Gemini AI)
```env
VITE_GOOGLE_CLIENT_ID=your-project-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-client-secret
```
Get from: https://console.cloud.google.com/apis/credentials
- Create OAuth 2.0 Client ID
- Authorized redirect URIs: `https://yourdomain.com/oauth/callback`

### Optional Variables

```env
# OpenAI
VITE_OPENAI_API_KEY=sk-...

# Anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Sentry (Error Tracking)
VITE_SENTRY_DSN=https://...

# Analytics
VITE_GA_TRACKING_ID=G-...
```

## Post-Deployment

### 1. Verify Deployment
- [ ] Site loads correctly
- [ ] Service Worker registers
- [ ] PWA install prompt appears
- [ ] All routes work (SPA fallback)

### 2. Test Core Features
- [ ] Create a project
- [ ] Connect GitHub
- [ ] Add AI provider
- [ ] Terminal works
- [ ] Git operations function
- [ ] Chat with AI agents

### 3. Configure OAuth Callbacks
Update OAuth app settings with production URLs:
- GitHub: `https://yourdomain.com/oauth/callback`
- Google: `https://yourdomain.com/oauth/callback`

### 4. Setup Monitoring
Configure error tracking:
```typescript
// src/main.tsx
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: 'production'
  });
}
```

### 5. Enable HTTPS
- Vercel/Netlify: Automatic
- Self-hosted: Use Let's Encrypt with Certbot

```bash
# Certbot for Nginx
sudo certbot --nginx -d yourdomain.com
```

## Troubleshooting

### Build Errors

**Error: TypeScript compilation failed**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

**Error: Out of memory**
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### Runtime Issues

**Service Worker not registering**
- Ensure site is served over HTTPS
- Check `Service-Worker-Allowed` header
- Clear browser cache and hard reload

**OAuth errors**
- Verify callback URLs match OAuth app settings
- Check environment variables are set correctly
- Ensure cookies are not blocked

**CORS errors with AI APIs**
- AI provider APIs may require server-side proxy
- Consider implementing backend proxy for production

### Performance Optimization

**Slow initial load**
```typescript
// Implement route-based code splitting
const ChatInterface = lazy(() => import('./components/ChatInterface'));
```

**Large bundle size**
```bash
# Analyze bundle
npm run build -- --analyze
```

**IndexedDB quota exceeded**
```typescript
// Implement data pruning
await db.memories.where('accessedAt').below(cutoffDate).delete();
```

## Continuous Deployment

### Automatic Deployments

**GitHub Actions (for any host)**
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run deploy  # Your deployment script
```

**Vercel/Netlify**
- Automatic deployments on git push
- Preview deployments for pull requests
- Environment variables synced from dashboard

## Backup and Restore

### Data Export
Users can export their data:
```typescript
// In SettingsManager
const data = await StorageService.exportData();
// Download as JSON file
```

### Migration Strategy
```bash
# Backup before deployment
npm run export-data > backup-$(date +%Y%m%d).json

# After deployment, users can import
# Through Settings → Data Management → Import
```

## Security Checklist

- [ ] All API keys in environment variables (not hardcoded)
- [ ] HTTPS enabled
- [ ] Content Security Policy headers set
- [ ] OAuth apps use production URLs
- [ ] Secrets not committed to Git
- [ ] Regular dependency updates (`npm audit`)
- [ ] Error messages don't leak sensitive data

## Support

For deployment issues:
- Check [GitHub Issues](https://github.com/yourusername/ai-dev-workspace/issues)
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Contact: support@aidevworkspace.com
