# models.py
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime

@dataclass
class Candidate:
    # --- Core fields present or expected in the application data flow ---
    id: int
    name: str
    photo: str
    bio: str              # Brief biography
    activity: int         # Weekly activity hours
    field_of_activity: str # e.g., 'Med - Scientific Research' - Added as core field

    # --- Private/Optional fields ---
    # These are collected by the admin form and handled by data_handler.py
    biography: str = ""       # Full biography
    full_name: str = ""       # Full legal name
    email: str = ""
    phone: str = ""
    place_of_birth: str = ""
    residence: str = ""
    date_of_birth: str = ""   # Stored as string from form input (type="date")
    work: str = ""
    education: str = "" # Level of Education
    facebook_url: str = "" 

    def to_dict(self, include_private: bool = False) -> Dict[str, Any]:
        """Converts the Candidate object to a dictionary."""
        # Use asdict to get all fields defined in the dataclass
        data = asdict(self)
        
        # Define which keys are considered 'private' and should be conditionally included
        # Updated based on data_handler.py logic for private fields
        private_keys = ['email', 'phone', 'place_of_birth', 'residence']
        
        # If private fields should NOT be included, remove them
        if not include_private:
            for key in private_keys:
                data.pop(key, None) # Remove key if it exists, do nothing if it doesn't
                
        return data

# --- MODIFIED: Vote dataclass ---
@dataclass
class Vote:
    id: str
    voter_id: str                  # Google User ID (sub)
    selected_candidates: List[int]
    executive_candidates: List[int]
    timestamp: str                 # Assuming stored as ISO string
    # --- NEW: Add voter details ---
    voter_name: str = ""          # Voter's full name
    voter_email: str = ""         # Voter's email address
    # --- END NEW ---

    def to_dict(self) -> Dict[str, Any]:
        """Converts the Vote object to a dictionary."""
        # --- MODIFIED: Include new fields in the dictionary ---
        # Using asdict is simpler and includes all fields automatically
        return asdict(self)
        # --- END MODIFIED ---

    # Optional: If you want a more explicit method or need custom logic later:
    # def to_dict(self) -> Dict[str, Any]:
    #     """Converts the Vote object to a dictionary."""
    #     return {
    #         "id": self.id,
    #         "voter_id": self.voter_id,
    #         "selected_candidates": self.selected_candidates,
    #         "executive_candidates": self.executive_candidates,
    #         "timestamp": self.timestamp,
    #         # --- NEW: Include voter details ---
    #         "voter_name": self.voter_name,
    #         "voter_email": self.voter_email
    #         # --- END NEW ---
    #     }

# --- END MODIFIED: Vote dataclass ---

@dataclass
class VotesData:
    voter_ids: List[str]
    votes: List[Vote]

    def to_dict(self) -> Dict[str, Any]:
        """Converts the VotesData object to a dictionary."""
        return {
            "voter_ids": self.voter_ids,
            "votes": [vote.to_dict() for vote in self.votes]
        }

@dataclass
class ElectionStatus:
    # Using __init__ to handle datetime conversion is fine
    def __init__(self, is_open=False, start_time=None, end_time=None):
        self.is_open = is_open
        # Store as ISO format strings for easy JSON serialization
        self.start_time = start_time.isoformat() if isinstance(start_time, datetime) else start_time
        self.end_time = end_time.isoformat() if isinstance(end_time, datetime) else end_time

    def to_dict(self) -> Dict[str, Any]:
        return {
            'is_open': self.is_open,
            'start_time': self.start_time,
            'end_time': self.end_time
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ElectionStatus': # Added type hint for 'data'
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        # Convert strings back to datetime objects if needed for internal logic
        if isinstance(start_time, str):
            try:
                # Handle potential 'Z' suffix or ensure correct format
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            except ValueError:
                start_time = None # Or handle error as appropriate
        if isinstance(end_time, str):
            try:
                # Handle potential 'Z' suffix or ensure correct format
                end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            except ValueError:
                end_time = None # Or handle error as appropriate
        return cls(
            is_open=data.get('is_open', False),
            start_time=start_time,
            end_time=end_time
        )

