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
window.State.electionStartTime = statusResponse.start_time || null;
window.State.electionEndTime = statusResponse.end_time || null;
window.State.userHasVoted = (window.State.currentUser && window.State.currentUser.hasVoted) ? window.State.currentUser.hasVoted : false;
electionStatusFetched = true; // ✅ ADD THIS LINE
console.log("Initial State - Election Open:", window.State.electionOpen, "User Voted:", window.State.userHasVoted);

        } catch (err) {
            console.error('Error fetching initial election status:', err);
            // On error, assume election is closed for safety.
            window.State.electionOpen = false;
            // Do NOT assume userHasVoted. Keep it as false or use the value from the user session.
            // The UI will show the "Election Closed" message, which is accurate if the status is unknown.

            // Show a system error message to the user for better UX.
            if (typeof Utils !== 'undefined' && typeof Utils.showMessage === 'function') {
                Utils.showMessage('Unable to verify election status. Please refresh the page or try again later.', 'error');
            } else {
                alert('System Error: Unable to verify election status.');
            }
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
            // Get the schedule from the global state (set in the API call below)
            const startTime = window.State.electionStartTime ? new Date(window.State.electionStartTime) : null;
            const endTime = window.State.electionEndTime ? new Date(window.State.electionEndTime) : null;
            const now = new Date();

            let displayText = '';
            let cssClass = '';

            if (!startTime || !endTime) {
                // No schedule set
                displayText = '<i class="fas fa-exclamation-triangle"></i> No election scheduled';
                cssClass = 'warning';
            } else if (now < startTime) {
                // Election hasn't started yet
                const timeDiff = startTime - now;
                displayText = `<i class="fas fa-clock"></i> Opens in ${formatCountdown(timeDiff)}`;
                cssClass = 'warning';
            } else if (now >= endTime) {
                // Election has ended
                displayText = '<i class="fas fa-lock"></i> Election Closed';
                cssClass = 'closed';
            } else {
                // Election is currently open
                const timeDiff = endTime - now;
                displayText = `<i class="fas fa-clock"></i> Closes in ${formatCountdown(timeDiff)}`;
                cssClass = 'open';
            }

            electionStatus.innerHTML = displayText;
            // Remove all status classes
            electionStatus.classList.remove('open', 'closed', 'warning');
            // Add the appropriate class
            electionStatus.classList.add(cssClass);

            // --- START COUNTDOWN TIMER ---
            // Clear any existing timer to avoid duplicates
            if (window.electionStatusTimer) {
                clearInterval(window.electionStatusTimer);
            }
            // Set a new timer to update every minute
            window.electionStatusTimer = setInterval(() => {
                updateElectionStatusDisplay(); // We'll define this function below
            }, 1000); // Update every 60 seconds
        }
        // Update voting tab content based on final state
        updateVotingTabContent();
        
        const adminTabBtn = document.getElementById('adminTabBtn');
        if (adminTabBtn && window.State.currentUser && window.State.currentUser.isAdmin) {
            adminTabBtn.classList.remove('hidden-by-status');
            console.log("Admin tab button revealed for admin user.");
        }
        
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
    if (submitVoteBtn) submitVoteBtn.addEventListener('click', VotingModule.submitVote.bind(VotingModule));

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

    // --- NEW: Schedule Election Button ---
    const scheduleElectionBtn = document.getElementById('scheduleElectionBtn');
    if (scheduleElectionBtn) {
        scheduleElectionBtn.addEventListener('click', async () => {
            const startInput = document.getElementById('electionStart');
            const endInput = document.getElementById('electionEnd');

            if (!startInput.value || !endInput.value) {
                Utils.showMessage('Please set both start and end times.', 'error');
                return;
            }

            // Convert to UTC ISO string (the input is local time, so we adjust)
            const startLocal = new Date(startInput.value);
            const endLocal = new Date(endInput.value);

            // Send as ISO string. The backend will handle UTC conversion if needed.
            // Alternatively, you can convert to UTC here:
            // const startUTC = new Date(startLocal.getTime() - startLocal.getTimezoneOffset() * 60000).toISOString();
            // const endUTC = new Date(endLocal.getTime() - endLocal.getTimezoneOffset() * 60000).toISOString();
            // For simplicity, we'll send the local ISO string and let the backend handle it as UTC.
            const startISO = startLocal.toISOString();
            const endISO = endLocal.toISOString();

            try {
                const response = await ElectionAPI.scheduleElection(startISO, endISO);

                if (response.message) {
                    Utils.showMessage('Election schedule updated successfully!', 'success');
                    // Refresh the election status to reflect changes
                    const statusResponse = await ElectionAPI.getElectionStatus();
                    window.State.electionOpen = statusResponse.is_open !== undefined ? statusResponse.is_open : false;
                    window.State.electionStartTime = statusResponse.start_time || null;
                    window.State.electionEndTime = statusResponse.end_time || null;
                    // Update the UI
                    updateElectionStatusDisplay();
                } else {
                    Utils.showMessage(`Failed to set schedule: ${response.message || 'Unknown error'}`, 'error');
                }
            } catch (err) {
                console.error('Error setting election schedule:', err);
                Utils.showMessage('An error occurred while setting the schedule.', 'error');
            }
        });
    }
    // --- END NEW ---

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

    // --- NEW: Check if user is eligible to vote ---
    const isEligible = window.State.currentUser && window.State.currentUser.isEligibleVoter;

    // Show appropriate content based on state
    if (!isEligible) {
        // User is not eligible - show not registered message
        if (notRegisteredCard) {
            notRegisteredCard.classList.remove('hidden');
            console.log("Showing 'not registered' message.");
        }
    } else if (window.State.userHasVoted) {
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
        // Election is open, user is eligible, and hasn't voted - show voting interface
        if (votingInterface) {
            votingInterface.classList.remove('hidden');
            console.log("Showing voting interface.");
        }
    }
}

// --- Helper Function: Format Milliseconds into Readable String ---
function formatCountdown(ms) {
    if (ms < 0) return "0s";
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (parts.length === 0 || seconds > 0) parts.push(`${seconds}s`); // Always show seconds if no larger units or if seconds > 0

    return parts.join(' ');
}

// --- Helper Function: Update Election Status Display (for Timer) ---
function updateElectionStatusDisplay() {
    const electionStatus = document.getElementById('electionStatus');
    if (!electionStatus) return;

    const startTime = window.State.electionStartTime ? new Date(window.State.electionStartTime) : null;
    const endTime = window.State.electionEndTime ? new Date(window.State.electionEndTime) : null;
    const now = new Date();

    if (!startTime || !endTime) {
        electionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No election scheduled';
        electionStatus.classList.remove('open', 'closed', 'warning');
        electionStatus.classList.add('warning');
        return;
    }

    let displayText = '';
    let cssClass = '';

    if (now < startTime) {
        const timeDiff = startTime - now;
        displayText = `<i class="fas fa-clock"></i> Opens in ${formatCountdown(timeDiff)}`;
        cssClass = 'warning';
    } else if (now >= endTime) {
        displayText = '<i class="fas fa-lock"></i> Election Closed';
        cssClass = 'closed';
    } else {
        const timeDiff = endTime - now;
        displayText = `<i class="fas fa-clock"></i> Closes in ${formatCountdown(timeDiff)}`;
        cssClass = 'open';
    }

    electionStatus.innerHTML = displayText;
    electionStatus.classList.remove('open', 'closed', 'warning');
    electionStatus.classList.add(cssClass);
}
