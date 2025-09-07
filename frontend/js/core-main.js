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
        updateVotingTabContent();

        // Update election status display (header)
        const electionStatus = document.getElementById('electionStatus');
        if (electionStatus) {
            if (!window.State.electionOpen) {
                electionStatus.innerHTML = '<i class="fas fa-lock"></i> Election is closed';
                electionStatus.classList.add('closed');
                electionStatus.classList.remove('open');
            } else {
                electionStatus.innerHTML = '<i class="fas fa-lock-open"></i> Election is open';
                electionStatus.classList.add('open');
                electionStatus.classList.remove('closed');
            }
        }

    } catch (err) {
        console.error('Error fetching initial election status:', err);
        // On error, assume voting is closed or unavailable
        window.State.electionOpen = false;
        window.State.userHasVoted = true;
        updateVotingTabContent();
    }

    // --- Ensure a valid initial tab is active ---
    setTimeout(() => {
        const activeTab = document.querySelector('.tab.active');
        
        // If NO tab is active at all, activate the first available tab
        if (!activeTab) {
            console.log("No active tab found, activating first tab.");
            const firstTab = document.querySelector('.tab');
            if (firstTab) {
                UIController.switchTab(firstTab.dataset.tab);
            }
        }
    }, 100);

    // --- Tab switching ---
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
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
        if (typeof activeDetails !== 'undefined' && activeDetails && !e.target.closest('.candidate-item')) {
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
            // Re-check voting tab content after auth status changes
            updateVotingTabContent();
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

        // 2. Check if the target tab/content exists
        if (!selectedTab) {
            console.warn(`Cannot switch to tab button '${tabName}': Tab button is missing.`);
            return;
        }
        if (!selectedContent) {
            console.warn(`Cannot switch to tab content '${tabName}': Tab content is missing.`);
            return;
        }

        // 3. Proceed with activation: Remove active class from ALL tabs and contents
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        // 4. Add active class and explicitly show the SELECTED tab and content
        selectedTab.classList.add('active');
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block';

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
            setTimeout(() => {
                // Focus logic if needed
            }, 10);
        }
        if (tabName === 'vote') {
            // Update voting content based on current state when switching to vote tab
            updateVotingTabContent();
        }

        // 6. Hide any open popups/details when switching tabs
        if (typeof VotingModule !== 'undefined' && typeof activeDetails !== 'undefined' && activeDetails) {
            VotingModule.hideCandidateDetails(activeDetails);
        }
        if (typeof ResultsModule !== 'undefined' && ResultsModule.hideWinnerPopup) {
            ResultsModule.hideWinnerPopup();
        }
    }
};

// --- Function to Update Voting Tab Content Based on State ---
function updateVotingTabContent() {
    const votingInterface = document.getElementById('votingInterface');
    const electionClosedMessageElement = document.getElementById('electionClosedMessage');
    const thankYouMessageElement = document.getElementById('thankYouMessage');
    const notRegisteredCard = document.getElementById('notRegisteredCard');

    console.log("updateVotingTabContent - Election Open:", window.State.electionOpen, "User Voted:", window.State.userHasVoted);

    // Always hide all messages first
    if (electionClosedMessageElement) {
        electionClosedMessageElement.classList.add('hidden');
    }
    if (thankYouMessageElement) {
        thankYouMessageElement.classList.add('hidden');
    }
    if (notRegisteredCard) {
        notRegisteredCard.classList.add('hidden');
    }
    if (votingInterface) {
        votingInterface.classList.add('hidden');
    }

    // Show appropriate content based on state
    if (window.State.userHasVoted) {
        // User has already voted - show thank you message
        if (thankYouMessageElement) {
            thankYouMessageElement.classList.remove('hidden');
            console.log("Showing thank you message.");
        }
    } else if (!window.State.electionOpen) {
        // Election is closed and user hasn't voted - show closed message
        if (electionClosedMessageElement) {
            electionClosedMessageElement.classList.remove('hidden');
            console.log("Showing election closed message.");
        }
    } else {
        // Election is open and user hasn't voted - show voting interface
        if (votingInterface) {
            votingInterface.classList.remove('hidden');
            console.log("Showing voting interface.");
        }
    }
}
