// auth.js - Full authentication flow with app gating

const AuthModule = {
    // --- Demo Authentication ---
    demoAuth: async function() {
        try {
            const demoAuthBtn = document.getElementById('demoAuthBtn');
            const authLoading = document.getElementById('authLoading');
            if (demoAuthBtn) demoAuthBtn.disabled = true;
            if (authLoading) authLoading.classList.remove('hidden');

            const response = await fetch('/api/auth/demo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                window.State.currentUser = data.user;

                // ✅ Hide auth screen, show full app
                const authScreen = document.getElementById('authScreen');
                const mainApp = document.getElementById('mainApp');
                if (authScreen) authScreen.style.display = 'none';
                if (mainApp) {
                    mainApp.classList.remove('hidden');
                    mainApp.style.display = 'block';
                }

                // Initialize candidates and UI
                await CandidatesModule.loadCandidates();
                VotingModule.updateUI();
                AdminModule.updateAdminUIForLoggedInUser(window.State.currentUser);

                Utils.showMessage('Demo mode: Authentication successful. You may now vote.', 'success');
            } else {
                throw new Error('Demo authentication failed');
            }
        } catch (err) {
            console.error('Demo auth error:', err);
            Utils.showMessage('Demo authentication failed. Please try again.', 'error');
        } finally {
            const demoAuthBtn = document.getElementById('demoAuthBtn');
            const authLoading = document.getElementById('authLoading');
            if (demoAuthBtn) demoAuthBtn.disabled = false;
            if (authLoading) authLoading.classList.add('hidden');
        }
    },

    // --- Google OAuth2 Authentication ---
    signInWithGoogle: async function() {
        try {
            const googleSigninBtn = document.getElementById('googleSigninBtn');
            const authLoading = document.getElementById('authLoading');
            if (googleSigninBtn && authLoading) {
                googleSigninBtn.disabled = true;
                authLoading.classList.remove('hidden');
            }
            window.location.href = '/auth/google/login';
        } catch (err) {
            console.error('Error initiating Google sign-in redirect:', err);
            Utils.showMessage('An error occurred while redirecting to Google. Please try again or use Demo Mode.', 'error');
        }
    },

    // --- Check Auth Status (Called on Load) ---
    checkAuthStatus: async function() {
        try {
            const response = await fetch('/api/auth/session');
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    window.State.currentUser = data.user;
                    console.log("User authenticated:", window.State.currentUser);

                    // ✅ Hide auth screen, show full app
                    const authScreen = document.getElementById('authScreen');
                    const mainApp = document.getElementById('mainApp');
                    if (authScreen) authScreen.style.display = 'none';
                    if (mainApp) {
                        mainApp.classList.remove('hidden');
                        mainApp.style.display = 'block';
                    }

                    // Initialize app
                    await CandidatesModule.loadCandidates();
                    VotingModule.updateUI();
                    AdminModule.updateAdminUIForLoggedInUser(window.State.currentUser);

                    Utils.showMessage('Welcome back! You are authenticated.', 'success');
                } else {
                    console.log("User is not authenticated.");
                    // Ensure auth screen is visible
                    const authScreen = document.getElementById('authScreen');
                    if (authScreen) authScreen.style.display = 'flex';
                }
            } else {
                console.log(`Failed to fetch auth session. Status: ${response.status}`);
                const authScreen = document.getElementById('authScreen');
                if (authScreen) authScreen.style.display = 'flex';
            }
        } catch (err) {
            console.log('Error checking auth status:', err);
            const authScreen = document.getElementById('authScreen');
            if (authScreen) authScreen.style.display = 'flex';
        }
    },

    // --- Logout ---
    logout: async function() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.State.currentUser = null;

            // ✅ Show auth screen, hide full app
            const authScreen = document.getElementById('authScreen');
            const mainApp = document.getElementById('mainApp');
            if (authScreen) authScreen.style.display = 'flex';
            if (mainApp) mainApp.classList.add('hidden');

            Utils.showMessage('Logged out successfully', 'success');
        } catch (err) {
            console.error('Error logging out:', err);
            Utils.showMessage('Error logging out', 'error');
        }
    }
};
