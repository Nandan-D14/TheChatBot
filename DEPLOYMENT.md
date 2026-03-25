# TheChatBot Backend - Render Deployment Guide

## Problem Solved

The initial deployment failed due to Python 3.14.3 compatibility issues:
- `pydantic-core==2.14.6` doesn't have pre-built wheels for Python 3.14
- Rust compilation failed in Render's read-only file system

## Changes Made

### 1. Updated `backend/requirements.txt`
- Upgraded `pydantic` from `==2.5.3` to `>=2.10.0,<3.0.0`
- Upgraded `pydantic-settings` from `==2.1.0` to `>=2.7.0,<3.0.0`
- Upgraded `aiohttp` from `==3.9.1` to `>=3.10.0,<4.0.0`
- Upgraded `orjson` from `==3.9.12` to `>=3.10.0,<4.0.0`

These newer versions have pre-built wheels for Python 3.12+ and avoid Rust compilation issues.

### 2. Created `backend/runtime.txt`
Specifies Python 3.12.9 for Render deployment, ensuring compatibility with all dependencies.

### 3. Updated `backend/main.py`
- Added support for Render's `PORT` environment variable
- Disabled `reload` in production (when `RENDER=true`)
- Made the app production-ready

### 4. Created `render.yaml`
Complete Render deployment configuration with:
- Build and start commands
- Environment variable placeholders
- Python version specification

## Deployment Instructions

### Option 1: Using render.yaml (Recommended)

1. Push all changes to your repository
2. In Render dashboard, create a new Web Service
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and configure the service
5. Set the required environment variables in Render dashboard:
   - `BEAM_ENDPOINT_URL`
   - `BEAM_TOKEN`
   - `APPWRITE_ENDPOINT`
   - `APPWRITE_PROJECT_ID`
   - `APPWRITE_API_KEY`
   - `CORS_ORIGINS` (update to include your Render domain)
   - `HF_TOKEN` (if using gated models)

### Option 2: Manual Configuration

If not using `render.yaml`, configure manually in Render dashboard:

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Environment Variables:**
- `PYTHON_VERSION`: `3.12.9`
- All variables listed above

## Correct Start Command

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Or using the Python file directly:
```bash
python main.py
```

(The app now automatically uses Render's `PORT` environment variable)

## Verification

After deployment, verify the service is running:

1. Check the health endpoint: `https://your-service.onrender.com/health`
2. Check the info endpoint: `https://your-service.onrender.com/info`
3. Check the root endpoint: `https://your-service.onrender.com/`

Expected response from `/health`:
```json
{
  "status": "healthy",
  "service": "thechatbot-api"
}
```

## Troubleshooting

### Build Fails with Rust Compilation Error
- Ensure `runtime.txt` specifies Python 3.12.9
- Verify `requirements.txt` uses the updated versions

### App Starts but Crashes
- Check all required environment variables are set
- Verify Beam endpoint is accessible
- Verify Appwrite credentials are correct

### CORS Errors
- Update `CORS_ORIGINS` environment variable to include your Render domain
- Format: `https://your-service.onrender.com,http://localhost:3000`

## Files Modified/Created

- ✅ `backend/requirements.txt` - Updated dependency versions
- ✅ `backend/runtime.txt` - Created (Python 3.12.9)
- ✅ `backend/main.py` - Updated for production deployment
- ✅ `render.yaml` - Created (Render configuration)
- ✅ `DEPLOYMENT.md` - This guide
