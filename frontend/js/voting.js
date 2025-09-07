// voting.js - Voting logic, selection management, and UI updates

const VotingModule = {
    // Flag to ensure search listener is only initialized once
    _searchInitialized: false,

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
        
        if (selectedCount) selectedCount.textContent = `${window.State.selectedCandidates.length}/${maxSelections}`;
        if (executiveCount) executiveCount.textContent = `${window.State.executiveCandidates.length}/${maxExecutives}`;

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

        // --- Initialize Search Listener (only once) ---
        // This ensures the search bar is hooked up after the candidate list is populated
        if (!this._searchInitialized) {
            this.initSearch();
            this._searchInitialized = true;
            console.log("Candidate search listener initialized.");
        }
        // --- End Search Initialization ---
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
    },

    // --- Candidate Search Functionality ---
    // This function is called to attach the search listener after the candidate list is populated
    initSearch: function() {
        const candidateSearchInput = document.getElementById('candidateSearch');
        // Ensure the candidate grid exists (it should by the time updateUI runs)
        const candidateGrid = document.getElementById('candidateList');

        if (candidateSearchInput && candidateGrid) {
            // Remove any existing listener to prevent duplicates (good practice)
            candidateSearchInput.removeEventListener('input', this.handleSearch);
            // Add the input event listener, binding 'this' to the VotingModule context
            candidateSearchInput.addEventListener('input', this.handleSearch.bind(this));
        } else {
            // It's okay if not found initially, maybe candidates haven't loaded yet in some edge case,
            // but updateUI should run again after loading.
            console.warn("Candidate search input or candidate grid not found during initSearch. Retrying might happen on next updateUI call.");
        }
    },

    // The actual search handler function
    handleSearch: function(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        // Select candidate items within the candidate grid
        const candidateItems = document.querySelectorAll('#candidateList .candidate-item');

        candidateItems.forEach(item => {
            const candidateNameElement = item.querySelector('.candidate-name');
            const candidatePositionElement = item.querySelector('.candidate-position');
            
            // Get text content and convert to lowercase for comparison
            const nameText = candidateNameElement ? candidateNameElement.textContent.toLowerCase() : '';
            const positionText = candidatePositionElement ? candidatePositionElement.textContent.toLowerCase() : '';

            // Check if search term is empty (show all) or if it's found within name or position
            if (searchTerm === '' || nameText.includes(searchTerm) || positionText.includes(searchTerm)) {
                item.style.display = ''; // Show item using default CSS display
            } else {
                item.style.display = 'none'; // Hide item
            }
        });
    }
    // --- End Candidate Search Functionality ---
};
