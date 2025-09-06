// core-main.js - App initialization (runs after all modules are loaded)

// --- Ensure window.State exists ---
window.State = window.State || {};
window.State.electionOpen = true; // Default assumption
window.State.userHasVoted = false; // Default assumption

document.addEventListener('DOMContentLoaded', async function () {
    console.log('Phoenix Council Elections frontend initialized');

    // --- Language Initialization ---
    await I18nModule.fetchTranslations();
    let determinedLanguage = 'en';
    try {
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang && translations[savedLang]) {
            console.log(`Using language from localStorage: ${savedLang}`);
            determinedLanguage = savedLang;
        } else {
            console.log("Fetching language from backend API (/api/language)...");
            const langResponse = await fetch('/api/language');
            if (langResponse.ok) {
                const langData = await langResponse.json();
                const backendLang = langData.language;
                if (backendLang && translations[backendLang]) {
                    console.log(`Using language determined by backend: ${backendLang}`);
                    determinedLanguage = backendLang;
                    try {
                        localStorage.setItem('preferredLanguage', determinedLanguage);
                        console.log(`Saved backend-determined language (${determinedLanguage}) to localStorage.`);
                    } catch (e) {
                        console.warn('Could not save backend-determined language to localStorage:', e);
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Error determining initial language preference:', e);
    }
    currentLanguage = determinedLanguage;
    console.log(`Initial language set to: ${currentLanguage}`);
    I18nModule.switchLanguage(currentLanguage);

    const langSwitcher = document.getElementById('languageSwitcher');
    if (langSwitcher) {
        langSwitcher.addEventListener('click', () => {
            const otherLang = currentLanguage === 'en' ? 'ar' : 'en';
            I18nModule.switchLanguage(otherLang);
            try {
                localStorage.setItem('preferredLanguage', otherLang);
                console.log(`Saved manually chosen language (${otherLang}) to localStorage.`);
            } catch (e) {
                console.warn('Could not save manually chosen language to localStorage:', e);
            }
        });
    }

    // --- Initialize App ---
    initDOMElements();
    await CandidatesModule.loadCandidates();
    await AuthModule.checkAuthStatus();
    handleAuthCallback();

    // --- Fetch Initial Election Status and User Vote Status ---
    try {
        const statusResponse = await ElectionAPI.getElectionStatus();
        window.State.electionOpen = statusResponse.is_open !== undefined ? statusResponse.is_open : true;
        window.State.userHasVoted = statusResponse.has_voted !== undefined ? statusResponse.has_voted : false;

        console.log("Initial State - Election Open:", window.State.electionOpen, "User Voted:", window.State.userHasVoted);

        // Update UI based on initial state
        updateVotingTabVisibility();

        // Update election status display (header)
        const electionStatus = document.getElementById('electionStatus');
        if (electionStatus) {
            if (!window.State.electionOpen) {
                electionStatus.innerHTML = '<i class="fas fa-lock"></i> Election is closed'; // Use I18nModule.translate()
                electionStatus.classList.add('closed');
                electionStatus.classList.remove('open');
            } else {
                electionStatus.innerHTML = '<i class="fas fa-lock-open"></i> Election is open'; // Use I18nModule.translate()
                electionStatus.classList.add('open');
                electionStatus.classList.remove('closed');
            }
        }

    } catch (err) {
        console.error('Error fetching initial election status:', err);
        // On error, assume voting is closed or unavailable, hide the tab
        window.State.electionOpen = false;
        window.State.userHasVoted = true;
        updateVotingTabVisibility();
    }

    // --- Ensure a valid initial tab is active AFTER visibility check ---
    // Use window.requestAnimationFrame for potentially better timing than setTimeout(0)
    window.requestAnimationFrame(() => {
        const activeTabAfterUpdate = document.querySelector('.tab.active');
        const activeContentAfterUpdate = document.querySelector('.tab-content.active');
        const votingTabShouldBeHidden = !window.State.electionOpen || window.State.userHasVoted;

        console.log("Post-Update RAF Check - Should Hide Voting Tab:", votingTabShouldBeHidden);

        // If the 'vote' tab is supposed to be hidden but is currently active, switch to another tab
        if (activeTabAfterUpdate && activeTabAfterUpdate.dataset.tab === 'vote' && votingTabShouldBeHidden) {
            console.log("Currently active vote tab should be hidden. Switching...");
            const firstVisibleTabButton = document.querySelector('.tab:not(.hidden)');
            const firstVisibleTabName = firstVisibleTabButton ? firstVisibleTabButton.dataset.tab : null;

            if (firstVisibleTabName) {
                console.log("Switching to first visible tab:", firstVisibleTabName);
                UIController.switchTab(firstVisibleTabName); // switchTab handles display
            } else {
                console.warn("No suitable visible tabs found to switch to!");
                // Explicitly hide the active content if switchTab couldn't run
                if (activeContentAfterUpdate) {
                   activeContentAfterUpdate.classList.remove('active');
                   activeContentAfterUpdate.style.display = 'none'; // Force hide
                }
                if (activeTabAfterUpdate) activeTabAfterUpdate.classList.remove('active');
            }
        }
        // If NO tab is active at all after updates (edge case)
        else if (!document.querySelector('.tab.active')) {
            console.log("No active tab found after visibility update.");
            const firstVisibleTabButton = document.querySelector('.tab:not(.hidden)');
            const firstVisibleTabName = firstVisibleTabButton ? firstVisibleTabButton.dataset.tab : null;

            if (firstVisibleTabName) {
                 console.log("Activating first available visible tab:", firstVisibleTabName);
                 UIController.switchTab(firstVisibleTabName); // switchTab handles display and classes
            } else {
                console.warn("No visible tabs available to activate initially!");
            }
        }
        // If a different tab is active and should remain so, just ensure display is correct
        else {
             const stillActiveContent = document.querySelector('.tab-content.active');
             if (stillActiveContent) {
                 stillActiveContent.style.display = 'block'; // Ensure active content is shown
             }
             // Ensure other contents are hidden (redundancy check)
             document.querySelectorAll('.tab-content:not(.active)').forEach(content => {
                 if (!content.classList.contains('active')) {
                     content.style.display = 'none';
                 }
             });
        }
    });


    // --- Tab switching ---
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            // Let UIController handle the check and switch
            UIController.switchTab(tabName);
        });
    });

    // Admin button (top right corner)
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            UIController.switchTab('admin');
        });
    }

    // --- ✅ RESTORED: Button Event Listeners ---
    const googleSigninBtn = document.getElementById('googleSigninBtn');
    const demoAuthBtn = document.getElementById('demoAuthBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const submitVoteBtn = document.getElementById('submitVoteBtn');
    if (googleSigninBtn) googleSigninBtn.addEventListener('click', AuthModule.signInWithGoogle);
    if (demoAuthBtn) demoAuthBtn.addEventListener('click', AuthModule.demoAuth);
    if (logoutBtn) logoutBtn.addEventListener('click', AuthModule.logout);
    if (submitVoteBtn) submitVoteBtn.addEventListener('click', VotingModule.submitVote);

    // Admin buttons
    const googleAdminSigninBtn = document.getElementById('googleAdminSigninBtn');
    const electionToggle = document.getElementById('electionToggle');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    const exportVotesBtn = document.getElementById('exportVotesBtn');
    const exportVotesToCSVBtn = document.getElementById('exportVotesToCSVBtn');
    const backupToCloudBtn = document.getElementById('backupToCloudBtn');
    if (googleAdminSigninBtn) googleAdminSigninBtn.addEventListener('click', AdminModule.signInWithGoogleForAdmin);
    if (electionToggle) electionToggle.addEventListener('click', AdminModule.toggleElection);
    if (refreshDataBtn) refreshDataBtn.addEventListener('click', AdminModule.refreshData);
    if (exportVotesBtn) exportVotesBtn.addEventListener('click', AdminModule.exportVotes);
    if (exportVotesToCSVBtn) exportVotesToCSVBtn.addEventListener('click', AdminModule.exportVotesToCSV);
    if (backupToCloudBtn) backupToCloudBtn.addEventListener('click', AdminModule.backupToCloud);

    // --- Sorting Event Listeners ---
    const sortVoteSelect = document.getElementById('sortVoteBy');
    if (sortVoteSelect) {
        sortVoteSelect.addEventListener('change', function () {
            CandidatesModule.initCandidates('candidateList');
        });
    }
    const sortInfoSelect = document.getElementById('sortInfoBy');
    if (sortInfoSelect) {
        sortInfoSelect.addEventListener('change', function () {
            CandidatesModule.displayInfoCandidates();
        });
    }

    // Initialize UI
    VotingModule.updateUI();

    // Add click outside listener for candidate details
    document.addEventListener('click', (e) => {
        if (activeDetails && !e.target.closest('.candidate-item')) {
            VotingModule.hideCandidateDetails(activeDetails);
        }
        const winnerInfoPopup = document.getElementById('winnerInfoPopup');
        if (winnerInfoPopup && winnerInfoPopup.style.display === 'block' &&
            !winnerInfoPopup.contains(e.target) &&
            !e.target.closest('.winner-name')) {
            ResultsModule.hideWinnerPopup();
        }
    });
});

