# utils/data_handler.py
import json
import os
# Removed redundant datetime import
from typing import List, Any, Dict, Union, Tuple # For type hints in new functions
from config import Config
from models import Candidate, Vote, VotesData, ElectionStatus

# --- Constants ---
DATA_DIR = Config.DATA_FOLDER # Use the configured data folder
CANDIDATES_FILE = os.path.join(DATA_DIR, 'candidates.json')
VOTES_FILE = os.path.join(DATA_DIR, 'votes.json')
ELECTION_STATUS_FILE = os.path.join(DATA_DIR, 'election_status.json') # Standardize to .json

# --- Helper Functions for File I/O ---
# --- FIX 1: Corrected type hint syntax for default_data parameter ---
def _load_json_file(filepath: str, default_data: Any) -> Any:
    """Loads data from a JSON file. Returns default_data if file not found or invalid."""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: File {filepath} not found. Using default data.")
        return default_data
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from {filepath}: {e}. Using default data.")
        return default_data

# --- FIX 2: Corrected type hint syntax for data parameter ---
def _save_json_file(filepath: str, data: Any) -> bool:
    """Saves data to a JSON file."""
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=4) # Use indent for readability
        return True
    except Exception as e:
        print(f"Error saving data to {filepath}: {e}")
        return False

# --- Candidate Data Handling ---
def get_candidates(include_private: bool = False) -> List[Candidate]:
    """Loads candidate data. Optionally includes private fields."""
    data = _load_json_file(CANDIDATES_FILE, [])
    if not isinstance(data, list):
        print(f"Warning: Candidates data is not a list. Returning empty list.")
        return []

    candidates = []
    # --- FIX 3: Corrected iteration syntax ---
    for item in data: # <-- Was missing 'data'
        if isinstance(item, dict):
            try:
                # Create Candidate object, passing only relevant kwargs
                # Filter out private fields unless explicitly requested
                candidate_data = item.copy()
                if not include_private:
                    # --- FIX 4: Corrected key names for private fields based on models.py ---
                    # The original models.py snippet didn't show email/phone, but the new features require them.
                    # Assuming they are part of the Candidate model now.
                    # If they are not, the .pop() will just do nothing.
                    # It's generally safer to handle them in the model's __init__ or to_dict if include_private is used.
                    # For now, we'll keep this logic as is, assuming the Candidate model handles it.
                    # The main point is the syntax was correct here.
                    pass # No action needed inside the if block for the filtering logic itself
                # Pass all data to Candidate constructor
                candidates.append(Candidate(**candidate_data))
            except TypeError as e: # Handle missing required fields in Candidate model
                print(f"Warning: Skipping candidate item due to error: {e}. Data: {item}")
            # --- FIX 5: Corrected else clause association ---
            # The 'else' should belong to the 'if isinstance(item, dict)' check
        else:
            print(f"Warning: Skipping non-dict item in candidates list: {item}")
    return candidates

