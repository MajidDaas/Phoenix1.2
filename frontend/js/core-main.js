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
            electionStatusFetched = true;
            console.log("Initial State - Election Open:", window.State.electionOpen, "User Voted:", window.State.userHasVoted);

            // --- START OF NEW LOGIC ---
            // Check if the election is closed on initial load and redirect to 'info' tab
            if (isAuthenticated && !window.State.electionOpen) {
                 console.log("Election is closed on initial load for authenticated user. Preparing to redirect to Info tab.");
                 setTimeout(() => {
                     if (typeof UIController !== 'undefined' && UIController.switchTab) {
                         UIController.switchTab('info');
                         console.log("Switched to 'info' tab due to closed election.");
                     } else {
                         console.warn("UIController not ready or switchTab method missing when trying to redirect to 'info' tab.");
                     }
                 }, 150);
            }
            // --- END OF NEW LOGIC ---

        } catch (err) {
            console.error('Error fetching initial election status:', err);
            window.State.electionOpen = false;

            // Show translated error message
            if (typeof Utils !== 'undefined' && typeof Utils.showMessage === 'function') {
                Utils.showMessage('<span data-i18n="core.electionStatusError">Unable to verify election status. Please refresh the page or try again later.</span>', 'error');
            } else {
                alert('System Error: Unable to verify election status.');
            }
        }
    } else {
        window.State.electionOpen = true;
        window.State.userHasVoted = false;
    }
    // --- Hide Auth Skeleton Screen ---
    if (authSkeletonShown && authSkeletonScreen) {
        authSkeletonScreen.style.display = 'none';
        console.log("Auth skeleton screen hidden.");
    }
    // --- Update UI Visibility Based on Authentication Result ---
    const mainApp = document.getElementById('mainApp');
    if (isAuthenticated) {
        if (authScreen) authScreen.style.display = 'none';
        if (mainApp) {
            mainApp.classList.remove('hidden');
            mainApp.style.display = 'block';
            console.log("Main app shown.");
        }
        // Update election status display (header)
        const electionStatus = document.getElementById('electionStatus');
        if (electionStatus && electionStatusFetched) {
            const startTime = window.State.electionStartTime ? new Date(window.State.electionStartTime) : null;
            const endTime = window.State.electionEndTime ? new Date(window.State.electionEndTime) : null;
            const now = new Date();
            let displayText = '';
            let cssClass = '';

            if (!startTime || !endTime) {
                displayText = '<i class="fas fa-exclamation-triangle"></i> <span data-i18n="core.noElectionScheduled">No election scheduled</span>';
                cssClass = 'warning';
            } else if (now < startTime) {
                const timeDiff = startTime - now;
                displayText = `<i class="fas fa-clock"></i> <span data-i18n="core.opensIn">Opens in</span> ${formatCountdown(timeDiff)}`;
                cssClass = 'warning';
            } else if (now >= endTime) {
                displayText = '<i class="fas fa-lock"></i> <span data-i18n="electionIsClosed">Election Closed</span>';
                cssClass = 'closed';
            } else {
                const timeDiff = endTime - now;
                displayText = `<i class="fas fa-clock"></i> <span data-i18n="core.closesIn">Closes in</span> ${formatCountdown(timeDiff)}`;
                cssClass = 'open';
            }
            electionStatus.innerHTML = displayText;
            electionStatus.classList.remove('open', 'closed', 'warning');
            electionStatus.classList.add(cssClass);

            // Apply translations for dynamic status text
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }

            if (window.electionStatusTimer) {
                clearInterval(window.electionStatusTimer);
            }
            window.electionStatusTimer = setInterval(() => {
                updateElectionStatusDisplay();
            }, 1000);
        }
        updateVotingTabContent();
        const adminTabBtn = document.getElementById('adminTabBtn');
        if (adminTabBtn && window.State.currentUser && window.State.currentUser.isAdmin) {
            adminTabBtn.classList.remove('hidden-by-status');
            console.log("Admin tab button revealed for admin user.");
        }
        VotingModule.updateUI();
    } else {
        if (authScreen) authScreen.style.display = 'flex';
        if (mainApp) mainApp.classList.add('hidden');
        console.log("Auth screen shown, main app hidden (not authenticated).");
    }
    // --- Wait for other non-critical initial loads ---
    try {
         await Promise.all([candidatesLoadPromise]);
         console.log("Non-critical initial data loaded.");
    } catch (error) {
         console.error("One or more non-critical initial loads failed:", error);
    }
    // --- Ensure a valid initial tab is active ---
    if (isAuthenticated && mainApp && !mainApp.classList.contains('hidden')) {
        setTimeout(() => {
            const activeTab = document.querySelector('.tab.active');
            if (!activeTab) {
                console.log("No active tab found, activating first tab.");
                const firstTab = document.querySelector('.tab:not(.hidden-by-status)') || document.querySelector('.tab');
                if (firstTab) {
                    UIController.switchTab(firstTab.dataset.tab);
                }
            } else if (!window.State.electionOpen) {
                 const currentActiveTab = document.querySelector('.tab.active');
                 if (currentActiveTab && currentActiveTab.dataset.tab !== 'info') {
                     console.log("Secondary check: Election closed, switching to 'info' tab.");
                     UIController.switchTab('info');
                 }
            }
        }, 200);
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
                Utils.showMessage('<span data-i18n="core.scheduleError">Please set both start and end times.</span>', 'error');
                return;
            }
            const startLocal = new Date(startInput.value);
            const endLocal = new Date(endInput.value);
            const startISO = startLocal.toISOString();
            const endISO = endLocal.toISOString();
            try {
                const response = await ElectionAPI.scheduleElection(startISO, endISO);
                if (response.message) {
                    Utils.showMessage('<span data-i18n="core.scheduleSuccess">Election schedule updated successfully!</span>', 'success');
                    const statusResponse = await ElectionAPI.getElectionStatus();
                    window.State.electionOpen = statusResponse.is_open !== undefined ? statusResponse.is_open : false;
                    window.State.electionStartTime = statusResponse.start_time || null;
                    window.State.electionEndTime = statusResponse.end_time || null;
                    updateElectionStatusDisplay();
                } else {
                    Utils.showMessage(`<span data-i18n="core.scheduleFailed">Failed to set schedule</span>: ${response.message || 'Unknown error'}`, 'error');
                }
            } catch (err) {
                console.error('Error setting election schedule:', err);
                Utils.showMessage('<span data-i18n="core.scheduleGeneralError">An error occurred while setting the schedule.</span>', 'error');
            }
        });
    }
    // --- END NEW ---
    // --- Modern Header Mobile Menu Toggle ---
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const headerNav = document.getElementById('headerNav');
    if (mobileMenuToggle && headerNav) {
        const toggleMenu = function() {
            const isExpanded = headerNav.classList.contains('active');
            headerNav.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
        };
        mobileMenuToggle.addEventListener('click', toggleMenu);
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768) {
                const isClickInsideNav = headerNav.contains(event.target);
                const isClickOnToggle = mobileMenuToggle.contains(event.target);
                if (!isClickInsideNav && !isClickOnToggle && headerNav.classList.contains('active')) {
                    toggleMenu();
                }
            }
        });
    } else {
        console.warn("Mobile menu toggle or header navigation not found. Ensure the HTML structure is correct.");
    }
    // --- End Modern Header Mobile Menu Toggle ---
    // --- Add click outside listener for candidate details and winner popup ---
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

