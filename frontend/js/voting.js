// voting.js - Voting logic, selection management, and UI updates

const VotingModule = {
    // --- Select Candidate ---
    selectCandidate: function(id) {
        if (!window.State.electionOpen) {
            Utils.showMessage('Voting is currently closed', 'error');
            return;
        }

        if (typeof window.State.candidates === 'undefined' || !Array.isArray(window.State.candidates)) {
            Utils.showMessage('Candidate data is not loaded correctly.', 'error');
            return;
        }

        const candidate = window.State.candidates.find(c => c.id === id);
        if (!candidate) {
            console.warn(`Candidate with ID ${id} not found.`);
            return;
        }

        const isSelected = window.State.selectedCandidates.includes(id);
        const isExecutive = window.State.executiveCandidates.includes(id);

        if (isSelected) {
            if (isExecutive) {
                // Remove from both lists
                window.State.executiveCandidates = window.State.executiveCandidates.filter(cId => cId !== id);
                window.State.selectedCandidates = window.State.selectedCandidates.filter(cId => cId !== id);
                console.log(`Removed candidate ID ${id} from Executive Officers and deselected.`);
            } else {
                // Promote to EO if possible
                if (window.State.executiveCandidates.length < maxExecutives) {
                    window.State.executiveCandidates.push(id);
                    console.log(`Promoted candidate ID ${id} to Executive Officer.`);
                } else {
                    // Show validation popup
                    Utils.showValidationPopup(`Can only choose ${maxExecutives} Executive Officers`);
                    return;
                }
            }
        } else {
            // Select new candidate
            if (window.State.selectedCandidates.length < maxSelections) {
                window.State.selectedCandidates.push(id);
                console.log(`Selected candidate ID ${id}.`);
            } else {
                // Show validation popup
                Utils.showValidationPopup(`Can only choose ${maxSelections} Council Members`);
                return;
            }
        }

        this.updateUI();
    },

    // --- Update UI based on selections ---
    updateUI: function() {
        // Update counters
        const selectedCount = document.getElementById('selectedCount');
        const executiveCount = document.getElementById('executiveCount');
        
        if (selectedCount) selectedCount.textContent = window.State.selectedCandidates.length;
        if (executiveCount) executiveCount.textContent = window.State.executiveCandidates.length;

        // Update candidate cards
        document.querySelectorAll('.candidate-item').forEach(card => {
            const id = parseInt(card.dataset.id);
            const isSelected = window.State.selectedCandidates.includes(id);
            const isExecutive = window.State.executiveCandidates.includes(id);
            
            card.classList.toggle('selected', isSelected);
            card.classList.toggle('executive-selected', isExecutive);

            // Remove existing badges
            const existingBadge = card.querySelector('.priority-badge');
            if (existingBadge) {
                existingBadge.remove();
            }

            // Add new badge if selected
            if (isSelected) {
                const badge = document.createElement('div');
                badge.className = 'priority-badge';
                badge.textContent = window.State.selectedCandidates.indexOf(id) + 1;
                
                if (isExecutive) {
                    badge.classList.add('executive-badge');
                    badge.textContent = window.State.executiveCandidates.indexOf(id) + 1;
                }
                
                card.appendChild(badge);
            }
        });

        // Enable/disable submit button
        const submitVoteBtn = document.getElementById('submitVoteBtn');
        if (submitVoteBtn) {
            const isReady = window.State.selectedCandidates.length === maxSelections && 
                           window.State.executiveCandidates.length === maxExecutives;
            submitVoteBtn.disabled = !isReady;
        }
    },

    // --- Submit Vote ---
    submitVote: async function() {
        if (!window.State.currentUser) {
            Utils.showMessage('You must be authenticated before submitting.', 'error');
            return;
        }
        
        if (window.State.selectedCandidates.length !== maxSelections) {
            Utils.showMessage(`Please select exactly ${maxSelections} candidates`, 'error');
            return;
        }
        
        if (window.State.executiveCandidates.length !== maxExecutives) {
            Utils.showMessage(`Please designate exactly ${maxExecutives} executive officers`, 'error');
            return;
        }

        const submitLoadingElement = document.getElementById('submitLoading');
        const submitVoteBtn = document.getElementById('submitVoteBtn');
        
        if (submitVoteBtn) submitVoteBtn.disabled = true;
        if (submitLoadingElement) submitLoadingElement.classList.remove('hidden');

        try {
            const response = await ElectionAPI.submitVote(window.State.selectedCandidates, window.State.executiveCandidates);
            
            if (response.message && response.message.includes('successfully')) {
                Utils.showMessage(`Vote submitted successfully!
Selected Candidates: ${window.State.selectedCandidates.length}
Executive Officers: ${window.State.executiveCandidates.length}`, 'success');
                
                // Reset selections
                window.State.selectedCandidates = [];
                window.State.executiveCandidates = [];
                
                // Reset UI
                this.updateUI();
                
                // Reset to step 1
                const step1 = document.getElementById('step1');
                const step2 = document.getElementById('step2');
                const step3 = document.getElementById('step3');
                
                if (step1) step1.classList.remove('hidden');
                if (step2) step2.classList.add('hidden');
                if (step3) step3.classList.add('hidden');
                
                // Clear user session
                window.State.currentUser = null;
            } else {
                Utils.showMessage(response.message || 'Failed to submit vote', 'error');
            }
        } catch (err) {
            console.error('Error submitting vote:', err);
            Utils.showMessage('An error occurred while submitting your vote. Please try again.', 'error');
        } finally {
            if (submitVoteBtn) submitVoteBtn.disabled = false;
            if (submitLoadingElement) submitLoadingElement.classList.add('hidden');
        }
    },

    // --- Candidate Details ---
    showCandidateDetails: function(id) {
        if (activeDetails) {
            this.hideCandidateDetails(activeDetails);
        }
        const details = document.getElementById(`details-${id}`);
        if (details) {
            details.classList.add('show');
            activeDetails = id; // This is still a global in core-init.js
        }
    },

    hideCandidateDetails: function(id) {
        const details = document.getElementById(`details-${id}`);
        if (details) {
            details.classList.remove('show');
            activeDetails = null; // This is still a global in core-init.js
        }
    }
};
