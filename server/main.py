import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from database import supabase
from routes import auth, features, scores # Import your new route files

load_dotenv()

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET_KEY"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Include the routers
app.include_router(auth.router)
app.include_router(features.router)
app.include_router(scores.router, prefix="/api/scores", tags=["Scores"])

@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <body style="display:flex; justify-content:center; align-items:center; height:100vh; background:#121212;">
        <a href="/login" style="background:#1DB954; color:white; padding:16px 32px; border-radius:30px; text-decoration:none; font-family:sans-serif; font-weight:bold;">
            Login with Spotify
    </body>
    """

@app.get("/dashboard")
async def dashboard(request: Request):
    token_info = request.session.get("spotify_token")
    
    if not token_info:
        return RedirectResponse(url="/")
        
    return {"message": "Welcome to your Karaoke Dashboard!", "status": "Authenticated"}