// --- ✅ ADD THIS NEW FUNCTION: Show the Instructions Popup ---
function showInstructionsPopup() {
    const popup = document.getElementById('instructionsPopup');
    if (!popup) {
        console.error("Instructions popup element (#instructionsPopup) not found.");
        if (typeof Utils !== 'undefined' && typeof Utils.showMessage === 'function') {
             Utils.showMessage('<span data-i18n="core.instructionsUnavailable">Voting instructions are temporarily unavailable.</span>', 'info');
        } else {
             alert('Voting Instructions: Select 15 Council Members, designate 7 as Executive Officers, review, and submit.');
        }
        return;
    }
    function hidePopup() {
        popup.classList.add('hidden');
        popup.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        console.log("Instructions popup hidden.");
    }
    const closeBtn = document.getElementById('closeInstructionsPopup');
    const ackBtn = document.getElementById('acknowledgeInstructions');
    if (closeBtn) {
        closeBtn.removeEventListener('click', hidePopup);
        closeBtn.addEventListener('click', hidePopup);
    }
    if (ackBtn) {
        ackBtn.removeEventListener('click', hidePopup);
        ackBtn.addEventListener('click', hidePopup);
    }
    function closeOnBackdropClick(e) {
        if (e.target === popup) {
            hidePopup();
        }
    }
    popup.removeEventListener('click', closeOnBackdropClick);
    popup.addEventListener('click', closeOnBackdropClick);
    function handleEscapeKey(e) {
        if (e.key === 'Escape' && popup && !popup.classList.contains('hidden')) {
            hidePopup();
        }
    }
    document.removeEventListener('keydown', handleEscapeKey);
    document.addEventListener('keydown', handleEscapeKey);
    popup.classList.remove('hidden');
    popup.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    console.log("Instructions popup shown.");

    // Apply translations for the popup content
    if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
        I18nModule.applyTranslations();
    }
}
// --- END NEW FUNCTION ---

