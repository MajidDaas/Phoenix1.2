// auth.js - Full authentication flow with app gating
const AuthModule = {
    // --- Demo Authentication ---
    demoAuth: async function () {
        try {
            const demoAuthBtn = document.getElementById('demoAuthBtn');
            const authLoading = document.getElementById('authLoading'); // Assuming this element exists
            const authSkeletonScreen = document.getElementById('authSkeletonScreen');
            let skeletonShown = false;

            if (demoAuthBtn) demoAuthBtn.disabled = true;
            // Show skeleton if it exists
            if (authSkeletonScreen) {
                authSkeletonScreen.style.display = 'flex';
                skeletonShown = true;
            }
            // Hide auth loading if it was used previously, or show it if needed
            if (authLoading) authLoading.classList.add('hidden'); // Or remove if you use it

            const response = await fetch('/api/auth/demo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                window.State.currentUser = data.user;
                // Update global state flags based on demo response if provided
                // Otherwise, core-main will fetch them
                // window.State.electionOpen = data.electionOpen ?? true;
                // window.State.userHasVoted = data.userHasVoted ?? false;

                // The showing/hiding of screens is now handled by core-main.js
                // based on window.State after checkAuthStatus completes.

                Utils.showMessage('Demo mode: Authentication successful. You may now vote.', 'success');
                // Trigger a re-check or update in core-main if needed, or let the normal flow handle it
            } else {
                throw new Error('Demo authentication failed');
            }
        } catch (err) {
            console.error('Demo auth error:', err);
            Utils.showMessage('Demo authentication failed. Please try again.', 'error');
        } finally {
            const demoAuthBtn = document.getElementById('demoAuthBtn');
            const authSkeletonScreen = document.getElementById('authSkeletonScreen');
            if (demoAuthBtn) demoAuthBtn.disabled = false;
            // Hide skeleton
            if (authSkeletonScreen) {
                 authSkeletonScreen.style.display = 'none';
            }
            // Hide auth loading if it was used
            // const authLoading = document.getElementById('authLoading');
            // if (authLoading) authLoading.classList.add('hidden');
        }
    },

    // --- Google OAuth2 Authentication ---
    signInWithGoogle: async function () {
        try {
            const googleSigninBtn = document.getElementById('googleSigninBtn');
            const authLoading = document.getElementById('authLoading'); // Assuming this element exists
            const authSkeletonScreen = document.getElementById('authSkeletonScreen');
            let skeletonShown = false;

            if (googleSigninBtn) googleSigninBtn.disabled = true;
            // Show skeleton if it exists
            if (authSkeletonScreen) {
                authSkeletonScreen.style.display = 'flex';
                skeletonShown = true;
            }
            // Hide auth loading if it was used previously, or show it if needed
            if (authLoading) authLoading.classList.add('hidden'); // Or remove if you use it

            window.location.href = '/auth/google/login';
            // Note: After redirect, core-main.js will handle the callback and checkAuthStatus again.
        } catch (err) {
            console.error('Error initiating Google sign-in redirect:', err);
            const authSkeletonScreen = document.getElementById('authSkeletonScreen');
            if (authSkeletonScreen) authSkeletonScreen.style.display = 'none';
            const googleSigninBtn = document.getElementById('googleSigninBtn');
            if (googleSigninBtn) googleSigninBtn.disabled = false;
            Utils.showMessage('An error occurred while redirecting to Google. Please try again or use Demo Mode.', 'error');
        }
        // Finally block is not used here as the page redirects
    },

    // --- Check Auth Status ---
    checkAuthStatus: async function () {
        // This function now focuses solely on determining the user's authentication state
        // and updating window.State. It does NOT directly manipulate UI visibility.
        try {
            const response = await fetch('/api/auth/session');
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    window.State.currentUser = data.user;
                    console.log("User authenticated:", window.State.currentUser);
                    // Success: Auth state is determined. Core-main will handle UI based on this.
                    return true; // Indicate successful auth check
                } else {
                    console.log("User is not authenticated.");
                    window.State.currentUser = null;
                    return false; // Indicate user is not authenticated
                }
            } else {
                console.log(`Failed to fetch auth session. Status: ${response.status}`);
                window.State.currentUser = null;
                return false; // Indicate failure/unknown auth state
            }
        } catch (err) {
            console.log('Error checking auth status:', err);
            window.State.currentUser = null;
            return false; // Indicate error during auth check
        }
        // The showing/hiding of screens is now handled by core-main.js
        // based on window.State after this function completes (or fails).
    },

    // --- Logout ---
    logout: async function () {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.State.currentUser = null;
            window.State.userHasVoted = false; // Reset local state
            window.State.electionOpen = true; // Assume open until checked again

            // The showing/hiding of screens is now handled by core-main.js
            // It will detect currentUser is null and show auth screen.
            // Trigger a re-evaluation or reload might be cleaner
            // For now, let core-main handle it on its next check or UI update cycle.
            // A simple way is to reload the page to restart the flow cleanly.
             window.location.reload(); // This ensures a clean slate

            // If you don't want to reload:
            // const authScreen = document.getElementById('authScreen');
            // const mainApp = document.getElementById('mainApp');
            // if (authScreen) authScreen.style.display = 'flex';
            // if (mainApp) mainApp.classList.add('hidden');
            // Utils.showMessage('Logged out successfully', 'success');

        } catch (err) {
            console.error('Error logging out:', err);
            Utils.showMessage('Error logging out', 'error');
        }
    }
};
// ✅ Ensure this closing brace is present
