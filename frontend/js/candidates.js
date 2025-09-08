// candidates.js - Candidate data management and display logic (Updated for Popup)

const CandidatesModule = {
    // --- Load Candidates from Backend ---
    loadCandidates: async function() {
        const candidateListElement = document.getElementById('candidateList');
        if (!candidateListElement) {
            console.error("Candidate list container (#candidateList) not found in the DOM.");
            return;
        }
        candidateListElement.innerHTML = '<div class="loader">Loading candidates...</div>';
        try {
            const response = await fetch('/api/candidates');
            if (!response.ok) {
                throw new Error(`Backend returned error ${response.status}: ${response.statusText}`);
            }
            const candidatesData = await response.json();
            if (!Array.isArray(candidatesData)) {
                 throw new Error("Received candidate data is not in the expected array format.");
            }
            window.State.candidates = candidatesData;
            console.log("Candidates successfully loaded from backend:", candidatesData);
            this.initCandidates('candidateList');
            VotingModule.updateUI();
            this.displayInfoCandidates();
        } catch (error) {
            console.error("Error loading candidates from backend:", error);
            candidateListElement.innerHTML = `
                <div class="status-error">
                    <p><i class="fas fa-exclamation-circle"></i> Failed to load candidate data.</p>
                    <p>Details: ${error.message}</p>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    },

    // --- Initialize Candidates for Voting Tab ---
    initCandidates: function(containerId = 'candidateList') {
        const candidateList = document.getElementById(containerId);
        if (!candidateList) {
            console.error(`candidateList element (#${containerId}) not found`);
            return;
        }
        candidateList.innerHTML = '';

        const sortSelect = document.getElementById('sortVoteBy');
        let sortBy = 'name-asc';
        if (sortSelect) {
            sortBy = sortSelect.value;
        }

        const sortedCandidates = Utils.sortCandidates([...window.State.candidates], sortBy);

        sortedCandidates.forEach(candidate => {
            const activityClass = candidate.activity >= 14 ? 'activity-high' :
                                candidate.activity >= 7 ? 'activity-medium' : 'activity-low';
            const activityText = candidate.activity >= 14 ? 'High Activity' :
                               candidate.activity >= 7 ? 'Medium Activity' : 'Low Activity';
            const card = document.createElement('div');
            card.className = 'candidate-item';
            card.dataset.id = candidate.id;
            card.innerHTML = `
                <div class="candidate-info" data-id="${candidate.id}">
                    <i class="fas fa-info"></i>
                </div>
                <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                     onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${candidate.name.charAt(0)}'">
                <div class="candidate-name">${candidate.name}</div>
                <div class="candidate-position">${candidate.position}</div>
                <div class="activity-indicator ${activityClass}">${activityText}</div>
                <div class="candidate-details" id="details-${candidate.id}">
                    <div class="close-details" data-id="${candidate.id}">×</div>
                    <h4>${candidate.name}</h4>
                    <p>${candidate.bio}</p>
                    <p><strong>Weekly Activity:</strong> ${candidate.activity} hours</p>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.candidate-info') || e.target.closest('.close-details')) {
                    return;
                }
                const id = parseInt(card.dataset.id);
                VotingModule.selectCandidate(id);
            });

            candidateList.appendChild(card);
        });

        // Add event listeners for info icons
        document.querySelectorAll('.candidate-info').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(icon.dataset.id);
                VotingModule.showCandidateDetails(id);
            });
        });

        // Add event listeners for close buttons
        document.querySelectorAll('.close-details').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(button.dataset.id);
                VotingModule.hideCandidateDetails(id);
            });
        });
    },

    // --- Populate Info Tab Candidates (Modified for Popup) ---
    displayInfoCandidates: function() {
        const infoCandidateListElement = document.getElementById('infoCandidateList');
        if (!infoCandidateListElement) {
            console.warn("Info candidate list container (#infoCandidateList) not found.");
            return;
        }
        infoCandidateListElement.innerHTML = '';

        if (!Array.isArray(window.State.candidates) || window.State.candidates.length === 0) {
            infoCandidateListElement.innerHTML = '<p>Candidate information is not available yet.</p>';
            return;
        }

        const sortSelect = document.getElementById('sortInfoBy');
        let sortBy = 'name-asc';
        if (sortSelect) {
            sortBy = sortSelect.value;
        }

        const sortedCandidates = Utils.sortCandidates([...window.State.candidates], sortBy);

        sortedCandidates.forEach(candidate => {
            const infoCard = document.createElement('div');
            infoCard.className = 'candidate-item info-candidate-item';
            infoCard.dataset.id = candidate.id; // Store candidate ID on the card

            const activityClass = candidate.activity >= 14 ? 'activity-high' :
                                candidate.activity >= 7 ? 'activity-medium' : 'activity-low';
            const activityText = candidate.activity >= 14 ? 'High Activity' :
                               candidate.activity >= 7 ? 'Medium Activity' : 'Low Activity';

            // Simplified card content, no inline expansion parts
            infoCard.innerHTML = `
                <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                     onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${candidate.name.charAt(0)}'">
                <div class="candidate-name">${candidate.name}</div>
                <div class="candidate-position">${candidate.position}</div>
                <div class="activity-indicator ${activityClass}">${activityText}</div>
                <div class="candidate-bio-preview">
                    <p>${candidate.bio.substring(0, 100)}${candidate.bio.length > 100 ? '...' : ''}</p>
                    <!-- Button triggers the popup -->
                    <button class="btn btn-outline expand-info-btn" type="button" data-candidate-id="${candidate.id}">
                        <i class="fas fa-user"></i> View Full Profile
                    </button>
                </div>
            `;

            // Clicking the card itself triggers the popup
            infoCard.addEventListener('click', (e) => {
                 // Prevent triggering if clicking the button itself (button has its own listener)
                 if (e.target.closest('.expand-info-btn')) {
                     return;
                 }
                 e.stopPropagation(); // Prevent event bubbling if needed
                 // Get candidate ID from the card's dataset
                 const candidateId = parseInt(infoCard.dataset.id);
                 if (!isNaN(candidateId)) {
                     const candidateData = window.State.candidates.find(c => c.id === candidateId);
                     if (candidateData) {
                         this.showCandidatePopup(candidateData);
                     }
                 }
            });

            // Button click also triggers the popup
            const expandBtn = infoCard.querySelector('.expand-info-btn');
            if (expandBtn) {
                expandBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click event
                    // Get candidate ID from the button's dataset
                    const candidateId = parseInt(expandBtn.dataset.candidateId);
                    if (!isNaN(candidateId)) {
                        const candidateData = window.State.candidates.find(c => c.id === candidateId);
                        if (candidateData) {
                            this.showCandidatePopup(candidateData);
                        }
                    }
                });
            }

            infoCandidateListElement.appendChild(infoCard);
        });
    },

    // --- New Function: Show Candidate Details in a Popup/Modal ---
    showCandidatePopup: function(candidate) {
        // --- Create the Popup Element if it doesn't exist ---
        let popup = document.getElementById('candidateInfoPopup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'candidateInfoPopup';
            popup.className = 'candidate-popup-overlay'; // Use a class for styling
            // Basic inline styles for initial positioning and visibility
            popup.style.display = 'none';
            popup.style.position = 'fixed';
            popup.style.top = '0';
            popup.style.left = '0';
            popup.style.width = '100%';
            popup.style.height = '100%';
            popup.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent background
            popup.style.zIndex = '10000'; // High z-index to appear on top
            popup.style.justifyContent = 'center';
            popup.style.alignItems = 'center';
            popup.setAttribute('role', 'dialog');
            popup.setAttribute('aria-hidden', 'true');
            // --- Popup Content Container ---
            const popupContent = document.createElement('div');
            popupContent.className = 'candidate-popup-content';
            // Basic inline styles for the content box
            popupContent.style.backgroundColor = 'white';
            popupContent.style.padding = '25px';
            popupContent.style.borderRadius = '15px';
            popupContent.style.maxWidth = '90%';
            popupContent.style.width = '500px';
            popupContent.style.maxHeight = '90vh';
            popupContent.style.overflowY = 'auto';
            popupContent.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
            popupContent.style.position = 'relative'; // For close button positioning
            popupContent.innerHTML = `
                <button class="candidate-popup-close" aria-label="Close">&times;</button>
                <div class="candidate-popup-body">
                    <!-- Content will be inserted here -->
                </div>
            `;
            popup.appendChild(popupContent);
            document.body.appendChild(popup);

            // --- Add Event Listeners for Closing ---
            // Close by clicking the X button
            popup.querySelector('.candidate-popup-close').addEventListener('click', () => {
                this.hideCandidatePopup();
            });
            // Close by clicking outside the content area
            popup.addEventListener('click', (e) => {
                if (e.target === popup) { // Check if click was directly on the overlay
                    this.hideCandidatePopup();
                }
            });
            // Optional: Close with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && popup.style.display === 'flex') {
                    this.hideCandidatePopup();
                }
            });
        }

        // --- Populate the Popup with Candidate Data ---
        const popupBody = popup.querySelector('.candidate-popup-body');
        if (popupBody) {
             const activityClass = candidate.activity >= 14 ? 'activity-high' :
                                candidate.activity >= 7 ? 'activity-medium' : 'activity-low';
             const activityText = candidate.activity >= 14 ? 'High Activity' :
                                candidate.activity >= 7 ? 'Medium Activity' : 'Low Activity';

             popupBody.innerHTML = `
                <div class="candidate-popup-header" style="text-align: center; margin-bottom: 20px;">
                    <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-popup-image"
                         style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 15px;"
                         onerror="this.src='https://via.placeholder.com/120x120/cccccc/666666?text=${candidate.name.charAt(0)}'">
                    <h2 style="margin: 0; color: var(--primary);">${candidate.name}</h2>
                    <p style="margin: 5px 0 0 0; font-size: 1.1em; color: var(--secondary);">${candidate.position}</p>
                    <div class="activity-indicator ${activityClass}" style="display: inline-block; margin-top: 10px;">${activityText}</div>
                </div>
                <div class="candidate-popup-details">
                    <h3 style="color: var(--dark); border-bottom: 1px solid #eee; padding-bottom: 5px;">Biography</h3>
                    <p style="white-space: pre-wrap;">${candidate.bio}</p>
                    <h3 style="color: var(--dark); border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 20px;">Activity</h3>
                    <p><strong>Weekly Activity:</strong> ${candidate.activity} hours</p>
                </div>
             `;
        }

        // --- Show the Popup ---
        popup.style.display = 'flex'; // Use flex to center content
        popup.setAttribute('aria-hidden', 'false');
        // Optional: Prevent background scrolling
        document.body.style.overflow = 'hidden';
    },

    // --- New Function: Hide the Candidate Popup ---
    hideCandidatePopup: function() {
        const popup = document.getElementById('candidateInfoPopup');
        if (popup) {
            popup.style.display = 'none';
            popup.setAttribute('aria-hidden', 'true');
            // Re-enable background scrolling
            document.body.style.overflow = '';
        }
    }

};
