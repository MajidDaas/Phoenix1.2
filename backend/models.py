# models.py
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any

@dataclass
class Candidate:
    # Core fields present in the provided candidate data snippet
    id: int
    name: str
    position: str  # <-- ADD THIS FIELD
    photo: str
    activity: int
    bio: str

    # --- NEW FIELDS (Add these if they exist in your candidates.json or are needed) ---
    # Private fields (ensure your data_handler.py handles include_private correctly)
    email: str = ""        # <-- Add if present in data
    phone: str = ""        # <-- Add if present in data
    field_of_expertise: str = "" # <-- Add if present in data
    place_of_birth: str = ""     # <-- Add if present in data
    residence: str = ""          # <-- Add if present in data
    # Other potential fields
    isWinner: bool = False # <-- Add if used

    def to_dict(self, include_private: bool = False) -> Dict[str, Any]:
        """Converts the Candidate object to a dictionary."""
        # Use asdict to get all fields defined in the dataclass
        data = asdict(self)
        
        # If private fields should NOT be included, remove them
        # Adjust the list of private keys as needed
        private_keys = ['email', 'phone', 'field_of_expertise', 'place_of_birth', 'residence']
        if not include_private:
            for key in private_keys:
                data.pop(key, None) # Remove key if it exists, do nothing if it doesn't
        
        return data


@dataclass
class Vote:
    id: str
    voter_id: str
    selected_candidates: List[int]
    executive_candidates: List[int]
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        """Converts the Vote object to a dictionary."""
        return asdict(self)

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
    is_open: bool

    def to_dict(self) -> Dict[str, bool]:
        """Converts the ElectionStatus object to a dictionary."""
        return asdict(self)

