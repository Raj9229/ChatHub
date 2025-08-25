# 🚀 Complete Deployment Guide

## 📋 Prerequisites
- GitHub account
- Render account (free tier available)
- Railway account (free tier available)

## 🎯 Step 1: Push to GitHub

### 1.1 Initialize Git Repository
```bash
cd "c:\Users\Krishna\Desktop\Telemedicine"
git init
git add .
git commit -m "Initial commit: ChatHub telemedicine application"
```

### 1.2 Create GitHub Repository
1. Go to [GitHub.com](https://github.com)
2. Click "New repository"
3. Name it: `telemedicine-chathub`
4. Make it public (required for free deployments)
5. Don't initialize with README (you already have one)
6. Click "Create repository"

### 1.3 Connect and Push
```bash
git remote add origin https://github.com/YOUR_USERNAME/telemedicine-chathub.git
git branch -M main
git push -u origin main
```

## 🔧 Step 2: Deploy Backend on Render

### 2.1 Create Render Account
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub (recommended)
3. Authorize Render to access your repositories

### 2.2 Deploy Backend Service
1. Click "New +" → "Web Service"
2. Connect your `telemedicine-chathub` repository
3. Configure deployment:
   - **Name**: `telemedicine-backend`
   - **Root Directory**: `telemedicine_backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2.3 Set Environment Variables
In Render dashboard, add these environment variables:
- `HOST` = `0.0.0.0`
- `PORT` = `8002`

### 2.4 Deploy
- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
- Note your backend URL: `https://telemedicine-backend.onrender.com`

## 🌐 Step 3: Deploy Frontend on Vercel

### 3.1 Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### 3.2 Deploy via Vercel Website
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your `telemedicine-chathub` repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `telemedicine_frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.3 Set Environment Variables
In Vercel dashboard, add:
- `VITE_API_URL` = `https://telemedicine-backend.onrender.com`
- `VITE_WS_URL` = `wss://telemedicine-backend.onrender.com`

### 3.4 Deploy
- Click "Deploy"
- Wait for deployment (2-5 minutes)
- Note your frontend URL: `https://your-project.vercel.app`

## 🚂 Step 4: Alternative - Deploy Backend on Railway

### 4.1 Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub

### 4.2 Deploy Backend
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `telemedicine-chathub` repository
4. Configure:
   - **Root Directory**: `telemedicine_backend`
   - Railway auto-detects Python and requirements

### 4.3 Set Environment Variables
- `HOST` = `0.0.0.0`
- `PORT` = `8002`

### 4.4 Get Railway URL
- Note your Railway URL: `https://your-project.up.railway.app`

## 🔄 Step 5: Update Frontend Configuration

### 5.1 Update Environment Variables
If using Railway backend, update Vercel environment variables:
- `VITE_API_URL` = `https://your-project.up.railway.app`
- `VITE_WS_URL` = `wss://your-project.up.railway.app`

### 5.2 Redeploy Frontend
- Trigger a new deployment in Vercel dashboard
- Or push changes to trigger automatic deployment

## ✅ Step 6: Verify Deployment

### 6.1 Test Backend
Visit your backend URL + `/health`:
- `https://telemedicine-backend.onrender.com/health`

Should return:
```json
{
  "status": "healthy",
  "active_rooms": 0,
  "total_connections": 0,
  "timestamp": "2024-..."
}
```

### 6.2 Test Frontend
1. Visit your frontend URL
2. Create a room
3. Test chat functionality
4. Share invite link with someone to test real-time chat

## 🛠️ Troubleshooting

### Common Issues:

1. **CORS Errors**: Update CORS origins in `main.py`
2. **WebSocket Connection Failed**: Check WS URL (wss:// for HTTPS)
3. **Build Failures**: Check build logs in deployment dashboards
4. **Environment Variables**: Ensure all variables are set correctly

### Debug Steps:
1. Check deployment logs in Render/Railway/Vercel
2. Test API endpoints directly
3. Check browser console for errors
4. Verify environment variables

## 🎉 Success!

Your telemedicine chat application is now live and accessible worldwide!

**Frontend**: Your Vercel URL
**Backend**: Your Render/Railway URL
**Features**: Real-time chat, room creation, invite links, responsive design

## 📈 Next Steps (Optional)

1. **Custom Domain**: Add your own domain in Vercel/Render
2. **Analytics**: Add Google Analytics or similar
3. **Monitoring**: Set up uptime monitoring
4. **Database**: Replace in-memory storage with PostgreSQL
5. **Authentication**: Add user authentication system
6. **File Sharing**: Add image/file upload capabilities

## 💰 Cost Estimate

- **GitHub**: Free for public repositories
- **Render**: Free tier (750 hours/month)
- **Vercel**: Free tier (generous limits)
- **Railway**: Free tier ($5 credit monthly)

**Total Monthly Cost**: $0 (using free tiers)