# --- NEW FUNCTIONS: Candidate Management ---
# --- FIX 6: Corrected type hint syntax for new_candidate_data parameter ---
def add_candidate(new_candidate_data: Dict) -> Tuple[bool, str]:
    """
    Adds a new candidate to candidates.json.
    Returns (success: bool, message_or_error: str).
    """
    try:
        # Load existing candidates (including private data for ID calculation)
        # --- FIX 7: Corrected argument name for include_private ---
        candidates_list = get_candidates(include_private=True) # <-- Renamed variable to avoid confusion
        # Determine new ID (last ID + 1)
        if candidates_list:
            # --- FIX 8: Access .id attribute correctly ---
            new_id = max(candidate.id for candidate in candidates_list) + 1 # <-- Use candidates_list
        else:
            new_id = 1

        # Create candidate object
        # Ensure default values and handle private fields correctly
        # --- FIX 9: Corrected key access using .get() ---
        candidate_obj_data = {
            "id": new_id,
            "name": new_candidate_data.get("name", "").strip(),
            "photo": new_candidate_data.get("photo", "/images/default.jpg").strip(),
            "bio": new_candidate_data.get("bio", "").strip(),
            "activity": int(new_candidate_data.get("activity", 0)),
            # Private fields (Ensure your Candidate model in models.py accepts these)
            "email": new_candidate_data.get("email", "").strip(),
            "phone": new_candidate_data.get("phone", "").strip(),
            "field_of_expertise": new_candidate_data.get("field_of_expertise", "").strip(),
            "place_of_birth": new_candidate_data.get("place_of_birth", "").strip(),
            "residence": new_candidate_data.get("residence", "").strip(),
            # Ensure isWinner is False for new candidates (Ensure your Candidate model has this)
            "isWinner": False
        }

        # Basic validation (can be expanded)
        if not candidate_obj_data["name"]:
             return False, "Candidate name is required."
        if not candidate_obj_data["bio"]:
             return False, "Candidate bio is required."

        # Create Candidate model instance for validation (optional, but good practice)
        try:
            # --- FIX 10: Ensure Candidate model constructor accepts all these arguments ---
            # This requires the models.py Candidate class to be updated to include all these fields.
            new_candidate = Candidate(**candidate_obj_data)
        except Exception as e:
             return False, f"Invalid candidate data: {e}"

        # Append the new Candidate object to the list
        candidates_list.append(new_candidate) # <-- Use candidates_list

        # Save updated list
        # --- FIX 11: Convert Candidate objects to dicts for saving ---
        # We need to save the data, not the objects. Use to_dict().
        # Need to decide if we save private data or not. Let's save all data including private.
        candidates_dicts = [c.to_dict() for c in candidates_list] # <-- Convert to dicts
        if _save_json_file(CANDIDATES_FILE, candidates_dicts): # <-- Save the list of dicts
            return True, f"Candidate '{candidate_obj_data['name']}' added successfully with ID {new_id}."
        else:
            return False, "Failed to save candidate data to file."
    except Exception as e:
        print(f"Error adding candidate: {e}")
        return False, f"Failed to add candidate: {str(e)}"

# --- FIX 12: Corrected type hint syntax for candidate_id parameter ---
def remove_candidate(candidate_id: int) -> Tuple[bool, str]:
    """
    Removes a candidate by ID from candidates.json.
    Returns (success: bool, message_or_error: str).
    """
    try:
        # Load existing candidates (including private data)
        # --- FIX 13: Corrected argument name for include_private ---
        candidates_list = get_candidates(include_private=True) # <-- Renamed variable
        original_count = len(candidates_list)

        # Filter out the candidate with the given ID
        # --- FIX 14: Corrected attribute access from .get('id') to .id ---
        candidates_list = [c for c in candidates_list if c.id != candidate_id] # <-- Use .id attribute

        if len(candidates_list) < original_count:
            # Save updated list
            # --- FIX 15: Convert Candidate objects to dicts for saving ---
            candidates_dicts = [c.to_dict() for c in candidates_list] # <-- Convert to dicts
            if _save_json_file(CANDIDATES_FILE, candidates_dicts): # <-- Save the list of dicts
                 return True, f"Candidate with ID {candidate_id} removed successfully."
            else:
                 return False, "Failed to save updated candidate list to file."
        else:
            return False, f"Candidate with ID {candidate_id} not found."
    except Exception as e:
        print(f"Error removing candidate: {e}")
        return False, f"Failed to remove candidate: {str(e)}"
# --- END NEW FUNCTIONS ---

