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
    static async exportVotesToCSV() {
        // This function will primarily be called for its side effect (file download)
        // Returning the fetch promise allows the caller to handle potential errors during the initial request.
        return fetch(`${API_BASE_URL}/admin/votes/export/csv`, {
            method: 'GET',
            // credentials: 'include' // Uncomment if you need to send cookies/session
        });
        // Note: We don't parse JSON here because the response is expected to be a CSV file blob.
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ selectedCandidates, executiveCandidates })
        });
        return await response.json();
    }

    // --- Results API ---
    static async getResults() {
        const response = await fetch(`${API_BASE_URL}/results`);
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
        const response = await fetch(`${API_BASE_URL}/election/status`);
        return await response.json();
    }

    static async toggleElectionStatus() {
        const response = await fetch(`${API_BASE_URL}/admin/election/toggle`, {
            method: 'POST'
        });
        return await response.json();
    }
    
    // --- NEW: Admin API to Schedule Election ---
    static async scheduleElection(startTime, endTime) {
        const response = await fetch(`${API_BASE_URL}/admin/election/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start_time: startTime,
                end_time: endTime
            })
        });
        return await response.json();
    }

    static async exportVotes() {
        // This would typically be a direct link or a more complex download
        // For now, we'll fetch the data and log it
        const response = await fetch(`${API_BASE_URL}/admin/votes/export`);
        const data = await response.json();
        console.log('Exported votes:', data);
        // In a real app, you might create a downloadable file
        // const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        // const url = URL.createObjectURL(blob);
        // const a = document.createElement('a');
        // a.href = url;
        // a.download = 'votes.json';
        // document.body.appendChild(a);
        // a.click();
        // document.body.removeChild(a);
        // URL.revokeObjectURL(url);
    }
}

// Make it globally available
window.ElectionAPI = ElectionAPI;
