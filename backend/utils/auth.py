# utils/auth.py
import os
import json
from typing import Optional, Dict, Any
# --- FIX 1: Correct imports ---
# Ensure you have installed google-auth-oauthlib and requests
# pip install google-auth-oauthlib requests
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests # Rename to avoid conflict
import requests as http_requests # For general HTTP requests
import datetime
import uuid # Import uuid here

class GoogleAuth:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

        # OAuth2 scopes for Google Sign-In
        # --- FIX 2: Remove trailing spaces from scope URLs ---
        self.scopes = [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email', # <-- Space removed
            'https://www.googleapis.com/auth/userinfo.profile' # <-- Space removed
        ]

    def get_authorization_url(self) -> tuple[str, str]: # Add return type hint
        """Generate Google OAuth2 authorization URL."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    # --- FIX 3: Remove trailing spaces from auth/token URIs ---
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth", # <-- Space removed
                    "token_uri": "https://oauth2.googleapis.com/token", # <-- Space removed
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )

        return authorization_url, state

    def exchange_code_for_tokens(self, authorization_code: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access and ID tokens."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    # --- FIX 4: Remove trailing spaces from auth/token URIs ---
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth", # <-- Space removed
                    "token_uri": "https://oauth2.googleapis.com/token", # <-- Space removed
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri

        try:
            flow.fetch_token(code=authorization_code)
            return {
                'access_token': flow.credentials.token,
                'id_token': flow.credentials.id_token,
                'refresh_token': flow.credentials.refresh_token
            }
        except Exception as e:
            print(f"Error exchanging code for tokens: {e}")
            return None

    def verify_id_token(self, id_token_str: str) -> Optional[Dict[str, Any]]:
        """Verify Google ID token and extract user information."""
        try:
            # --- FIX 5: Use google_requests.Request() ---
            idinfo = id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(), # <-- Correct import usage
                self.client_id
            )

            # --- FIX 6: Correct issuer check ---
            # Verify the token was issued by Google
            # --- FIX 7: Remove trailing space and add correct issuer ---
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']: # <-- Space removed, added correct issuer
                raise ValueError('Wrong issuer.')

            # Verify the token is for our app
            if idinfo['aud'] != self.client_id:
                raise ValueError('Wrong audience.')

            return {
                'user_id': idinfo['sub'],
                'email': idinfo['email'],
                'name': idinfo.get('name', ''),
                'picture': idinfo.get('picture', ''),
                'email_verified': idinfo.get('email_verified', False)
            }
        except Exception as e:
            print(f"Error verifying ID token: {e}")
            return None

    def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user information from Google API using access token."""
        try:
            # --- FIX 8: Remove trailing space from userinfo URL ---
            response = http_requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo', # <-- Space removed
                headers={'Authorization': f'Bearer {access_token}'}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None

# Voter session management
class VoterSession:
    def __init__(self):
        # --- IMPROVEMENT: Use DATA_FOLDER from config if possible, or ensure path is correct ---
        # Assuming this file is at backend/utils/auth.py and data is at backend/data/
        # This path resolution might need adjustment based on your actual structure.
        # Using os.path.join and going up directories is generally safer.
        current_dir = os.path.dirname(os.path.abspath(__file__)) # backend/utils
        backend_dir = os.path.dirname(current_dir) # backend
        data_dir = os.path.join(backend_dir, 'data') # backend/data
        self.sessions_file = os.path.join(data_dir, 'voter_sessions.json') # backend/data/voter_sessions.json
        self._load_sessions()

    def _load_sessions(self):
        """Load existing voter sessions from file."""
        try:
            with open(self.sessions_file, 'r') as f:
                self.sessions = json.load(f)
        except FileNotFoundError:
            self.sessions = {}
        except json.JSONDecodeError as e:
            print(f"Error decoding voter_sessions.json: {e}. Initializing empty sessions.")
            self.sessions = {}

    def _save_sessions(self):
        """Save voter sessions to file."""
        try:
            os.makedirs(os.path.dirname(self.sessions_file), exist_ok=True)
            with open(self.sessions_file, 'w') as f:
                json.dump(self.sessions, f, indent=2, default=str) # default=str handles datetime serialization
        except Exception as e:
            print(f"Error saving voter sessions to {self.sessions_file}: {e}")

    # --- FIX 9: Update create_session signature to match app.py usage ---
    # --- FIX 10: Add is_eligible_voter parameter ---
    def create_session(self, user_id: str, email: str, name: str, has_voted: bool = False, is_admin: bool = False, is_eligible_voter: bool = True) -> str:
        """Create a new voter session."""
        session_id = str(uuid.uuid4())

        self.sessions[session_id] = {
            'user_id': user_id,
            'email': email,
            'name': name,
            'created_at': datetime.datetime.now().isoformat(), # Use ISO format string
            'has_voted': has_voted, # Accept has_voted
            'is_admin': is_admin,
            'is_eligible_voter': is_eligible_voter # Store is_eligible_voter
        }

        self._save_sessions()
        return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get voter session by session ID."""
        return self.sessions.get(session_id)

    # --- FIX 11: Add update_session method ---
    def update_session(self, session_id: str, **kwargs):
        """Update session data."""
        if session_id in self.sessions:
            self.sessions[session_id].update(kwargs)
            self._save_sessions()

    # --- FIX 12: Add delete_session method ---
    def delete_session(self, session_id: str):
        """Delete a voter session."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            self._save_sessions()

    # --- Optional: Keep the old has_voted method for compatibility or different use ---
    # def has_voted(self, user_id: str) -> bool:
    #     """Check if a user (by user_id) has already voted in any session."""
    #     for session in self.sessions.values():
    #         if session.get('user_id') == user_id and session.get('has_voted', False):
    #             return True
    #     return False

