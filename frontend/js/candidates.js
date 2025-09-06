// candidates.js - Candidate data management and display logic

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

    // --- Populate Info Tab Candidates ---
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
            infoCard.dataset.id = candidate.id;

            const activityClass = candidate.activity >= 14 ? 'activity-high' :
                                candidate.activity >= 7 ? 'activity-medium' : 'activity-low';
            const activityText = candidate.activity >= 14 ? 'High Activity' :
                               candidate.activity >= 7 ? 'Medium Activity' : 'Low Activity';

            infoCard.innerHTML = `
                <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                     onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${candidate.name.charAt(0)}'">
                <div class="candidate-name">${candidate.name}</div>
                <div class="candidate-position">${candidate.position}</div>
                <div class="activity-indicator ${activityClass}">${activityText}</div>
                <div class="candidate-bio-preview">
                    <p>${candidate.bio.substring(0, 100)}${candidate.bio.length > 100 ? '...' : ''}</p>
                    ${candidate.bio.length > 100 ? '<button class="btn btn-outline expand-info-btn" type="button">View Full Profile</button>' : ''}
                </div>
                <div class="candidate-full-profile hidden">
                     <p>${candidate.bio}</p>
                     <p><strong>Weekly Activity:</strong> ${candidate.activity} hours</p>
                     <button class="btn collapse-info-btn" type="button">Collapse</button>
                </div>
            `;

            infoCard.addEventListener('click', (e) => {
                 if (e.target.closest('.expand-info-btn') || e.target.closest('.collapse-info-btn')) {
                     return;
                 }
                 const preview = infoCard.querySelector('.candidate-bio-preview');
                 const fullProfile = infoCard.querySelector('.candidate-full-profile');
                 if (preview && fullProfile) {
                     preview.classList.add('hidden');
                     fullProfile.classList.remove('hidden');
                 }
            });

            const expandBtn = infoCard.querySelector('.expand-info-btn');
            if (expandBtn) {
                expandBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const preview = infoCard.querySelector('.candidate-bio-preview');
                    const fullProfile = infoCard.querySelector('.candidate-full-profile');
                    if (preview && fullProfile) {
                        preview.classList.add('hidden');
                        fullProfile.classList.remove('hidden');
                    }
                });
            }

            const collapseBtn = infoCard.querySelector('.collapse-info-btn');
            if (collapseBtn) {
                 collapseBtn.addEventListener('click', (e) => {
                     e.stopPropagation();
                     const preview = infoCard.querySelector('.candidate-bio-preview');
                     const fullProfile = infoCard.querySelector('.candidate-full-profile');
                     if (preview && fullProfile) {
                         fullProfile.classList.add('hidden');
                         preview.classList.remove('hidden');
                     }
                 });
            }

            infoCandidateListElement.appendChild(infoCard);
        });
    }
};
