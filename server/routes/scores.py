from fastapi import APIRouter, Request, HTTPException
from database import supabase
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/submit")
async def submit_score(request: Request):
    data = await request.json()
    
    token = request.session.get("spotify_token")
    if not token:
        raise HTTPException(status_code=401, detail="Please log in to save scores.")

    try:
        response = supabase.table("score_record").insert({
            "spotify_id": data['spotify_id'], 
            "track_id": data['track_id'],
            "score_value": data['score_value']
        }).execute()
        return {"message": "Score recorded!", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/leaderboard/{track_id}")
async def get_leaderboard(track_id: str, type: str = "all_time"):
    query = supabase.table("score_record") \
        .select("score_value, created_at, profiles(display_name, avatar_url)") \
        .eq("track_id", track_id) \
        .order("score_value", desc=True) \
        .limit(10)

    # Apply Weekly Filter if requested
    if type == "weekly":
        last_week = (datetime.now() - timedelta(days=7)).isoformat()
        query = query.gte("created_at", last_week)

    try:
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/test-insert")
async def test_insert():
    my_id = "kcxuynuyxto59jzy1rxldu50b" 

    test_data = {
        "spotify_id": my_id,
        "track_id": "7ouMYW7pAIoffSui40Re7t",
        "score_value": 8500,
    }

    try:
        response = supabase.table("score_record").insert(test_data).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}