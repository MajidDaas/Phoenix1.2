// core-main.js - App initialization (runs after all modules are loaded)

document.addEventListener('DOMContentLoaded', async function() {
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

    // --- Initialize DOM Elements ---
    initDOMElements();

    // --- Check Auth Status FIRST ---
    await AuthModule.checkAuthStatus();

    // Handle OAuth2 callback
    handleAuthCallback();

    // --- Fetch initial election status ---
    try {
        const statusResponse = await ElectionAPI.getElectionStatus();
        window.State.electionOpen = statusResponse.is_open;
        if (!window.State.electionOpen && electionStatus) {
            electionStatus.innerHTML = '<i class="fas fa-lock-open"></i> Election is closed';
            electionStatus.classList.add('closed');
            const electionClosedMessage = document.getElementById('electionClosedMessage');
            if (electionClosedMessage) electionClosedMessage.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Error fetching initial election status:', err);
    }

    // --- Tab switching (only active after auth) ---
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            UIController.switchTab(tab.dataset.tab);
        });
    });

    // --- Admin button ---
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            UIController.switchTab('admin');
        });
    }

    // --- Button Event Listeners ---
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
        sortVoteSelect.addEventListener('change', function() {
            CandidatesModule.initCandidates('candidateList');
        });
    }

    const sortInfoSelect = document.getElementById('sortInfoBy');
    if (sortInfoSelect) {
        sortInfoSelect.addEventListener('change', function() {
            CandidatesModule.displayInfoCandidates();
        });
    }

    // --- Click outside listeners ---
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
        AuthModule.checkAuthStatus();
    }
}

// --- UI Controller for Tab Switching ---
const UIController = {
    switchTab: (tabName) => {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(tabName);
        if (selectedTab) selectedTab.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');
        if (tabName === 'results') {
            ResultsModule.renderResults();
        }
        if (tabName === 'admin') {
            setTimeout(() => {
                const adminPasswordInput = document.getElementById('adminPassword');
                if (adminPasswordInput) adminPasswordInput.focus();
            }, 10);
        }
        if (activeDetails) {
            VotingModule.hideCandidateDetails(activeDetails);
        }
        ResultsModule.hideWinnerPopup();
    }
};
