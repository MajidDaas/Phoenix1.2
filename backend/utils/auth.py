# utils/auth.py
import os
import json
from typing import Optional, Dict, Any
import datetime
import uuid

# --- Imports ---
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests  # For token verification
import requests as http_requests  # For general HTTP requests (e.g., userinfo)


class GoogleAuth:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

        # OAuth2 scopes - REMOVED trailing spaces
        self.scopes = [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',   # Fixed
            'https://www.googleapis.com/auth/userinfo.profile'   # Fixed
        ]

    def get_authorization_url(self) -> tuple[str, str]:
        """Generate Google OAuth2 authorization URL."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",      # Fixed: Removed trailing spaces
                    "token_uri": "https://oauth2.googleapis.com/token",           # Fixed: Removed trailing spaces
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes
        )
        flow.redirect_uri = self.redirect_uri

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true' # String is acceptable, boolean (True) also often works
        )

        return authorization_url, state

    def exchange_code_for_tokens(self, authorization_code: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access and ID tokens."""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",      # Fixed: Removed trailing spaces
                    "token_uri": "https://oauth2.googleapis.com/token",           # Fixed: Removed trailing spaces
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
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                self.client_id
            )

            # Validate issuer - REMOVED trailing space from the valid issuer
            # Note: The actual issuer might just be 'accounts.google.com' or 'https://accounts.google.com'
            # depending on the token. It's often safer to check if the issuer STARTS with the base URL.
            # However, for simplicity, let's correct the string.
            valid_issuers = ['accounts.google.com', 'https://accounts.google.com'] # Fixed: Removed trailing space
            if idinfo['iss'] not in valid_issuers:
                 # Alternative, more robust check (uncomment if the above fails):
                 # if not any(idinfo['iss'].startswith(issuer) for issuer in ['https://accounts.google.com', 'accounts.google.com']):
                raise ValueError(f'Wrong issuer. Got: {idinfo["iss"]}')

            # Validate audience
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
        """Get user info from Google API."""
        try:
            # Fixed: Removed trailing space from the URL
            response = http_requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None


# Voter session management
# (This part seems mostly fine, assuming the VoterSession class is used correctly elsewhere)
class VoterSession:
    def __init__(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))  # backend/utils
        backend_dir = os.path.dirname(current_dir)               # backend
        data_dir = os.path.join(backend_dir, 'data')            # backend/data
        self.sessions_file = os.path.join(data_dir, 'voter_sessions.json')
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
                json.dump(self.sessions, f, indent=2, default=str)  # Handles datetime
        except Exception as e:
            print(f"Error saving voter sessions: {e}")

    def create_session(self, user_id: str, email: str, name: str,
                       has_voted: bool = False, is_admin: bool = False,
                       is_eligible_voter: bool = True) -> str:
        """Create a new voter session."""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            'user_id': user_id,
            'email': email,
            'name': name,
            'created_at': datetime.datetime.now().isoformat(),
            'has_voted': has_voted,
            'is_admin': is_admin,
            'is_eligible_voter': is_eligible_voter
        }
        self._save_sessions()
        return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session by ID."""
        return self.sessions.get(session_id)

    def update_session(self, session_id: str, **kwargs):
        """Update session fields."""
        if session_id in self.sessions:
            self.sessions[session_id].update(kwargs)
            self._save_sessions()

    def delete_session(self, session_id: str):
        """Delete a session."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            self._save_sessions()

# Make sure the class is actually instantiated if needed elsewhere,
# or that the app.py correctly imports and uses it.
# e.g., if app.py does `from utils.auth import GoogleAuth, VoterSession`
# and then `google_auth = GoogleAuth(...)` and `voter_session = VoterSession()`
