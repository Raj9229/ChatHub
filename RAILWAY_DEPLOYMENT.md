# Railway.app Configuration Guide

## Backend Deployment on Railway:

1. **Connect Repository**: Link your GitHub repository to Railway
2. **Select Root Directory**: Choose `telemedicine_backend` folder as the root
3. **Auto-Detection**: Railway automatically detects Python and installs dependencies
4. **Environment Variables**: Set these in Railway dashboard:
   - `PORT=8002`
   - `HOST=0.0.0.0`
   - `FRONTEND_URL=https://your-frontend-domain.vercel.app`

## Frontend Deployment Options:

### Option 1: Vercel
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_URL=https://your-backend-name.up.railway.app`
  - `VITE_WS_URL=wss://your-backend-name.up.railway.app`

### Option 2: Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Same environment variables as Vercel

## Start Command:
Railway auto-detects and uses: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Health Check:
The backend includes a `/health` endpoint for monitoring
