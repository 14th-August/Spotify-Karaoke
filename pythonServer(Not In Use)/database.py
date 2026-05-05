import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Getting environement variables.
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

# Initialize the Supabase client, need this for starting 
# The DB
supabase: Client = create_client(url, key)

