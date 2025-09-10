// candidates.js - Candidate data management and display logic

const CandidatesModule = {
    // --- Load Candidates from Backend ---
    loadCandidates: async function () {
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
            // Ensure VotingModule.updateUI is called if needed after loading
            if (typeof VotingModule !== 'undefined' && typeof VotingModule.updateUI === 'function') {
                 VotingModule.updateUI();
            }
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
    initCandidates: function (containerId = 'candidateList') {
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

        // Ensure Utils.sortCandidates exists
        let sortedCandidates = [];
        if (typeof Utils !== 'undefined' && typeof Utils.sortCandidates === 'function' && Array.isArray(window.State.candidates)) {
             sortedCandidates = Utils.sortCandidates([...window.State.candidates], sortBy);
        } else {
            console.warn("Utils.sortCandidates not found or window.State.candidates is not an array, using unsorted list.");
            sortedCandidates = Array.isArray(window.State.candidates) ? [...window.State.candidates] : [];
        }

        sortedCandidates.forEach(candidate => {
            const activityClass = candidate.activity >= 5 ? 'activity-high' :
                candidate.activity >= 2 ? 'activity-medium' : 'activity-low';
            const activityText = candidate.activity >= 5 ? 'High Activity' :
                candidate.activity >= 2 ? 'Medium Activity' : 'Low Activity';
            const card = document.createElement('div');
            card.className = 'candidate-item';
            card.dataset.id = candidate.id;
            card.innerHTML = `
                <div class="candidate-main-content">
                    <div class="candidate-info" data-id="${candidate.id}">
                        <i class="fas fa-info"></i>
                    </div>
                    <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                         onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${candidate.name.charAt(0)}'">
                    <div class="candidate-text-info">
                        <div class="candidate-name">${candidate.name}</div>
                        <div class="candidate-position">${candidate.field_of_activity || 'N/A'}</div>
                    </div>
                </div>
                <div class="candidate-activity-and-badge">
                    <div class="activity-indicator ${activityClass}">${activityText}</div>
                </div>
                <div class="candidate-details" id="details-${candidate.id}">
                    <div class="close-details" data-id="${candidate.id}">×</div>
                    <h4>${candidate.name}</h4>
                    <p>${candidate.bio || 'No brief bio available.'}</p>
                    <p><strong>Weekly Activity:</strong> ${candidate.activity} hours</p>
                </div>
            `;

            card.addEventListener('click', (e) => {
                // Check if the click was on the info icon or close button
                if (e.target.closest('.candidate-info') || e.target.closest('.close-details')) {
                    return; // Do nothing, let the specific listeners handle it
                }
                // Otherwise, it's a selection click
                const id = parseInt(card.dataset.id);
                // Ensure VotingModule.selectCandidate exists
                if (typeof VotingModule !== 'undefined' && typeof VotingModule.selectCandidate === 'function') {
                    VotingModule.selectCandidate(id);
                } else {
                    console.warn("VotingModule.selectCandidate is not available.");
                }
            });

            candidateList.appendChild(card);
        });

        // Add event listeners for info icons (for inline details in voting tab)
        document.querySelectorAll('.candidate-info').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the card click event
                const id = parseInt(icon.dataset.id);
                // Ensure VotingModule.showCandidateDetails exists
                if (typeof VotingModule !== 'undefined' && typeof VotingModule.showCandidateDetails === 'function') {
                     VotingModule.showCandidateDetails(id);
                } else {
                     console.warn("VotingModule.showCandidateDetails is not available.");
                }
            });
        });

        // Add event listeners for close buttons (for inline details in voting tab)
        document.querySelectorAll('.close-details').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the card click event
                const id = parseInt(button.dataset.id);
                 // Ensure VotingModule.hideCandidateDetails exists
                if (typeof VotingModule !== 'undefined' && typeof VotingModule.hideCandidateDetails === 'function') {
                    VotingModule.hideCandidateDetails(id);
                } else {
                     console.warn("VotingModule.hideCandidateDetails is not available.");
                }
            });
        });
    },

    // --- Populate Info Tab Candidates (Updated for Popup, no button, showing bio) ---
    displayInfoCandidates: function () {
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

        // Ensure Utils.sortCandidates exists
        let sortedCandidates = [];
        if (typeof Utils !== 'undefined' && typeof Utils.sortCandidates === 'function') {
             sortedCandidates = Utils.sortCandidates([...window.State.candidates], sortBy);
        } else {
            console.warn("Utils.sortCandidates not found, using unsorted list.");
            sortedCandidates = [...window.State.candidates];
        }


        sortedCandidates.forEach(candidate => {
            // Create the main card element
            const infoCard = document.createElement('div');
            infoCard.className = 'candidate-item info-candidate-item'; // Keep existing classes
            infoCard.dataset.id = candidate.id; // Store candidate ID on the card

            const activityClass = candidate.activity >= 5 ? 'activity-high' :
                candidate.activity >= 2 ? 'activity-medium' : 'activity-low';
            const activityText = candidate.activity >= 5 ? 'High Activity' :
                candidate.activity >= 2 ? 'Medium Activity' : 'Low Activity';

            // --- Updated Card Content ---
            // 1. Removed the 'View Full Profile' button.
            // 2. Display 'candidate.bio' directly.
            infoCard.innerHTML = `
                <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                     onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${encodeURIComponent(candidate.name.charAt(0))}'">
                <div class="candidate-name">${candidate.name}</div>
                <div class="candidate-position">${candidate.field_of_activity || 'N/A'}</div>
                <div class="activity-indicator ${activityClass}">${activityText}</div>
                <div class="candidate-bio-preview">
                    <!-- Display the brief bio directly -->
                    <p>${candidate.bio || 'No brief biography available.'}</p>
                </div>
            `;

            // --- Clicking the card triggers the popup ---
            infoCard.addEventListener('click', (e) => {
                // Stop propagation if needed (optional here as no child buttons)
                // e.stopPropagation();

                // Get candidate ID from the card's dataset
                const candidateId = parseInt(infoCard.dataset.id);
                if (!isNaN(candidateId)) {
                    const candidateData = window.State.candidates.find(c => c.id === candidateId);
                    if (candidateData) {
                        // Call the existing popup function
                        this.showCandidatePopup(candidateData);
                    }
                }
            });

            // Append the newly created card to the list container
            infoCandidateListElement.appendChild(infoCard);
        });
    },

    // --- New Function: Show Candidate Details in a Popup/Modal ---
    showCandidatePopup: function (candidate) {
        // - Create the Popup Element if it doesn't exist -
        let popup = document.getElementById('candidateInfoPopup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'candidateInfoPopup';
            popup.className = 'candidate-popup-overlay';
            // Basic inline styles for initial positioning and visibility
            popup.style.display = 'none';
            popup.style.position = 'fixed';
            popup.style.top = '0';
            popup.style.left = '0';
            popup.style.width = '100%';
            popup.style.height = '100%';
            popup.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            popup.style.zIndex = '10000';
            popup.style.justifyContent = 'center';
            popup.style.alignItems = 'center';
            popup.setAttribute('role', 'dialog');
            popup.setAttribute('aria-hidden', 'true'); // Initially hidden

            // - Popup Content Container -
            const popupContent = document.createElement('div');
            popupContent.className = 'candidate-popup-content';
            // Basic inline styles for the content box
            popupContent.style.backgroundColor = 'white';
            popupContent.style.padding = '25px';
            popupContent.style.borderRadius = '15px';
            popupContent.style.maxWidth = '90%';
            popupContent.style.width = '600px'; // Slightly wider for more content
            popupContent.style.maxHeight = '90vh';
            popupContent.style.overflowY = 'auto';
            popupContent.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
            popupContent.style.position = 'relative';

            popupContent.innerHTML = `
                <button class="candidate-popup-close" aria-label="Close" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: #333;">&times;</button>
                <div class="candidate-popup-body">
                    <!-- Content will be inserted here -->
                </div>
            `;
            popup.appendChild(popupContent);
            document.body.appendChild(popup);

            // - Add Event Listeners for Closing -
            popup.querySelector('.candidate-popup-close').addEventListener('click', () => {
                this.hideCandidatePopup();
            });

            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    this.hideCandidatePopup();
                }
            });

            // Optional: Close with Escape key
            const handleKeyDown = (e) => {
                const popupElement = document.getElementById('candidateInfoPopup');
                if (e.key === 'Escape' && popupElement && popupElement.style.display !== 'none') {
                    this.hideCandidatePopup();
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            // Store the handler so it can potentially be removed later if needed
            popup._keydownHandler = handleKeyDown;
        }

        // - Populate the Popup with Candidate Data -
        const popupBody = popup.querySelector('.candidate-popup-body');
        if (popupBody) {
            // --- Determine Activity Class ---
            const activityClass = candidate.activity >= 5 ? 'activity-high' :
                candidate.activity >= 2 ? 'activity-medium' : 'activity-low';
            const activityText = candidate.activity >= 5 ? 'Highly Active' :
                candidate.activity >= 2 ? 'Moderately Active' : 'Less Active';

            // --- Construct Popup Content with All Details ---
            popupBody.innerHTML = `
            <div class="popup-header" style="text-align: center; margin-bottom: 20px;">
                <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-popup-image" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;" onerror="this.src='https://via.placeholder.com/100x100/cccccc/666666?text=${encodeURIComponent(candidate.name.charAt(0))}'">
                <h2 style="margin: 0; color: var(--primary);">${candidate.name}</h2>
                <p style="margin: 5px 0 0 0; font-size: 1.1em; color: var(--secondary);">${candidate.field_of_activity || 'Field of Activity Not Specified'}</p>
                <div class="activity-indicator ${activityClass}" style="margin: 10px auto 0 auto; width: fit-content;">${activityText} (${candidate.activity} hrs/wk)</div>
            </div>

            <div class="popup-details" style="display: grid; grid-template-columns: 1fr; gap: 15px;">

                <div class="detail-section">
                    <h3 style="color: var(--dark); border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0;">Biography</h3>
                    <p style="white-space: pre-wrap;">${candidate.biography || candidate.bio || 'No biography available.'}</p>
                </div>

                <div class="detail-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <h4 style="margin-top: 0; color: var(--dark);">Full Name</h4>
                        <p>${candidate.full_name || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 style="margin-top: 0; color: var(--dark);">Date of Birth</h4>
                        <p>${candidate.date_of_birth || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 style="margin-top: 0; color: var(--dark);">Place of Birth</h4>
                        <p>${candidate.place_of_birth || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 style="margin-top: 0; color: var(--dark);">Residence</h4>
                        <p>${candidate.residence || 'N/A'}</p>
                    </div>
                </div>

                <div class="detail-section">
                    <h3 style="color: var(--dark); border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0;">Contact & Work</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <h4 style="margin-top: 0; color: var(--dark);">Email</h4>
                            <p>${candidate.email ? `<a href="mailto:${candidate.email}" style="color: var(--primary);">${candidate.email}</a>` : 'N/A'}</p>
                        </div>
                        <div>
                            <h4 style="margin-top: 0; color: var(--dark);">Phone</h4>
                            <p>${candidate.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <h4 style="margin-top: 0; color: var(--dark);">Work</h4>
                            <p>${candidate.work || 'N/A'}</p>
                        </div>
                        <div>
                            <h4 style="margin-top: 0; color: var(--dark);">Education</h4>
                            <p>${candidate.education || 'N/A'}</p>
                        </div>
                    </div>
                    ${candidate.facebook_url ?
                        `<div style="margin-top: 10px;">
                            <a href="${candidate.facebook_url}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 5px; color: #4267B2;">
                                <i class="fab fa-facebook-f"></i> Facebook Profile
                            </a>
                        </div>` : ''
                }
                </div>

                 <div class="detail-section">
                    <h3 style="color: var(--dark); border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0;">Activity</h3>
                    <p><strong>Weekly Activity:</strong> ${candidate.activity} hours</p>
                </div>

            </div>
        `;
        }

        // - Show the Popup -
        popup.style.display = 'flex';
        popup.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    },

    // --- New Function: Hide the Candidate Popup ---
    hideCandidatePopup: function () {
        const popup = document.getElementById('candidateInfoPopup');
        if (popup) {
            popup.style.display = 'none';
            popup.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

};
