// voting.js - Voting logic, selection management, and UI updates
const VotingModule = {
    // Flag to ensure search listener is only initialized once
    _searchInitialized: false,
    // --- Select Candidate ---
    selectCandidate: function(id) {
        if (!window.State.electionOpen) {
            Utils.showMessage('<span data-i18n="electionIsClosed">Voting is currently closed</span>', 'error');
            return;
        }
        if (typeof window.State.candidates === 'undefined' || !Array.isArray(window.State.candidates)) {
            Utils.showMessage('<span data-i18n="candidates.load.error">Candidate data is not loaded correctly.</span>', 'error');
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
                window.State.executiveCandidates = window.State.executiveCandidates.filter(cId => cId !== id);
                console.log(`Removed candidate ID ${id} from Executive Officers (orange badge removed).`);
                window.State.selectedCandidates = window.State.selectedCandidates.filter(cId => cId !== id);
                console.log(`Deselected candidate ID ${id} (green border removed).`);
                // --- END CHANGE ---
            } else {
                // It's selected but NOT an Executive Officer.
                if (window.State.executiveCandidates.length < 7) {
                    window.State.executiveCandidates.push(id);
                    console.log(`Promoted candidate ID ${id} to Executive Officer (added orange badge).`);
                } else {
                    window.State.selectedCandidates = window.State.selectedCandidates.filter(cId => cId !== id);
                    console.log(`Deselected candidate ID ${id} (EO list full, green border removed).`);
                }
            }
        } else {
            // Clicked on a candidate that is NOT selected
            if (window.State.selectedCandidates.length < 15) {
                window.State.selectedCandidates.push(id);
                console.log(`Selected candidate ID ${id} (added green border).`);
            } else {
                Utils.showMessage('<span data-i18n="voting.maxCouncilReached">You can only select 15 council members</span>', 'error');
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
        
        if (selectedCount) selectedCount.textContent = `${window.State.selectedCandidates.length}/15`; // Use fixed number or global const
        if (executiveCount) executiveCount.textContent = `${window.State.executiveCandidates.length}/7`; // Use fixed number or global const

         
        // Update candidate cards - ONLY within the voting interface
        const votingInterface = document.getElementById('votingInterface');
        if (votingInterface) {
            votingInterface.querySelectorAll('.candidate-item').forEach(card => {
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
                        badge.textContent = window.State.executiveCandidates.indexOf(id) + 1;
                        badge.classList.add('executive-badge');
                    }
                    card.appendChild(badge);
                }
            });
        } else {
            console.warn("Voting interface container (#votingInterface) not found during UI update.");
        }
        // Enable/disable submit button
        const isReady = window.State.selectedCandidates.length === 15 &&
                        window.State.executiveCandidates.length === 7;
        const submitVoteBtn = document.getElementById('submitVoteBtn');
        if (submitVoteBtn) {
            submitVoteBtn.disabled = !isReady;
            if (isReady) {
                submitVoteBtn.innerHTML = '<span data-i18n="submitVote">Submit Vote</span>';
            } else {
                submitVoteBtn.innerHTML = '<span data-i18n="submitVote">Submit Vote</span>'; // Keep text, just disable
            }
            // Apply translations for the button
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
        }
        // --- Initialize Search Listener (only once) ---
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
            Utils.showMessage('<span data-i18n="electionIsClosed">Voting is currently closed</span>', 'error');
            return;
        }
        if (!window.State.currentUser) {
            Utils.showMessage('<span data-i18n="authenticationRequired">You must be authenticated before submitting.</span>', 'error');
            return;
        }
        if (window.State.selectedCandidates.length !== 15) {
            Utils.showMessage('<span data-i18n="voting.select15Council">Please select exactly 15 candidates</span>', 'error');
            return;
        }
        if (window.State.executiveCandidates.length !== 7) {
            Utils.showMessage('<span data-i18n="voting.designate7Executive">Please designate exactly 7 executive officers</span>', 'error');
            return;
        }
        const submitLoadingElement = document.getElementById('submitLoading');
        const submitVoteBtn = document.getElementById('submitVoteBtn');
        if (submitVoteBtn) submitVoteBtn.disabled = true;
        if (submitLoadingElement) submitLoadingElement.classList.remove('hidden');
        try {
            const response = await ElectionAPI.submitVote(window.State.selectedCandidates, window.State.executiveCandidates);
            if (response.message && response.message.includes('successfully')) {
                const successMessage = `
                    <span data-i18n="thankYouForVoting">Thank You for Voting!</span><br>
                    <span data-i18n="voteSubmittedMessage">Your vote has been successfully recorded.</span>
                `;
                Utils.showMessage(successMessage, 'success');
                // Reset selections
                window.State.selectedCandidates = [];
                window.State.executiveCandidates = [];
                // Update user session
                if (window.State.currentUser) {
                    window.State.currentUser.hasVoted = true;
                }
                window.State.userHasVoted = true;
                // Update UI
                this.updateUI();
                // Update voting tab content
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
                Utils.showMessage(response.message || '<span data-i18n="voting.submitFailed">Failed to submit vote</span>', 'error');
            }
        } catch (err) {
            console.error('Error submitting vote:', err);
            Utils.showMessage('<span data-i18n="voting.submitError">An error occurred while submitting your vote. Please try again.</span>', 'error');
        } finally {
            if (submitVoteBtn) submitVoteBtn.disabled = false;
            if (submitLoadingElement) submitLoadingElement.classList.add('hidden');
        }
    },
    // --- Candidate Details ---
    showCandidateDetails: function(id) {
        if (typeof window.activeDetails !== 'undefined' && window.activeDetails) {
            this.hideCandidateDetails(window.activeDetails);
        }
        const details = document.getElementById(`details-${id}`);
        if (details) {
            details.classList.add('show');
            if (typeof window !== 'undefined') {
                window.activeDetails = id;
            }
        }
    },
    hideCandidateDetails: function(id) {
        const details = document.getElementById(`details-${id}`);
        if (details) {
            details.classList.remove('show');
            if (typeof window !== 'undefined') {
                window.activeDetails = null;
            }
        }
    },
    // --- Candidate Search Functionality ---
    initSearch: function() {
        const candidateSearchInput = document.getElementById('candidateSearch');
        if (candidateSearchInput) {
            candidateSearchInput.removeEventListener('input', this.handleSearch);
            candidateSearchInput.addEventListener('input', this.handleSearch.bind(this));
        } else {
            console.warn("Candidate search input not found during initSearch.");
        }
    },
    handleSearch: function(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        const candidateItems = document.querySelectorAll('#candidateList .candidate-item');
        candidateItems.forEach(item => {
            const candidateNameElement = item.querySelector('.candidate-name');
            const candidatePositionElement = item.querySelector('.candidate-position');
            const nameText = candidateNameElement ? candidateNameElement.textContent.toLowerCase() : '';
            const positionText = candidatePositionElement ? candidatePositionElement.textContent.toLowerCase() : '';
            if (searchTerm === '' || nameText.includes(searchTerm) || positionText.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }
};