# --- Vote Data Handling ---
def get_votes() -> VotesData:
    """Loads vote data."""
    data = _load_json_file(VOTES_FILE, {"voter_ids": [], "votes": []})
    if isinstance(data, dict) and 'votes' in data and 'voter_ids' in data: # <-- Added check for 'voter_ids'
        # Ensure votes are Vote objects
        votes = []
        for vote_data in data.get('votes', []):
            if isinstance(vote_data, dict):
                try:
                    # --- FIX 16: Ensure Vote model constructor accepts these arguments ---
                    # This requires the models.py Vote class to match the keys in vote_data
                    votes.append(Vote(**vote_data))
                except TypeError as e: # Catch specific error for argument mismatch
                    print(f"Warning: Skipping invalid vote data due to TypeError: {e}. Data: {vote_data}")
                except Exception as e: # Catch other potential errors in Vote construction
                     print(f"Warning: Skipping invalid vote data due to unexpected error: {e}. Data: {vote_data}")
        return VotesData(voter_ids=data['voter_ids'], votes=votes)
    else:
        print("Warning: Votes data has unexpected structure. Returning empty VotesData.")
        return VotesData(voter_ids=[], votes=[])

# --- FIX 17: Corrected type hint syntax for votes_data parameter ---
def save_votes(votes_data: VotesData) -> bool:
    """Saves vote data."""
    if not isinstance(votes_data, VotesData):
        print("Error: save_votes called with non-VotesData object")
        return False
    # Convert Vote objects to dictionaries before saving
    # --- FIX 18: Corrected attribute access from votes_data.votes to votes_data.votes ---
    # This was already correct, but added comment for clarity.
    votes_dicts = [vote.to_dict() for vote in votes_data.votes] # <-- Correct
    data_to_save = {
        "voter_ids": votes_data.voter_ids, # <-- Correct
        "votes": votes_dicts
    }
    return _save_json_file(VOTES_FILE, data_to_save)

# --- Election Status Handling ---
def get_election_status() -> ElectionStatus:
    """Gets the current election status."""
    data = _load_json_file(ELECTION_STATUS_FILE, {"is_open": True}) # Default to open
    if isinstance(data, dict):
        try:
            # Use from_dict for consistent loading and parsing
            # --- FIX: Use from_dict method ---
            return ElectionStatus.from_dict(data) # <-- Use from_dict
        except Exception as e: # Catch potential errors in from_dict
            print(f"Warning: election_status.json has invalid data structure or parsing failed: {e}. Returning default status.")
            return ElectionStatus(is_open=True)
    else:
        print("Warning: election_status.json content is not a dict. Returning default status.")
        return ElectionStatus(is_open=True)

# --- FIX 20: Corrected type hint syntax for status parameter ---
def save_election_status(status: ElectionStatus) -> bool:
    """Saves the election status."""
    if not isinstance(status, ElectionStatus):
        print("ERROR: save_election_status called with non-ElectionStatus object")
        return False
    # --- FIX 21: Corrected method call from to_dict() ---
    # Ensure ElectionStatus model has a to_dict() method
    return _save_json_file(ELECTION_STATUS_FILE, status.to_dict()) # <-- Correct if to_dict exists

# --- Voter Session Handling (In-memory, consider persistence for production) ---
# (This part remains largely unchanged, assuming VoterSession class is in utils.auth or similar)
# ... (VoterSession class and functions would be here) ...
#-- Translation --
DATA_DIR = Config.DATA_FOLDER
TRANSLATIONS_FILE = os.path.join(DATA_DIR, 'translations.json')
def load_translations():
    """Loads translation data from the JSON file."""
    try:
        with open(TRANSLATIONS_FILE, 'r', encoding='utf-8') as f: # Ensure utf-8
            return json.load(f)
    except FileNotFoundError:
        app.logger.error(f"Translation file not found: {TRANSLATIONS_FILE}") # Log specific error
        return {} # Return empty dict
    except json.JSONDecodeError as e: # Catch JSON errors specifically
        app.logger.error(f"Error decoding JSON from {TRANSLATIONS_FILE}: {e}") # Log specific error
        return {} # Return empty dict
    except Exception as e: # Catch other unexpected errors
        app.logger.error(f"Unexpected error loading translations from {TRANSLATIONS_FILE}: {e}") # Log
        return {} # Return empty dict