// --- Authentication Callback Handler ---
function handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authenticated = urlParams.get('authenticated');
    console.log("Handling auth callback. Authenticated param:", authenticated);
    if (authenticated === 'true') {
        console.log("Redirected from Google OAuth2, checking auth status...");
        AuthModule.checkAuthStatus().then(() => {
             // Potentially re-call updateVotingTabVisibility here if user state changes post-auth
             // e.g., if checking if they voted is part of AuthModule.checkAuthStatus
        });
    }
}

// --- UI Controller for Tab Switching ---
const UIController = {
    switchTab: (tabName) => {
        console.log("Attempting to switch to tab:", tabName);

        // 1. Get the target elements
        const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(tabName);

        // 2. Check if the target tab/content exists and is NOT hidden
        if (!selectedTab || selectedTab.classList.contains('hidden')) {
            console.warn(`Cannot switch to tab button '${tabName}': Tab button is missing or hidden.`);
            return;
        }
        if (!selectedContent || selectedContent.classList.contains('hidden')) {
             console.warn(`Cannot switch to tab content '${tabName}': Tab content is missing or hidden.`);
             return;
        }

        // 3. Proceed with activation: Remove active class from ALL tabs and contents
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none'; // Explicitly hide all content first
        });

        // 4. Add active class and explicitly show the SELECTED tab and content
        selectedTab.classList.add('active');
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block'; // Explicitly show selected content

        console.log(`Successfully switched to tab: ${tabName}`);

        // 5. Trigger specific actions based on the tab switched to
        if (tabName === 'results') {
            if (typeof ResultsModule !== 'undefined' && ResultsModule.renderResults) {
                ResultsModule.renderResults();
            } else {
                console.warn("ResultsModule or renderResults not available.");
            }
        }
        if (tabName === 'admin') {
            // Focus logic if needed
            setTimeout(() => {
                // const adminPasswordInput = document.getElementById('adminPassword');
                // if (adminPasswordInput) adminPasswordInput.focus();
            }, 10);
        }

        // 6. Hide any open popups/details when switching tabs
        if (typeof VotingModule !== 'undefined' && activeDetails) {
            VotingModule.hideCandidateDetails(activeDetails);
        }
        if (typeof ResultsModule !== 'undefined' && ResultsModule.hideWinnerPopup) {
             ResultsModule.hideWinnerPopup();
        }
    }
};

