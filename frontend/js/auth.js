// auth.js - Full authentication flow with app gating
const AuthModule = {
    // --- Demo Authentication (Revised) ---
    demoAuth: async function () {
        const demoAuthBtn = document.getElementById('demoAuthBtn');
        const authSkeletonScreen = document.getElementById('authSkeletonScreen');
        let originalBtnContent = '';
        if (demoAuthBtn) {
            // Preserve original content for restoration
            originalBtnContent = demoAuthBtn.innerHTML;
            // Use translation key for loading text
            demoAuthBtn.innerHTML = '<div class="loader" style="width: 20px; height: 20px; border-width: 2px;"></div> <span data-i18n="auth.enteringDemo">Entering Demo...</span>';
            demoAuthBtn.disabled = true;

            // Apply translations for button text
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
        }
        // Show skeleton if it exists
        if (authSkeletonScreen) {
            authSkeletonScreen.style.display = 'flex';
        }
        try {
            const response = await fetch('/api/auth/demo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    console.log('Demo authentication successful');
                    // --- CRITICAL: Update State ---
                    window.State.currentUser = data.user;

                    // Simple approach: Hide auth elements directly here
                    const authScreen = document.getElementById('authScreen');
                    const mainApp = document.getElementById('mainApp');
                    if (authScreen) authScreen.style.display = 'none';
                    if (mainApp) {
                        mainApp.classList.remove('hidden');
                        mainApp.style.display = 'block';
                    }

                    // Show success message via Utils (now supports i18n keys)
                    Utils.showMessage('auth.demoSuccess', 'success');
                } else {
                    throw new Error(data.message || 'Demo authentication failed (server)');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error ${response.status}`);
            }
        } catch (err) {
            console.error('Demo auth error:', err);
            // Show error via Utils
            Utils.showMessage(`auth.demoFailed: ${err.message}`, 'error');

            // Hide skeleton on error
            if (authSkeletonScreen) {
                authSkeletonScreen.style.display = 'none';
            }
        } finally {
            // Restore button state regardless of success or failure
            if (demoAuthBtn) {
                demoAuthBtn.innerHTML = originalBtnContent;
                demoAuthBtn.disabled = false;

                // Re-apply translations in case original content had i18n attributes
                if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                    I18nModule.applyTranslations();
                }
            }
            // Hide skeleton in finally block to ensure it's always hidden
            if (authSkeletonScreen) {
                authSkeletonScreen.style.display = 'none';
            }
        }
    },
    // --- Google OAuth2 Authentication ---
    signInWithGoogle: async function () {
        try {
            const googleSigninBtn = document.getElementById('googleSigninBtn');
            const authSkeletonScreen = document.getElementById('authSkeletonScreen');
            if (googleSigninBtn) {
                googleSigninBtn.disabled = true;
                // Optional: Change button text to "Redirecting..."
                const originalText = googleSigninBtn.innerHTML;
                googleSigninBtn.innerHTML = '<span data-i18n="auth.redirecting">Redirecting...</span>';
                if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                    I18nModule.applyTranslations();
                }
            }
            if (authSkeletonScreen) {
                authSkeletonScreen.style.display = 'flex';
            }
            window.location.href = '/auth/google/login';
        } catch (err) {
            console.error('Error initiating Google sign-in redirect:', err);
            const authSkeletonScreen = document.getElementById('authSkeletonScreen');
            if (authSkeletonScreen) authSkeletonScreen.style.display = 'none';
            const googleSigninBtn = document.getElementById('googleSigninBtn');
            if (googleSigninBtn) {
                googleSigninBtn.disabled = false;
                // Restore original text if needed
                googleSigninBtn.innerHTML = '<span data-i18n="signInWithGoogle">Sign in with Google</span>';
                if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                    I18nModule.applyTranslations();
                }
            }
            // Show error via Utils
            Utils.showMessage('auth.googleError', 'error');
        }
    },
    // --- Check Auth Status ---
    checkAuthStatus: async function () {
        try {
            const response = await fetch('/api/auth/session', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    window.State.currentUser = data.user;
                    console.log("User authenticated:", window.State.currentUser);
                    return true;
                } else {
                    console.log("User is not authenticated.");
                    window.State.currentUser = null;
                    return false;
                }
            } else {
                console.log(`Failed to fetch auth session. Status: ${response.status}`);
                window.State.currentUser = null;
                return false;
            }
        } catch (err) {
            console.log('Error checking auth status:', err);
            window.State.currentUser = null;
            return false;
        }
    },
    // --- Logout (Revised) ---
    logout: async function () {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            // Reset local state regardless of server response (best effort)
            window.State.currentUser = null;
            window.State.userHasVoted = false;
            window.State.electionOpen = true;

            // Manual UI transition
            const authScreen = document.getElementById('authScreen');
            const mainApp = document.getElementById('mainApp');
            if (authScreen) {
                authScreen.style.display = 'flex';
                authScreen.classList.remove('hidden');
            }
            if (mainApp) {
                mainApp.classList.add('hidden');
                mainApp.style.display = 'none';
            }

            // Show success message
            Utils.showMessage('auth.logoutSuccess', 'success');

        } catch (err) {
            console.error('Error logging out:', err);
            // Show error via Utils
            Utils.showMessage('auth.logoutError', 'error');

            // Even if server logout fails, clear local state/UI
            window.State.currentUser = null;
            const authScreen = document.getElementById('authScreen');
            const mainApp = document.getElementById('mainApp');
            if (authScreen) authScreen.style.display = 'flex';
            if (mainApp) mainApp.classList.add('hidden');
        }
    }
};