// --- Authentication Callback Handler (unchanged) ---
function handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authenticated = urlParams.get('authenticated');
    console.log("Handling auth callback. Authenticated param:", authenticated);
    if (authenticated === 'true') {
        console.log("Redirected from Google OAuth2, re-checking auth status...");
        AuthModule.checkAuthStatus().then((isAuth) => {
             console.log("Auth check after callback. Is authenticated:", isAuth);
        }).catch(err => {
             console.error("Error re-checking auth status after callback:", err);
        });
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// --- UI Controller for Tab Switching (unchanged) ---
const UIController = {
    switchTab: (tabName) => {
        console.log("Attempting to switch to tab:", tabName);
        const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(tabName);
        if (!selectedTab) {
            console.warn(`Cannot switch to tab button '${tabName}': Tab button is missing.`);
            return;
        }
        if (!selectedContent) {
            console.warn(`Cannot switch to tab content '${tabName}': Tab content is missing.`);
            return;
        }
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        selectedTab.classList.add('active');
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block';
        console.log(`Successfully switched to tab: ${tabName}`);
        if (tabName === 'results') {
            if (typeof ResultsModule !== 'undefined' && ResultsModule.renderResults) {
                ResultsModule.renderResults();
            } else {
                console.warn("ResultsModule or renderResults not available.");
            }
        }
        if (tabName === 'admin') {
            setTimeout(() => {}, 10);
        }
        if (tabName === 'vote') {
            updateVotingTabContent();
        }
        if (typeof VotingModule !== 'undefined' && typeof activeDetails !== 'undefined' && activeDetails) {
            VotingModule.hideCandidateDetails(activeDetails);
        }
        if (typeof ResultsModule !== 'undefined' && ResultsModule.hideWinnerPopup) {
            ResultsModule.hideWinnerPopup();
        }
        // Close mobile menu on tab switch
        const headerNav = document.getElementById('headerNav');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        if (headerNav && mobileMenuToggle) {
            if (headerNav.classList.contains('active')) {
                headerNav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                console.log("Mobile menu closed after tab switch.");
            }
        }
    }
};

// --- Function to Update Voting Tab Content Based on State (unchanged logic, added i18n) ---
function updateVotingTabContent() {
    const votingInterface = document.getElementById('votingInterface');
    const electionClosedMessageElement = document.getElementById('electionClosedMessage');
    const thankYouMessageElement = document.getElementById('thankYouMessage');
    const notRegisteredCard = document.getElementById('notRegisteredCard');
    console.log("updateVotingTabContent - Election Open:", window.State.electionOpen, "User Voted:", window.State.userHasVoted);

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

    const isEligible = window.State.currentUser && window.State.currentUser.isEligibleVoter;

    if (!isEligible) {
        if (notRegisteredCard) {
            notRegisteredCard.classList.remove('hidden');
            console.log("Showing 'not registered' message.");

            // Apply translations for not registered card
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
        }
    } else if (window.State.userHasVoted) {
        if (thankYouMessageElement) {
            thankYouMessageElement.classList.remove('hidden');
            console.log("Showing thank you message.");

            // Apply translations for thank you card
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
        }
    } else if (!window.State.electionOpen) {
        if (electionClosedMessageElement) {
            electionClosedMessageElement.classList.remove('hidden');
            console.log("Showing election closed message.");

            // Apply translations for closed election card
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
        }
    } else {
        if (votingInterface) {
            votingInterface.classList.remove('hidden');
            console.log("Showing voting interface.");
        }
    }
}

// --- Helper Function: Format Milliseconds into Readable String (unchanged) ---
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
    if (parts.length === 0 || seconds > 0) parts.push(`${seconds}s`);
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
        electionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span data-i18n="core.noElectionScheduled">No election scheduled</span>';
        electionStatus.classList.remove('open', 'closed', 'warning');
        electionStatus.classList.add('warning');
    } else {
        let displayText = '';
        let cssClass = '';
        if (now < startTime) {
            const timeDiff = startTime - now;
            displayText = `<i class="fas fa-clock"></i> <span data-i18n="core.opensIn">Opens in</span> ${formatCountdown(timeDiff)}`;
            cssClass = 'warning';
        } else if (now >= endTime) {
            displayText = '<i class="fas fa-lock"></i> <span data-i18n="electionIsClosed">Election Closed</span>';
            cssClass = 'closed';
        } else {
            const timeDiff = endTime - now;
            displayText = `<i class="fas fa-clock"></i> <span data-i18n="core.closesIn">Closes in</span> ${formatCountdown(timeDiff)}`;
            cssClass = 'open';
        }
        electionStatus.innerHTML = displayText;
        electionStatus.classList.remove('open', 'closed', 'warning');
        electionStatus.classList.add(cssClass);

        // Apply translations for dynamic status text
        if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
            I18nModule.applyTranslations();
        }
    }
}
