import os
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from spotipy.oauth2 import SpotifyOAuth
from database import supabase
from dotenv import load_dotenv
import spotipy

load_dotenv()

router = APIRouter()

# Initialize OAuth inside the router file
sp_oauth = SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri="http://127.0.0.1:8000/callback",
    scope=" ".join([
        "user-read-private", "user-top-read", 
        "user-library-read", "playlist-read-private",
        "user-read-recently-played", "user-library-read"
    ]),
    show_dialog=True
)

@router.get("/login")
async def login(request: Request):
    # 1. Pull the token from the FastAPI session
    token_info = request.session.get("spotify_token")
    
    # 2. Check if it's valid
    if not token_info or not sp_oauth.validate_token(token_info):
        auth_url = sp_oauth.get_authorize_url()
        return RedirectResponse(auth_url)
    
    # 3. If valid, redirect to your dashboard route
    return RedirectResponse(url="/dashboard")

@router.get("/callback")
async def callback(request: Request, code: str):
    try:
        token_info = sp_oauth.get_access_token(code)
        request.session["spotify_token"] = token_info

        sp = spotipy.Spotify(auth=token_info['access_token'])
        user_info = sp.current_user()

        profile_payload = {
            "spotify_id": user_info['id'],       
            "display_name": user_info.get('display_name'),
            "avatar_url": user_info['images'][0]['url'] if user_info.get('images') else None,
            "last_login": "now()"                 
        }

        supabase.table("profiles").upsert(
            profile_payload, 
            on_conflict="spotify_id"
        ).execute()

        return RedirectResponse(url="/dashboard")
    
    except Exception:
        raise HTTPException(status_code=400, detail="Auth Failed")
    
@router.get("/logout")
async def logout(request: Request):
    """Clears the session and redirects to home."""
    request.session.clear()
    return RedirectResponse(url="/")

@router.get("/me")
async def get_current_user(request: Request):
    token = request.session.get("spotify_token")
    if not token:
        return {"logged_in": False}
    
    # Use the session to find the user in your Supabase 'profiles' table
    # This ensures your frontend has the 'display_name' and 'avatar_url' ready
    sp = spotipy.Spotify(auth=token['access_token'])
    user_info = sp.current_user()
    
    return {
        "logged_in": True,
        "user": user_info
    }


@router.get("/dashboard")
async def dashboard(request: Request):
    token_info = request.session.get("spotify_token")
    
    if not token_info:
        return RedirectResponse(url="/")
        
    return {"message": "Welcome to your Karaoke Dashboard!", "status": "Authenticated"}