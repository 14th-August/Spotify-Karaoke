import spotipy
from fastapi import APIRouter, Request, HTTPException
from spotipy import Spotify
from database import supabase
from .auth import sp_oauth  
from dotenv import load_dotenv


load_dotenv()

router = APIRouter(prefix="/api")

@router.get("/recent-tracks")
async def get_recent(request: Request):
    token_info = request.session.get("spotify_token")
    if not token_info:
        raise HTTPException(status_code=401, detail="Log in required")

    # 2. Validate and refresh if needed
    valid_token = sp_oauth.validate_token(token_info)
    if not valid_token:
        raise HTTPException(status_code=401, detail="Session expired")

    # 3. Update session if a refresh happened
    if valid_token != token_info:
        request.session["spotify_token"] = valid_token

    # 4. Fetch the data
    sp = Spotify(auth=valid_token['access_token'])
    recent = sp.current_user_recently_played(limit=10)
    
    return recent

@router.get("/get-favourites")
async def get_favourites(request: Request):
        # 1. Get token from session
    token_info = request.session.get("spotify_token")
    if not token_info:
        raise HTTPException(status_code=401, detail="Log in required")

    # 2. Validate and refresh if needed
    valid_token = sp_oauth.validate_token(token_info)
    if not valid_token:
        raise HTTPException(status_code=401, detail="Session expired")

    # 3. Update session if a refresh happened
    if valid_token != token_info:
        request.session["spotify_token"] = valid_token

    sp = Spotify(auth=valid_token['access_token'])
    results = sp.current_user_saved_tracks(limit=50)

    return results

@router.get("/get-playlists")
async def get_favourites(request: Request):
    token_info = request.session.get("spotify_token")
    if not token_info:
        raise HTTPException(status_code=401, detail="Log in required")

    valid_token = sp_oauth.validate_token(token_info)
    if not valid_token:
        raise HTTPException(status_code=401, detail="Session expired")

    if valid_token != token_info:
        request.session["spotify_token"] = valid_token

    sp = Spotify(auth=valid_token['access_token'])
    results = sp.current_user_playlists()

    return results

@router.get("/search")
async def search_spotify(request: Request, q: str = None, limit: int = 10):
    if not q:
        return {"items": []}
    
    token_info = request.session.get("spotify_token")
    if not token_info:
        raise HTTPException(status_code=401, detail="Log in required")

    valid_token = sp_oauth.validate_token(token_info)
    if not valid_token:
        raise HTTPException(status_code=401, detail="Session expired")

    if valid_token != token_info:
        request.session["spotify_token"] = valid_token

    sp = Spotify(auth=valid_token['access_token'])
    results = sp.search(q=q, limit=limit, type="track")

    tracks = []
    for track in results['tracks']['items']:
        tracks.append({
            "id": track['id'],
            "name": track['name'],
            "artist": track['artists'][0]['name'],
            "album_art": track['album']['images'][0]['url'] if track['album']['images'] else None
        })

    return {"results": tracks}

    
@router.get("/song/{track_id}")
async def get_song_info(request: Request, track_id: str): 
    token_info = request.session.get("spotify_token")
    if not token_info:
        raise HTTPException(status_code=401, detail="Log in required")

    valid_token = sp_oauth.validate_token(token_info)
    if not valid_token:
        raise HTTPException(status_code=401, detail="Session expired")

    try:
        sp = Spotify(auth=valid_token['access_token'])
        track = sp.track(track_id)

        return {
            "title": track['name'],
            "artist": track['artists'][0]['name'],
            "album": track['album']['name'],
            "release_date": track['album']['release_date'],
            "image_url": track['album']['images'][0]['url'] if track['album']['images'] else None,
            # Use .get() to prevent KeyErrors
            "preview_url": track.get('preview_url'), 
            "duration_ms": track['duration_ms']
        }
    
    except spotipy.exceptions.SpotifyException as e:
        raise HTTPException(status_code=e.http_status, detail=f"Spotify Error: {e.msg}")
    
    except Exception as e:
        import traceback
        print(traceback.format_exc()) 
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")