# Replit Deployment Guide for Grumpy Gamer Backend

## Quick Setup Steps

### 1. Create a New Replit
- Go to [replit.com](https://replit.com)
- Click "Create Replit"
- Choose "Python" as the template
- Name it something like "grumpy-gamer-backend"

### 2. Upload Your Backend Files
- Delete all default files in the Replit
- Upload these files from your local `backend/` folder:
  - `api.py`
  - `auth.py`
  - `requirements.txt`
  - `.env.example` (rename to `.env` after uploading)
  - All other backend files (`chatbot.py`, `stats.py`, `coins.py`, etc.)

### 3. Set Environment Variables
In Replit, go to the "Secrets" (lock icon) tab and add these:

**Required:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `SECRET_KEY` - Generate a random secret key for JWT
- `ENV` - Set to `production`

**Optional but recommended:**
- `SENTRY_DSN` - For error monitoring
- `ENVIRONMENT` - Set to `production`
- `CHATBOT_USE_LLM` - Set to `false` to save costs
- `OPENAI_API_KEY` - Only if using the chatbot
- `STRIPE_SECRET_KEY` - Only if using payments

**For database, you can:**
- Use Replit's built-in PostgreSQL (free tier available)
- Or use an external PostgreSQL service

### 4. Install Dependencies
The Replit will automatically install from `requirements.txt`, but you can also run:
```bash
pip install -r requirements.txt
```

### 5. Run the Server
Click the "Run" button in Replit, or the server should start automatically.

### 6. Get Your Replit URL
Your Replit will have a URL like: `https://your-replit-name.username.replit.co`

### 7. Update Your Frontend
Update your frontend `.env.production`:
```
REACT_APP_API_URL=https://your-replit-name.username.replit.co
```

## Database Setup

### Option 1: Use Replit's Built-in PostgreSQL
1. In your Replit, click the "Database" icon (database symbol)
2. Create a new PostgreSQL database
3. Copy the connection string
4. Add it as `DATABASE_URL` in Secrets

### Option 2: Use External PostgreSQL
- Use services like Supabase (free tier), Neon, or Railway PostgreSQL
- Add the connection string as `DATABASE_URL`

## Troubleshooting

### Port Issues
Replit automatically assigns a port. The app should detect it via the `PORT` environment variable.

### CORS Issues
The CORS settings have been updated to allow all origins in production for Replit compatibility.

### Database Connection Issues
- Make sure your `DATABASE_URL` is correct
- Check that the database is accessible from Replit
- Verify the database has the required tables

### Performance
Replit free tier may have some limitations. If you experience slowdowns:
- Consider upgrading to a paid plan
- Or use a different hosting service like Fly.io

## Alternative: Local Development with ngrok

If Replit doesn't work out, you can run locally:

```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

Then use ngrok:
```bash
ngrok http 8000
```

This gives you a public URL temporarily for testing.