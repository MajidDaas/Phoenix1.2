// candidates.js - Candidate data management and display logic
const CandidatesModule = {
    // --- Load Candidates from Backend ---
    loadCandidates: async function () {
        const candidateListElement = document.getElementById('candidateList');
        if (!candidateListElement) {
            console.error("Candidate list container (#candidateList) not found in the DOM.");
            return;
        }
        // Use data-i18n for loading text
        candidateListElement.innerHTML = '<div class="loader" data-i18n="loadingCandidates">Loading candidates...</div>';

        // Apply translations for the loader
        if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
            I18nModule.applyTranslations();
        }

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
            // Use data-i18n for all error messages (using closest available keys or new keys)
            candidateListElement.innerHTML = `
                <div class="status-error">
                    <p><i class="fas fa-exclamation-circle"></i> <span data-i18n="candidates.load.error">Failed to load candidate data.</span></p>
                    <p><span data-i18n="loadingResults">Details</span>: ${error.message}</p>
                    <p><span data-i18n="candidates.load.error.refresh">Please try refreshing the page.</span></p>
                </div>
            `;

            // Apply translations for the error message
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
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
            // Define activity text keys.
            const activityTextKey = candidate.activity >= 5 ? 'candidates.activity.high' :
                candidate.activity >= 2 ? 'candidates.activity.medium' : 'candidates.activity.low';

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
                        <div class="candidate-position">${candidate.field_of_activity || '<span data-i18n="common.n_a">N/A</span>'}</div>
                    </div>
                </div>
                <div class="candidate-activity-and-badge">
                    <div class="activity-indicator ${activityClass}" data-i18n="${activityTextKey}">Activity Level</div>
                </div>
                <div class="candidate-details" id="details-${candidate.id}">
                    <div class="close-details" data-id="${candidate.id}">×</div>
                    <h4>${candidate.name}</h4>
                    <p>${candidate.bio || '<span data-i18n="candidates.bio.unavailable">No brief bio available.</span>'}</p>
                    <p><strong><span data-i18n="candidates.activity.weekly">Weekly Activity</span>:</strong> ${candidate.activity} <span data-i18n="common.hours">hours</span></p>
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

        // --- Apply translations to the newly added candidate cards ---
        if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
            I18nModule.applyTranslations();
        }

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
            // Reuse "loadingCandidates" key as a fallback for "not available"
            infoCandidateListElement.innerHTML = '<p data-i18n="loadingCandidates">Loading candidates...</p>';

            // Apply translations for the "not available" message
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
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
            // Define activity text keys for info tab
            const activityTextKey = candidate.activity >= 5 ? 'candidates.activity.high' :
                candidate.activity >= 2 ? 'candidates.activity.medium' : 'candidates.activity.low';

            // --- Updated Card Content ---
            infoCard.innerHTML = `
                <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                     onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${encodeURIComponent(candidate.name.charAt(0))}'">
                <div class="candidate-name">${candidate.name}</div>
                <div class="candidate-position">${candidate.field_of_activity || '<span data-i18n="common.n_a">N/A</span>'}</div>
                <div class="activity-indicator ${activityClass}" data-i18n="${activityTextKey}">Activity Level</div>
                <div class="candidate-bio-preview">
                    <p>${candidate.bio || '<span data-i18n="candidates.bio.unavailable.full">No brief biography available.</span>'}</p>
                </div>
            `;
            // --- Clicking the card triggers the popup ---
            infoCard.addEventListener('click', (e) => {
                const candidateId = parseInt(infoCard.dataset.id);
                if (!isNaN(candidateId)) {
                    const candidateData = window.State.candidates.find(c => c.id === candidateId);
                    if (candidateData) {
                        this.showCandidatePopup(candidateData);
                    }
                }
            });
            // Append the newly created card to the list container
            infoCandidateListElement.appendChild(infoCard);
        });

        // --- Apply translations to the newly added info cards ---
        if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
            I18nModule.applyTranslations();
        }
    },
    // --- New Function: Show Candidate Details in a Popup/Modal ---
    showCandidatePopup: function (candidate) {
        // - Create the Popup Element if it doesn't exist -
        let popup = document.getElementById('candidateInfoPopup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'candidateInfoPopup';
            popup.className = 'candidate-popup-overlay';
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
            popup.setAttribute('aria-hidden', 'true');

            const popupContent = document.createElement('div');
            popupContent.className = 'candidate-popup-content';
            popupContent.style.backgroundColor = 'white';
            popupContent.style.padding = '5px';
            popupContent.style.borderRadius = '5px';
            popupContent.style.maxWidth = '95%';
            popupContent.style.width = '600px';
            popupContent.style.maxHeight = '90vh';
            popupContent.style.overflowY = 'auto';
            popupContent.style.overflowX = 'hidden';
            popupContent.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
            popupContent.style.position = 'relative';
            popupContent.innerHTML = `
                <button class="candidate-popup-close" data-i18n="[aria-label]common.close" aria-label="Close" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5em; cursor: pointer; color: #333;">&times;</button>
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

            const handleKeyDown = (e) => {
                const popupElement = document.getElementById('candidateInfoPopup');
                if (e.key === 'Escape' && popupElement && popupElement.style.display !== 'none') {
                    this.hideCandidatePopup();
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            popup._keydownHandler = handleKeyDown;
        }

        // - Populate the Popup with Candidate Data -
        const popupBody = popup.querySelector('.candidate-popup-body');
        if (popupBody) {
            const activityClass = candidate.activity >= 5 ? 'activity-high' :
                candidate.activity >= 2 ? 'activity-medium' : 'activity-low';
            const activityTextKey = candidate.activity >= 5 ? 'candidates.activity.highly_active' :
                candidate.activity >= 2 ? 'candidates.activity.moderately_active' : 'candidates.activity.less_active';

            popupBody.innerHTML = `
            <div class="popup-header" style="text-align: center; margin-bottom: 20px;">
                <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-popup-image" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;" onerror="this.src='https://via.placeholder.com/100x100/cccccc/666666?text=${encodeURIComponent(candidate.name.charAt(0))}'">
                <h2 style="margin: 0; color: var(--primary);">${candidate.name}</h2>
                <p style="margin: 5px 0 0 0; font-size: 1.1em; color: var(--secondary);">${candidate.field_of_activity || '<span data-i18n="candidates.field.unspecified">Field of Activity Not Specified</span>'}</p>
                <div class="activity-indicator ${activityClass}" data-i18n="${activityTextKey}" style="margin: 10px auto 0 auto; width: fit-content;">
                    Highly Active (X hrs/wk)
                </div>
            </div>
            <div class="popup-details" style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                <div class="detail-section">
                    <h3 style="color: var(--dark); border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0;" data-i18n="briefBiography">Biography</h3>
                    <p style="white-space: pre-wrap;">${candidate.biography || candidate.bio || '<span data-i18n="candidates.bio.unavailable">No biography available.</span>'}</p>
                </div>
                <div class="detail-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <h4 style="margin-top: 0; color: var(--dark);" data-i18n="fullName">Full Name</h4>
                        <p>${candidate.full_name || '<span data-i18n="common.n_a">N/A</span>'}</p>
                    </div>
                    <div>
                        <h4 style="margin-top: 0; color: var(--dark);" data-i18n="dateOfBirth">Date of Birth</h4>
                        <p>${candidate.date_of_birth || '<span data-i18n="common.n_a">N/A</span>'}</p>
                    </div>
                    <div>
                        <h4 style="margin-top: 0; color: var(--dark);" data-i18n="placeOfBirth">Place of Birth</h4>
                        <p>${candidate.place_of_birth || '<span data-i18n="common.n_a">N/A</span>'}</p>
                    </div>
                    <div>
                        <h4 style="margin-top: 0; color: var(--dark);" data-i18n="placeOfResidence">Residence</h4>
                        <p>${candidate.residence || '<span data-i18n="common.n_a">N/A</span>'}</p>
                    </div>
                </div>
                <div class="detail-section">
                    <h3 style="color: var(--dark); border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0;" data-i18n="candidates.popup.contact">Contact & Work</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <h4 style="margin-top: 0; color: var(--dark);" data-i18n="email">Email</h4>
                            <p>${candidate.email ? `<a href="mailto:${candidate.email}" style="color: var(--primary);">${candidate.email}</a>` : '<span data-i18n="common.n_a">N/A</span>'}</p>
                        </div>
                        <div>
                            <h4 style="margin-top: 0; color: var(--dark);" data-i18n="phone">Phone</h4>
                            <p>${candidate.phone || '<span data-i18n="common.n_a">N/A</span>'}</p>
                        </div>
                        <div>
                            <h4 style="margin-top: 0; color: var(--dark);" data-i18n="work">Work</h4>
                            <p>${candidate.work || '<span data-i18n="common.n_a">N/A</span>'}</p>
                        </div>
                        <div>
                            <h4 style="margin-top: 0; color: var(--dark);" data-i18n="Education">Education</h4>
                            <p>${candidate.education || '<span data-i18n="common.n_a">N/A</span>'}</p>
                        </div>
                    </div>
                    ${candidate.facebook_url ?
                        `<div style="margin-top: 10px;">
                            <a href="${candidate.facebook_url}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 5px; color: #4267B2;">
                                <i class="fab fa-facebook-f"></i> <span data-i18n="facebook">Facebook Profile</span>
                            </a>
                        </div>` : ''
                }
                </div>
                 <div class="detail-section">
                    <h3 style="color: var(--dark); border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0;" data-i18n="candidates.popup.activity_section">Activity</h3>
                    <p><strong><span data-i18n="candidates.activity.weekly">Weekly Activity</span>:</strong> ${candidate.activity} <span data-i18n="common.hours">hours</span></p>
                </div>
            </div>
        `;

            // --- Apply translations to the newly created popup content ---
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
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
