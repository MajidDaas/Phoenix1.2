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
            // Clicked on a candidate that is already selected
            if (isExecutive) {
                // --- CHANGE: Clicking an EO removes it completely ---
                // 1. Remove from Executive Officers list (removes orange badge)
                window.State.executiveCandidates = window.State.executiveCandidates.filter(cId => cId !== id);
                console.log(`Removed candidate ID ${id} from Executive Officers (orange badge removed).`);
                // 2. Remove from Selected list (removes green border)
                window.State.selectedCandidates = window.State.selectedCandidates.filter(cId => cId !== id);
                console.log(`Deselected candidate ID ${id} (green border removed).`);
                // --- END CHANGE ---
            } else {
                // It's selected but NOT an Executive Officer.
                // Check if we can promote it to Executive Officer
                if (window.State.executiveCandidates.length < maxExecutives) {
                    window.State.executiveCandidates.push(id);
                    console.log(`Promoted candidate ID ${id} to Executive Officer (added orange badge).`);
                } else {
                    // EO list is full. Interpret click as deselection.
                    window.State.selectedCandidates = window.State.selectedCandidates.filter(cId => cId !== id);
                    console.log(`Deselected candidate ID ${id} (EO list full, green border removed).`);
                }
            }
        } else {
            // Clicked on a candidate that is NOT selected
            if (window.State.selectedCandidates.length < maxSelections) {
                window.State.selectedCandidates.push(id);
                console.log(`Selected candidate ID ${id} (added green border).`);
            } else {
                Utils.showMessage(`You can only select ${maxSelections} council members`, 'error');
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
        if (!window.State.electionOpen) {
            Utils.showMessage('Voting is currently closed', 'error');
            return;
        }

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
                
                // Update user session to mark as voted
                if (window.State.currentUser) {
                    window.State.currentUser.hasVoted = true;
                }
                
                // Update global state
                window.State.userHasVoted = true;
                
                // Reset UI
                this.updateUI();
                
                // Update voting tab content to show thank you message
                if (typeof updateVotingTabContent === 'function') {
                    updateVotingTabContent();
                }
                
                // Switch to results tab
                if (typeof UIController !== 'undefined' && UIController.switchTab) {
                    setTimeout(() => {
                        UIController.switchTab('results');
                    }, 2000);
                }
                
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
        // Make sure activeDetails is defined (from core-init.js)
        if (typeof activeDetails !== 'undefined' && activeDetails) {
            this.hideCandidateDetails(activeDetails);
        }
        const details = document.getElementById(`details-${id}`);
        if (details) {
            details.classList.add('show');
            // Set global activeDetails variable
            if (typeof window !== 'undefined') {
                window.activeDetails = id;
            }
        }
    },

    hideCandidateDetails: function(id) {
        const details = document.getElementById(`details-${id}`);
        if (details) {
            details.classList.remove('show');
            // Clear global activeDetails variable
            if (typeof window !== 'undefined') {
                window.activeDetails = null;
            }
        }
    }
};