// --- Function to Update Voting Tab Visibility Based on State ---
function updateVotingTabVisibility() {
    const votingTab = document.querySelector('.tab[data-tab="vote"]');
    const votingContent = document.getElementById('vote');
    const electionClosedMessageElement = document.getElementById('electionClosedMessage'); // Inside #vote

    const shouldHideVoting = !window.State.electionOpen || window.State.userHasVoted;

    console.log("updateVotingTabVisibility - Should Hide:", shouldHideVoting, "Election Open:", window.State.electionOpen, "User Voted:", window.State.userHasVoted);

    if (shouldHideVoting) {
        if (votingTab) {
            votingTab.classList.add('hidden');
            console.log("Hiding voting tab button.");
        }
        if (votingContent) {
            votingContent.classList.add('hidden');
            // Do not explicitly set display here, let switchTab/UI handle it if needed
            console.log("Hiding voting content.");
        }
        if (electionClosedMessageElement) {
            electionClosedMessageElement.classList.remove('hidden'); // Show message inside #vote
            console.log("Showing election closed message element.");
        }

    } else {
        if (votingTab) {
            votingTab.classList.remove('hidden');
            console.log("Showing voting tab button.");
        }
        if (votingContent) {
            votingContent.classList.remove('hidden');
            // Do not explicitly set display here
            console.log("Showing voting content.");
        }
        if (electionClosedMessageElement) {
            electionClosedMessageElement.classList.add('hidden'); // Hide message
            console.log("Hiding election closed message element.");
        }
    }
}

