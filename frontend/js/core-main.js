// core-main.js - App initialization (runs after all modules are loaded)
// --- Ensure window.State exists ---
window.State = window.State || {};
window.State.electionOpen = true; // Default assumption
window.State.userHasVoted = false; // Default assumption
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Phoenix Council Elections frontend initialized');

    // --- Show Skeleton Screen on Auth Screen Initially ---
    const authScreen = document.getElementById('authScreen');
    const authSkeletonScreen = document.getElementById('authSkeletonScreen');
    let authSkeletonShown = false;
    if (authScreen && authSkeletonScreen) {
        authScreen.style.display = 'flex'; // Ensure auth screen is visible to show skeleton over it
        authSkeletonScreen.style.display = 'flex';
        authSkeletonShown = true;
        console.log("Initial auth skeleton screen shown.");
    }

    // --- Language Initialization ---
    try {
        await I18nModule.fetchTranslations();
    } catch (error) {
        console.error("Failed to fetch translations:", error);
        // Decide how to handle translation loading failure
    }

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
            } else {
                 console.warn("Language API request failed with status:", langResponse.status);
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

    // --- Initialize App DOM Elements ---
    initDOMElements();

    // --- Start Loading Candidates (Independent of Auth) ---
    const candidatesLoadPromise = CandidatesModule.loadCandidates().catch(err => {
         console.error("Error loading candidates (initial):", err);
         // Handle candidate loading error if critical for initial display
    });

    // --- Start Checking Auth Status ---
    // This is the key check. We wait for it to complete.
    let isAuthenticated = false;
    try {
        isAuthenticated = await AuthModule.checkAuthStatus();
        console.log("Auth check completed. Is authenticated:", isAuthenticated);
    } catch (authErr) {
        console.error("Error during initial auth check:", authErr);
        isAuthenticated = false; // Default to not authenticated on error
    }

    // --- Handle Auth Callback (if this was a redirect from login) ---
    // This might trigger another auth check, but it's quick.
    handleAuthCallback();

    // --- Fetch Initial Election Status and User Vote Status (if authenticated) ---
    let electionStatusFetched = false;
    if (isAuthenticated) {
        try {
            const statusResponse = await ElectionAPI.getElectionStatus();
            window.State.electionOpen = statusResponse.is_open !== undefined ? statusResponse.is_open : true;
            window.State.userHasVoted = statusResponse.has_voted !== undefined ? statusResponse.has_voted : false;
            console.log("Initial State - Election Open:", window.State.electionOpen, "User Voted:", window.State.userHasVoted);
            electionStatusFetched = true;
        } catch (err) {
            console.error('Error fetching initial election status:', err);
            // On error, assume defaults (set above) or specific safe defaults
            window.State.electionOpen = false; // Safer default on error if authenticated
            window.State.userHasVoted = true; // Assume voted to prevent voting if status unknown
        }
    } else {
        // If not authenticated, ensure state reflects that
        window.State.electionOpen = true; // Default, will be checked on login
        window.State.userHasVoted = false;
    }

    // --- Hide Auth Skeleton Screen ---
    // Do this as soon as we know auth status, regardless of other loads.
    if (authSkeletonShown && authSkeletonScreen) {
        authSkeletonScreen.style.display = 'none';
        console.log("Auth skeleton screen hidden.");
    }

    // --- Update UI Visibility Based on Authentication Result ---
    const mainApp = document.getElementById('mainApp');
    if (isAuthenticated) {
        // User is authenticated, show main app, hide auth screen
        if (authScreen) authScreen.style.display = 'none';
        if (mainApp) {
            mainApp.classList.remove('hidden');
            mainApp.style.display = 'block';
            console.log("Main app shown.");
        }
        // Update election status display (header)
        const electionStatus = document.getElementById('electionStatus');
        if (electionStatus && electionStatusFetched) {
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
        // Update voting tab content based on final state
        updateVotingTabContent();
        // Initialize UI elements that depend on candidates/auth being checked
        VotingModule.updateUI(); // This might need to wait for candidates, but usually handles it

    } else {
        // User is NOT authenticated, ensure auth screen is visible and main app is hidden
        if (authScreen) authScreen.style.display = 'flex'; // Explicitly show
        if (mainApp) mainApp.classList.add('hidden'); // Explicitly hide
        console.log("Auth screen shown, main app hidden (not authenticated).");
    }

    // --- Wait for other non-critical initial loads if needed ---
    // Although candidates are loaded, other stats etc. might need final data
    // We can wait for them here if updateVotingTabContent or other parts need them
    // to be fully done. For now, proceeding as UI is already updated based on auth.
    try {
         await Promise.all([candidatesLoadPromise]); // Add other promises if needed
         console.log("Non-critical initial data loaded.");
    } catch (error) {
         console.error("One or more non-critical initial loads failed:", error);
         // UI should still be functional
    }


    // --- Ensure a valid initial tab is active (only if main app is shown) ---
    if (isAuthenticated && mainApp && !mainApp.classList.contains('hidden')) {
        setTimeout(() => {
            const activeTab = document.querySelector('.tab.active');
            // If NO tab is active at all, activate the first available tab
            if (!activeTab) {
                console.log("No active tab found, activating first tab.");
                // Prefer non-hidden tabs, fallback to any tab
                const firstTab = document.querySelector('.tab:not(.hidden-by-status)') || document.querySelector('.tab');
                if (firstTab) {
                    UIController.switchTab(firstTab.dataset.tab);
                }
            }
        }, 100); // Slight delay to ensure DOM is ready
    }

    // --- Tab switching (attach listeners) ---
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
    // Re-attach logout buttons from thank you and closed cards if they exist in your HTML
    const logoutBtnThankYou = document.getElementById('logoutBtnThankYou');
    const logoutBtnClosed = document.getElementById('logoutBtnClosed');
    const logoutBtnNotRegistered = document.getElementById('logoutBtnNotRegistered');

    if (googleSigninBtn) googleSigninBtn.addEventListener('click', AuthModule.signInWithGoogle);
    if (demoAuthBtn) demoAuthBtn.addEventListener('click', AuthModule.demoAuth);
    if (logoutBtn) logoutBtn.addEventListener('click', AuthModule.logout);
    if (logoutBtnThankYou) logoutBtnThankYou.addEventListener('click', AuthModule.logout);
    if (logoutBtnClosed) logoutBtnClosed.addEventListener('click', AuthModule.logout);
    if (logoutBtnNotRegistered) logoutBtnNotRegistered.addEventListener('click', AuthModule.logout);
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


    // Add click outside listener for candidate details and winner popup
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
        console.log("Redirected from Google OAuth2, re-checking auth status...");
        // The main flow in DOMContentLoaded will handle the UI update after this check.
        // We just need to ensure the state is correct.
        AuthModule.checkAuthStatus().then((isAuth) => {
             console.log("Auth check after callback. Is authenticated:", isAuth);
             // The main DOMContentLoaded flow will proceed and update UI based on window.State
             // which checkAuthStatus updated. No need to call updateVotingTabContent here
             // as it will be called by the main flow.
        }).catch(err => {
             console.error("Error re-checking auth status after callback:", err);
             // Main flow will handle UI based on window.State.currentUser being null
        });
        // Clear the URL parameter to avoid re-triggering on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}
// --- UI Controller for Tab Switching (No changes needed here) ---
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
// --- Function to Update Voting Tab Content Based on State (No changes needed here) ---
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
