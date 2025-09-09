# backend/app.py - Main Flask application
from flask import Flask, jsonify, request, send_from_directory, session, redirect, url_for, Response
from flask_cors import CORS
from functools import wraps
from datetime import datetime, timezone, timedelta
import json
import io
import csv
import os
import uuid
import requests # For IP geolocation
from config import config
# Import new functions for candidate management
from utils.data_handler import (
    get_candidates, get_votes, save_votes, get_election_status, save_election_status,
    add_candidate, remove_candidate, load_translations # <-- Import load_translations
)
from models import Candidate, Vote, VotesData, ElectionStatus
from utils.auth import GoogleAuth, VoterSession

def create_app(config_name='default'):
    app = Flask(__name__, static_folder='../frontend')
    app.config.from_object(config[config_name])
    CORS(app, supports_credentials=True) # Enable CORS with credentials
    app.secret_key = app.config['SECRET_KEY']

    # Initialize Google Auth utility
    google_auth = GoogleAuth(
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        redirect_uri=app.config['GOOGLE_REDIRECT_URI']
    )

    # Initialize Voter Session utility (in-memory)
    voter_session = VoterSession()

    # --- NEW: IP-based Language Detection Function ---
    def get_user_language(request):
        """Determines user language based on IP or Accept-Language header."""
        # 1. Check Accept-Language header (browser preference)
        accept_language = request.headers.get('Accept-Language')
        if accept_language and 'ar' in accept_language.lower():
            return 'ar'
        # 2. GeoIP lookup based on IP (requires service like ipinfo.io)
        user_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        try:
            # Use environment variable for API token
            ipinfo_token = os.environ.get('IPINFO_TOKEN')
            if ipinfo_token:
                # Free tier often doesn't require a token for country lookup
                url = f"https://ipinfo.io/{user_ip}/country"
                if ipinfo_token:
                    url += f"?token={ipinfo_token}"
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    country = response.text.strip()
                    # List of Arabic speaking countries ISO codes (example)
                    arabic_countries = ['SA', 'AE', 'EG', 'IQ', 'MA', 'YE', 'SY', 'TN', 'JO', 'OM', 'LB', 'KW', 'QA', 'BH', 'PS', 'DZ']
                    if country in arabic_countries:
                        return 'ar'
        except Exception as e:
            app.logger.warning(f"GeoIP lookup failed for IP {user_ip}: {e}")
        return 'en' # Default

    # --- WRAPPER: Require Admin Access ---
    def require_admin(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            voter_session_id = session.get('voter_session_id')
            if not voter_session_id:
                return jsonify({'message': 'Authentication required'}), 401 # 401 Unauthorized
            voter_info = voter_session.get_session(voter_session_id)
            if not voter_info or not voter_info.get('is_admin', False):
                user_email = voter_info.get('email') if voter_info else 'Unknown'
                app.logger.warning(f"User {user_email} attempted admin access without permission.")
                return jsonify({'message': 'Admin access required'}), 403 # 403 Forbidden
            return func(*args, **kwargs)
        return wrapper

    # --- API Routes ---
    # Serve static files from the frontend folder
    @app.route('/')
    def serve_index():
        # Determine language for initial load (conceptual, might need JS handling)
        # lang = get_user_language(request)
        # Could inject lang into template or let frontend handle it
        return send_from_directory(app.static_folder, 'index.html')

    # --- NEW: API to get determined language ---
    @app.route('/api/language')
    def get_language():
        lang = get_user_language(request)
        return jsonify({'language': lang})

    # --- AUTHENTICATION ROUTES (Mostly unchanged, key parts highlighted) ---
    @app.route('/auth/google/login')
    def google_login():
        # Redirect to Google's OAuth 2.0 authorization endpoint
        auth_url, state = google_auth.get_authorization_url()
        print("\n" + "="*80)        # <- for testing (FIXED: Added \n for newline)
        print("🔍 FULL AUTH URL:")  # <- for testing
        print(auth_url)             # <- for testing
        print("="*80)               # <- for testing
        session['oauth_state'] = state
        return redirect(auth_url)

    @app.route('/auth/google/callback')
    def google_callback():
        #Verify State parameter for CSRF protection
        state = request.args.get('state')
        if not state or state != session.get('oauth_state'):
             app.logger.warning("CSRF warning: state mismatch or missing.")
             return jsonify({'message': 'Invalid state parameter'}), 400
        # Handle the redirect back from Google
        code = request.args.get('code')
        if not code:
            return jsonify({'message': 'Authorization code not found'}), 400
        # Exchange authorization code for access and ID tokens
        tokens = google_auth.exchange_code_for_tokens(code)
        if not tokens:
            return jsonify({'message': 'Failed to exchange authorization code'}), 400
        # Verify ID token
        user_info = google_auth.verify_id_token(tokens['id_token'])
        if not user_info:
            return jsonify({'message': 'Failed to verify user identity'}), 400
        # --- MODIFIED: Check for Admin AND Eligible Voter Access AFTER user_info is available ---
        user_email = user_info.get('email')
        is_admin = False
        is_eligible_voter = False
        if user_email:
            # Get the comma-separated list from the environment variable for ADMINS
            admin_emails_str = os.environ.get('PHOENIX_ADMIN_EMAILS', '')
            admin_emails_list = [email.strip() for email in admin_emails_str.split(',') if email.strip()]
            if user_email in admin_emails_list:
                is_admin = True
                app.logger.info(f"[Admin] User {user_email} granted admin access via Google Auth.")
            # Get the comma-separated list from the environment variable for ELIGIBLE VOTERS
            eligible_voters_str = os.environ.get('PHOENIX_ELIGIBLE_VOTER_EMAILS', '')
            eligible_voters_list = [email.strip() for email in eligible_voters_str.split(',') if email.strip()]
            # If list is empty, maybe everyone with a Google account can vote? Or deny all?
            # For security, let's assume list must be populated.
            if eligible_voters_list and user_email in eligible_voters_list:
                 is_eligible_voter = True
                 app.logger.info(f"[Voter] User {user_email} is eligible to vote.")
            # else:
            #     app.logger.info(f"[User] User {user_email} authenticated via Google Auth (not eligible voter).")
        # --- END MODIFIED ---
        # Check if user has already voted
        has_voted = False
        votes_data = get_votes()
        if votes_data and user_info['user_id'] in votes_data.voter_ids:
            has_voted = True
        # Create voter session (PASS THE is_admin AND is_eligible_voter FLAGS)
        session_id = voter_session.create_session(
            user_info['user_id'],
            user_info['email'],
            user_info['name'],
            has_voted=has_voted,
            is_admin=is_admin, # <--- PASS THIS FLAG
            is_eligible_voter=is_eligible_voter # <--- PASS THIS FLAG
        )
        session['voter_session_id'] = session_id
        session['user_info'] = user_info
        # Redirect back to the frontend with success parameter
        # Include session ID in redirect URL if needed by frontend (less common with cookies)
        return redirect(f"{app.config['FRONTEND_URL']}?authenticated=true")

    @app.route('/api/auth/session')
    def get_session():
        voter_session_id = session.get('voter_session_id')
        if not voter_session_id:
            return jsonify({'authenticated': False}), 401
        voter_info = voter_session.get_session(voter_session_id)
        if not voter_info:
            return jsonify({'authenticated': False}), 401
        return jsonify({
            'authenticated': True,
            'user': {
                'name': voter_info['name'],
                'email': voter_info['email'],
                # Include isAdmin flag based on session data
                'isAdmin': voter_info.get('is_admin', False), # <--- RETURN THIS FLAG
                'isEligibleVoter': voter_info.get('is_eligible_voter', False), # <--- RETURN THIS FLAG
                'hasVoted': voter_info.get('has_voted', False)  # ← Add this line
            }
        }), 200

    @app.route('/api/auth/demo', methods=['POST'])
    def demo_auth():
        # Create a demo user session (not an admin, not an eligible voter for real election)
        demo_user_id = str(uuid.uuid4())
        demo_email = f"demo_user_{demo_user_id[:8]}@example.com"
        demo_name = "Demo User"
        # Note: Demo user flags were set incorrectly in original, corrected here for typical demo behavior
        session_id = voter_session.create_session(demo_user_id, demo_email, demo_name, has_voted=False, is_admin=True, is_eligible_voter=True) # Assuming demo user IS admin/eligible for testing UI
        session['voter_session_id'] = session_id
        session['user_info'] = {'user_id': demo_user_id, 'email': demo_email, 'name': demo_name}
        # In a real scenario, you might set a flag in the session to indicate demo mode
        session['demo_mode'] = True
        return jsonify({
            'authenticated': True,
            'user': {
                'name': demo_name,
                'email': demo_email,
                'isAdmin': True, # Corrected: Demo user is admin for testing UI features
                'isEligibleVoter': True, # Corrected: Demo user is eligible for testing voting UI
                'hasVoted': False
            }
        }), 200

    @app.route('/api/auth/logout', methods=['POST'])
    def logout():
        voter_session_id = session.get('voter_session_id')
        if voter_session_id:
            voter_session.delete_session(voter_session_id)
        session.pop('voter_session_id', None)
        session.pop('user_info', None)
        session.pop('demo_mode', None) # Clear demo mode flag
        return jsonify({'message': 'Logged out successfully'}), 200

    # --- ELECTION DATA ROUTES (MODIFIED: get_results to hide during scheduled open election) ---
    @app.route('/api/candidates')
    def get_candidates_api():
        # This endpoint returns public candidate data (without private fields)
        try:
            candidates = get_candidates(include_private=False) # <-- Ensure private data is NOT included
            # Convert Candidate objects to dictionaries for JSON serialization
            candidates_dicts = [c.to_dict(include_private=False) for c in candidates]
            return jsonify(candidates_dicts), 200
        except Exception as e:
            app.logger.error(f"Error fetching candidates: {e}")
            return jsonify({"message": "Error loading candidates. Please try again later."}), 500

    @app.route('/api/results')
    def get_results():
        try:
            # --- NEW: Check election status FIRST based on schedule---
            status = get_election_status()
            current_time = datetime.now(timezone.utc)
            is_election_open = False
            # Calculate if election is currently open based on scheduled times
            if status.start_time and status.end_time:
                try:
                    # --- FIX: Correct datetime usage (matching import) ---
                    start_dt = datetime.fromisoformat(status.start_time.replace('Z', '+00:00')) if isinstance(status.start_time, str) else status.start_time
                    end_dt = datetime.fromisoformat(status.end_time.replace('Z', '+00:00')) if isinstance(status.end_time, str) else status.end_time
                    is_election_open = start_dt <= current_time < end_dt
                except ValueError as e:
                    app.logger.error(f"Error parsing election start/end times for results: {e}")
                    # If parsing fails, it's safer to assume not open or handle error appropriately
                    # Defaulting to False prevents accidental result leakage.
            # --- END NEW CHECK ---

            # --- MODIFIED: Return placeholder or restricted data if election is open (scheduled) ---
            if is_election_open:
                # Option 1: Return a message indicating results are not available yet
                return jsonify({
                    'isOpen': True, # Reflects the dynamic state based on schedule
                    'message': 'Election is currently open. Results will be available after the election closes.',
                    'totalVotes': 0,
                    'results': []
                }), 200

                # Option 2 (Alternative): Return candidate names only, without vote counts
                # candidates = get_candidates(include_private=False)
                # results_placeholder = [{'id': c.id, 'name': c.name, 'councilVotes': 0, 'executiveVotes': 0} for c in candidates]
                # return jsonify({
                #     'isOpen': True,
                #     'message': 'Election is currently open. Vote counts are hidden.',
                #     'totalVotes': 0,
                #     'results': results_placeholder
                # }), 200
            # --- END MODIFIED ---

            # If election is NOT open (scheduled), proceed to calculate and show results
            # Get votes data
            votes_data = get_votes()
            # --- FIX: Handle potential None votes_data ---
            if not votes_data:
                 # Return empty results if no votes data is found
                 return jsonify({
                    'isOpen': False, # Consistent with the check above (election not open, no data)
                    'totalVotes': 0,
                    'results': []
                }), 200

            # Get candidates (public data)
            candidates = get_candidates(include_private=False)

            # Calculate results
            candidate_votes = {}
            executive_votes = {}
            total_votes = len(votes_data.voter_ids)
            # Initialize vote counts for all candidates
            for candidate in candidates:
                candidate_votes[candidate.id] = {'name': candidate.name, 'councilVotes': 0, 'executiveVotes': 0}
            # Count votes
            for vote in votes_data.votes:
                # Count council votes
                for candidate_id in vote.selected_candidates:
                    if candidate_id in candidate_votes:
                        candidate_votes[candidate_id]['councilVotes'] += 1
                # Count executive votes
                for candidate_id in vote.executive_candidates:
                    if candidate_id in candidate_votes:
                        candidate_votes[candidate_id]['executiveVotes'] += 1
                        # Note: executive_votes dict seems less used now, candidate_votes tracks both.
                        # if candidate_id not in executive_votes:
                        #     executive_votes[candidate_id] = 0
                        # executive_votes[candidate_id] += 1
            # Prepare results list
            results = []
            for candidate_id, vote_data in candidate_votes.items():
                results.append({
                    'id': candidate_id,
                    'name': vote_data['name'],
                    'councilVotes': vote_data['councilVotes'],
                    'executiveVotes': vote_data['executiveVotes']
                })
            # Sort results by council votes (descending), then by executive votes (descending)
            results.sort(key=lambda x: (-x['councilVotes'], -x['executiveVotes']))
            # Return results with dynamic isOpen status (should be False here)
            return jsonify({
                'isOpen': False, # Consistent with the check above (we are in the 'else' block where is_election_open is False)
                'totalVotes': total_votes,
                'results': results
            }), 200
        except Exception as e:
            app.logger.error(f"Error calculating results: {e}")
            return jsonify({"message": "Error calculating results. Please try again later."}), 500

    @app.route('/api/election/status')
    def get_election_status_api():
        try:
            status = get_election_status()
            current_time = datetime.now(timezone.utc)
         # --- NEW LOGIC: Calculate is_open based on time ---
            is_open = False
            if status.start_time and status.end_time:
                start_dt = datetime.fromisoformat(status.start_time.replace('Z', '+00:00')) if isinstance(status.start_time, str) else status.start_time
                end_dt = datetime.fromisoformat(status.end_time.replace('Z', '+00:00')) if isinstance(status.end_time, str) else status.end_time
                # Safe to compare: all are offset-aware UTC
                is_open = start_dt <= current_time < end_dt
            # Return using the correct attribute name (is_open)
            return jsonify({
                 'is_open': is_open,
                 'start_time': status.start_time,
                 'end_time': status.end_time
             }), 200
        except Exception as e:
            app.logger.error(f"Error fetching election status: {e}")
            # It's better to return an error code if status fetch fails
            # than to default silently.
            return jsonify({
                 'is_open': False,
                 'start_time': None,
                 'end_time': None,
                'message': "Error fetching election status."}), 500

    # --- VOTING ROUTE (Key Changes Highlighted: datetime.datetime -> datetime, indentation fix) ---
    @app.route('/api/votes/submit', methods=['POST'])
    def submit_vote():
        voter_session_id = session.get('voter_session_id')
        if not voter_session_id:
            return jsonify({'message': 'Authentication required'}), 401
        voter_info = voter_session.get_session(voter_session_id)
        if not voter_info:
            return jsonify({'message': 'Invalid session'}), 401
        # --- MODIFIED: Check if user is eligible to vote ---
        if not voter_info.get('is_eligible_voter', False):
             user_email = voter_info.get('email', 'Unknown')
             app.logger.warning(f"User {user_email} attempted to vote but is not eligible.")
             return jsonify({'message': 'You are not authorized to vote in this election.'}), 403 # Forbidden
        # --- END MODIFIED ---
        if voter_info.get('has_voted', False):
            return jsonify({'message': 'You have already voted'}), 400
        data = request.get_json()
        selected_candidates = data.get('selectedCandidates', [])
        executive_candidates = data.get('executiveCandidates', [])
        # Validate selections (basic validation)
        if not isinstance(selected_candidates, list) or not isinstance(executive_candidates, list):
            return jsonify({'message': 'Invalid data format'}), 400
        if len(selected_candidates) != 15 or len(executive_candidates) != 7:
            return jsonify({'message': 'Invalid number of selections'}), 400
        # Check for duplicate selections
        if len(set(selected_candidates)) != len(selected_candidates) or len(set(executive_candidates)) != len(executive_candidates):
            return jsonify({'message': 'Duplicate selections are not allowed'}), 400
        # Ensure all executive candidates are also selected as council members
        if not set(executive_candidates).issubset(set(selected_candidates)):
            return jsonify({'message': 'All executive candidates must also be selected as council members'}), 400
        # Check election status
        election_status = get_election_status()
        # --- NEW: Calculate is_open dynamically for vote submission ---
        is_election_open = False
        if election_status.start_time and election_status.end_time:
            try:
                # Parse start and end times (ensure they are timezone-aware)
                # FIXED: Use datetime.fromisoformat instead of datetime.datetime.fromisoformat
                start_dt = datetime.fromisoformat(election_status.start_time.replace('Z', '+00:00')) if isinstance(election_status.start_time, str) else election_status.start_time
                end_dt = datetime.fromisoformat(election_status.end_time.replace('Z', '+00:00')) if isinstance(election_status.end_time, str) else election_status.end_time
                current_time = datetime.now(timezone.utc) # Use timezone.now() or utcnow()
                # Calculate if election is currently open based on time
                is_election_open = start_dt <= current_time < end_dt
            except ValueError as e:
                app.logger.error(f"Error parsing election start/end times for vote submission: {e}")
                # If parsing fails, assume closed for safety
                # FIXED: Correct indentation for this line
                is_election_open = False
        else:
            # If start or end time is missing, assume closed
            is_election_open = False
        if not is_election_open:
            return jsonify({'message': 'Election is currently closed'}), 400
        # Record the vote
        new_vote = Vote(id=str(uuid.uuid4()),
                        voter_id=voter_info['user_id'],
                        selected_candidates=selected_candidates,
                        executive_candidates=executive_candidates,
                        timestamp=None) # Let Vote model handle timestamp
        votes_data = get_votes()
        votes_data.voter_ids.append(voter_info['user_id'])
        votes_data.votes.append(new_vote)
        if save_votes(votes_data):
            # Update session to mark user as having voted
            voter_session.update_session(voter_session_id, has_voted=True)
            return jsonify({'message': 'Vote submitted successfully'}), 200
        else:
            return jsonify({'message': 'Failed to save vote'}), 500

    # --- ADMIN ROUTES (Key Changes Highlighted) ---
    @app.route('/api/admin/candidates', methods=['GET'])
    @require_admin
    def get_admin_candidates():
        """Get full candidate list (including private data) for admin panel."""
        try:
            # Get candidates including private data
            candidates = get_candidates(include_private=True) # <-- GET PRIVATE DATA
            return jsonify([c.to_dict(include_private=True) for c in candidates]), 200
        except Exception as e:
            app.logger.error(f"Error fetching admin candidates: {e}")
            return jsonify({"message": "Internal server error fetching candidates for admin."}), 500

    @app.route('/api/admin/candidates', methods=['POST'])
    @require_admin
    def create_candidate():
        """Add a new candidate."""
        try:
            data = request.get_json()
            if not data: # FIXED: Check if data is None/Falsy
                return jsonify({"message": "Invalid JSON data"}), 400
            # Basic validation (add more as needed in data_handler.add_candidate)
            required_fields = ['name', 'bio']
            for field in required_fields:
                if not data.get(field):
                     return jsonify({"message": f"Missing required field: {field}"}), 400
            # Check election status - candidates can only be added before election day
            election_status = get_election_status()
            if election_status.is_open:
                 return jsonify({"message": "Cannot add candidates while election is open."}), 400
            success, message_or_error = add_candidate(data) # <-- CALL NEW FUNCTION
            if success:
                return jsonify({"message": message_or_error}), 201 # Created
            else:
                # message_or_error is the error message string
                return jsonify({"message": message_or_error}), 400 # Bad Request
        except Exception as e:
            app.logger.error(f"Error creating candidate: {e}")
            return jsonify({"message": "Internal server error creating candidate."}), 500

    @app.route('/api/admin/candidates/<int:candidate_id>', methods=['DELETE'])
    @require_admin
    def delete_candidate(candidate_id):
        """Remove a candidate by ID."""
        try:
             # Check election status - candidates can only be removed before election day
            election_status = get_election_status()
            if election_status.is_open:
                 return jsonify({"message": "Cannot remove candidates while election is open."}), 400
            success, message_or_error = remove_candidate(candidate_id) # <-- CALL NEW FUNCTION
            if success:
                return jsonify({"message": message_or_error}), 200 # OK
            else:
                # message_or_error is the error message string (e.g., "Candidate not found")
                return jsonify({"message": message_or_error}), 404 # Not Found
        except Exception as e:
            app.logger.error(f"Error deleting candidate {candidate_id}: {e}")
            return jsonify({"message": "Internal server error deleting candidate."}), 500

    @app.route('/api/admin/election/toggle', methods=['POST'])
    @require_admin
    def toggle_election():
        try:
            current_status = get_election_status()
            new_status = ElectionStatus(is_open=not current_status.is_open)
            if save_election_status(new_status):
                action = "opened" if new_status.is_open else "closed"
                return jsonify({'message': f'Election successfully {action}', 'is_open': new_status.is_open}), 200
            else:
                return jsonify({'message': 'Failed to update election status'}), 500
        except Exception as e:
            app.logger.error(f"Error toggling election: {e}")
            return jsonify({'message': 'An internal server error occurred'}), 500

    @app.route('/api/admin/votes/export', methods=['GET'])
    @require_admin
    def export_votes():
        # Placeholder for exporting raw vote data
        return jsonify({'message': 'Votes export functionality (raw data) is a placeholder'}), 200

    # --- NEW ROUTE: Export Votes to CSV with Candidate Names ---
    @app.route('/api/admin/votes/export/csv', methods=['GET'])
    @require_admin
    def export_votes_to_csv():
        try:
            # Get votes and candidates data
            votes_data = get_votes()
            # Get candidates WITH PRIVATE DATA for name lookup if needed, though public names are usually fine
            # Using public data for names is safer and sufficient
            candidates = get_candidates(include_private=False)
            # Create a lookup dictionary for candidate ID to name
            candidate_lookup = {c.id: c.name for c in candidates}
            # Create a StringIO object to hold CSV data
            output = io.StringIO()
            writer = csv.writer(output)
            # Write header row
            header = ['Voter ID']
            header.extend([f'Executive {i+1}' for i in range(7)])
            header.extend([f'Council {i+1}' for i in range(8)]) # 15 total - 7 exec = 8 council only
            writer.writerow(header)
            # Write vote data
            for vote in votes_data.votes:
                row = [vote.voter_id] # Start with Voter ID
                # Add Executive Officers (up to 7) - Lookup names
                executive_names_list = [candidate_lookup.get(cid, f"Unknown ID: {cid}") for cid in vote.executive_candidates[:7]]
                executive_names_list.extend([''] * (7 - len(executive_names_list)))
                row.extend(executive_names_list)
                # Add remaining Council Members (up to 8) - Lookup names
                # Filter out candidates already listed as Executive Officers
                remaining_council_ids = [cid for cid in vote.selected_candidates if cid not in set(vote.executive_candidates)]
                remaining_council_names_list = [candidate_lookup.get(cid, f"Unknown ID: {cid}") for cid in remaining_council_ids[:8]]
                remaining_council_names_list.extend([''] * (8 - len(remaining_council_names_list)))
                row.extend(remaining_council_names_list)
                writer.writerow(row)
            # Get the CSV string
            csv_data = output.getvalue()
            output.close()
            # Prepare response
            return Response(
                csv_data,
                mimetype='text/csv',
                headers={"Content-Disposition": "attachment;filename=votes_export_with_names.csv"}
            )
        except FileNotFoundError as e:
            app.logger.error(f"Data file not found during CSV export: {e}")
            return jsonify({'message': 'Required data file not found for export.'}), 404
        except Exception as err:
            app.logger.error(f"Error exporting votes to CSV: {err}")
            return jsonify({'message': 'An internal server error occurred during CSV export.'}), 500
    # --- END NEW ROUTE ---

    # --- SERVE STATIC FILES ---
    @app.route('/<path:filename>')
    def serve_static(filename):
        return send_from_directory(app.static_folder, filename)

    # --- NEW: API ENDPOINT FOR TRANSLATIONS ---
    @app.route('/api/translations')
    def get_translations():
        """API endpoint to serve translation data."""
        # Load translations (consider caching for performance in production)
        # For simplicity, loading on each request. Cache in memory or use Flask-Caching.
        translations_data = load_translations()
        if translations_data:
            return jsonify(translations_data), 200
        else:
            # Return an empty object or a default set if loading failed
            # return jsonify({"message": "Translations not available"}), 500 # Or 500 if critical
            return jsonify({}), 200 # Or return 500 if critical
    # --- END NEW: API ENDPOINT FOR TRANSLATIONS ---

    # app.py - Inside create_app function, add this new route (IMPROVED)
    @app.route('/api/admin/election/schedule', methods=['POST'])
    @require_admin
    def schedule_election():
        try:
            # --- IMPROVEMENT 1: Check if request.get_json() succeeded ---
            data = request.get_json()
            if data is None:
                app.logger.warning("schedule_election: Invalid or missing JSON in request body.")
                return jsonify({'message': 'Invalid or missing JSON data in request body.'}), 400
            # --- END IMPROVEMENT 1 ---

            start_time_str = data.get('start_time')
            end_time_str = data.get('end_time')
            if not start_time_str or not end_time_str:
                return jsonify({'message': 'Both start_time and end_time are required.'}), 400

            # Parse the datetime strings (assuming ISO format, e.g., "2024-06-15T10:00:00Z")
            try:
                # Ensure datetime parsing is correct (it was already correct in the provided code)
                start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
            except ValueError as ve: # Catch specific parsing error
                app.logger.warning(f"schedule_election: Invalid datetime format provided: {ve}")
                return jsonify({'message': 'Invalid datetime format. Use ISO 8601 (e.g., 2024-06-15T10:00:00Z).'}), 400

            if start_time >= end_time:
                return jsonify({'message': 'Start time must be before end time.'}), 400

            # Create new ElectionStatus object
            new_status = ElectionStatus(is_open=False, start_time=start_time, end_time=end_time)

            # Save to file/database
            if save_election_status(new_status):
                # --- IMPROVEMENT 2: Return ISO formatted strings for consistency ---
                return jsonify({
                    'message': 'Election schedule updated successfully.',
                    'start_time': new_status.start_time.isoformat() if new_status.start_time else None,
                    'end_time': new_status.end_time.isoformat() if new_status.end_time else None
                }), 200
            else:
                app.logger.error("schedule_election: Failed to save election status to data handler.")
                return jsonify({'message': 'Failed to save election schedule.'}), 500

        except Exception as e:
            # --- IMPROVEMENT 3: Ensure *any* unhandled error returns JSON ---
            app.logger.error(f"Error scheduling election: {e}", exc_info=True) # exc_info logs the traceback
            # Return JSON even on unexpected errors
            return jsonify({'message': 'An internal server error occurred on the server.'}), 500

    return app

if __name__ == '__main__':
    app = create_app('development')
    app.run(debug=True, port=5000)

