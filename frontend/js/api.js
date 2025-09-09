// api.js - Handles all API calls to the Python backend

const API_BASE_URL = '/api';

class ElectionAPI {
    // --- Vote API ---
    static async requestVoterID(email, phoneLast4) {
        const response = await fetch(`${API_BASE_URL}/votes/request-id`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, phoneLast4 })
        });
        return await response.json();
    }

    // Note: This function is primarily for downloading. The caller handles the response.blob() and download logic.
    static async exportVotesToCSV() {
        return fetch(`${API_BASE_URL}/admin/votes/export/csv`, {
            method: 'GET',
            credentials: 'include' // Ensure session cookie is sent if required
        });
        // Do not parse JSON here as the response is a CSV file blob.
    }

    static async verifyVoterID(voterId) {
        const response = await fetch(`${API_BASE_URL}/votes/verify-id`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ voterId })
        });
        return await response.json();
    }

    static async submitVote(selectedCandidates, executiveCandidates) {
        const response = await fetch(`${API_BASE_URL}/votes/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                 credentials: 'include' // Ensure session cookie is sent
            },
            body: JSON.stringify({ selectedCandidates, executiveCandidates })
        });
        return await response.json();
    }

    // --- Results API ---
    static async getResults() {
        const response = await fetch(`${API_BASE_URL}/results`, {
             credentials: 'include' // Ensure session cookie is sent if needed for access control
        });
        return await response.json();
    }

    // --- Admin API ---
    static async authenticateAdmin(password) {
        const response = await fetch(`${API_BASE_URL}/admin/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        return await response.json();
    }

    static async getElectionStatus() {
        const response = await fetch(`${API_BASE_URL}/election/status`, {
             credentials: 'include' // Ensure session cookie is sent if needed
        });
        return await response.json();
    }

    static async toggleElectionStatus() {
        const response = await fetch(`${API_BASE_URL}/admin/election/toggle`, {
            method: 'POST',
             credentials: 'include' // Ensure session cookie is sent
        });
        return await response.json();
    }

    // --- NEW: Admin API to Add Candidate ---
    /**
     * Adds a new candidate by sending data to the backend.
     * @param {Object} candidateData - The candidate data object.
     * @returns {Promise<Object>} - The parsed JSON response from the server.
     * @throws {Error} - Throws an error if the network request fails or the server returns a non-OK status.
     */
    static async addCandidate(candidateData) {
        const response = await fetch(`${API_BASE_URL}/admin/candidates`, { // <-- FIXED: Corrected URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // DO NOT manually add 'Authorization' header here if using credentials: 'include'
            },
            // Include credentials (e.g., session cookies) for authentication
            credentials: 'include',
            body: JSON.stringify(candidateData)
        });

        // --- RECOMMENDED: Add explicit error handling ---
        // Check if the response status is OK (2xx)
        if (!response.ok) {
            // Try to extract a specific error message from the response body
            let errorMessage = `HTTP error! status: ${response.status} (${response.statusText})`;
            try {
                const errorData = await response.json();
                // Use the message from the backend if available
                if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // If parsing JSON fails or there's no message, use the generic status text
                console.warn("Could not parse error response body as JSON or no 'message' field found.");
            }
            // Throw an error so the calling function (e.g., in admin.js) can catch and handle it
            throw new Error(errorMessage);
        }
        // --- END RECOMMENDED ---

        // If response is OK, parse and return the JSON body
        return await response.json();
    }
    // --- END NEW ---

    // --- NEW: Admin API to Schedule Election ---
    static async scheduleElection(startTime, endTime) {
        const response = await fetch(`${API_BASE_URL}/admin/election/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                 credentials: 'include' // Ensure session cookie is sent
            },
            body: JSON.stringify({
                start_time: startTime,
                end_time: endTime
            })
        });
        return await response.json();
    }
    // --- END NEW ---

    // --- NEW: Admin API to Export Votes (as JSON) ---
    static async exportVotes() {
        const response = await fetch(`${API_BASE_URL}/admin/votes/export`, {
            method: 'GET',
             credentials: 'include' // Ensure session cookie is sent
        });

         if (!response.ok) {
            throw new Error(`Export failed: ${response.statusText}`);
        }

        // Parse the JSON response body (contains vote data)
        const data = await response.json();
        console.log('Exported votes (JSON):', data);
        // In a real app, you might create a downloadable JSON file here
        // const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        // const url = URL.createObjectURL(blob);
        // const a = document.createElement('a');
        // a.href = url;
        // a.download = 'votes_export.json';
        // document.body.appendChild(a);
        // a.click();
        // a.remove();
        // URL.revokeObjectURL(url);

        return data; // Return the data for potential further processing
    }
    // --- END NEW ---
}

// Make it globally available for use in other scripts like admin.js
window.ElectionAPI = ElectionAPI;
