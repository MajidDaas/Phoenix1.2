// auth.js - Full authentication flow with app gating
const AuthModule = {
    // --- Demo Authentication (Revised) ---
    demoAuth: async function () {
        const demoAuthBtn = document.getElementById('demoAuthBtn');
        // const authLoading = document.getElementById('authLoading'); // ❌ Element not found in HTML
        const authSkeletonScreen = document.getElementById('authSkeletonScreen');
        let originalBtnContent = '';

        if (demoAuthBtn) {
            originalBtnContent = demoAuthBtn.innerHTML;
            demoAuthBtn.innerHTML = '<div class="loader" style="width: 20px; height: 20px; border-width: 2px;"></div> Entering Demo...'; // Provide visual feedback
            demoAuthBtn.disabled = true;
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
                    // credentials: 'include' // Usually included by default for same-origin, but good to be explicit if needed
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    console.log('Demo authentication successful');
                    // --- CRITICAL: Update State ---
                    window.State.currentUser = data.user;
                    // window.State.electionOpen = true; // Assume open or fetch status?
                    // window.State.userHasVoted = data.user.hasVoted || false;
                    // --- CRITICAL: Trigger UI Transition ---
                    // Option 1: If core-main.js polls or reacts to State changes:
                    // It should detect the change in window.State.currentUser and transition.
                    // Option 2: Explicitly call core functions (requires them to be accessible)
                    // You might have functions like these in core-main.js or a UI controller:
                    // hideAuthScreen(); // Function to hide #authScreen
                    // showMainApp();    // Function to show #mainApp and initialize it
                    // StateModule.initialize(); // Re-initialize state if needed
                    // Option 3: Dispatch a custom event (clean way to communicate)
                    // window.dispatchEvent(new CustomEvent('userAuthenticated', { detail: { user: data.user } }));
                    // For this example, let's assume core-main handles it or we call a global init
                    // If you have a global init function in core-main.js, call it:
                    // if (typeof initializeApp === 'function') {
                    //     initializeApp(); // This would re-check state and show main app
                    // }

                    // Simple approach: Hide auth elements directly here
                    const authScreen = document.getElementById('authScreen');
                    const mainApp = document.getElementById('mainApp');
                    if (authScreen) authScreen.style.display = 'none'; // or add 'hidden' class
                    if (mainApp) {
                        mainApp.classList.remove('hidden');
                        mainApp.style.display = 'block'; // Ensure it's displayed
                        // Re-initialize the main app state/modules if necessary
                        // This depends on how your core-main.js is structured
                        // StateModule.initialize(); // Example call
                        // CandidatesModule.loadCandidates();
                        // ResultsModule.renderResults();
                        // VotingModule.updateUI();
                    }


                    Utils.showMessage('Demo mode: Authentication successful. You may now vote.', 'success');
                } else {
                     throw new Error(data.message || 'Demo authentication failed (server)');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error ${response.status}`);
            }
        } catch (err) {
            console.error('Demo auth error:', err);
            Utils.showMessage(`Demo authentication failed: ${err.message}`, 'error');
            // Hide skeleton on error
            if (authSkeletonScreen) {
                authSkeletonScreen.style.display = 'none';
            }
        } finally {
            // Restore button state regardless of success or failure
            if (demoAuthBtn) {
                demoAuthBtn.innerHTML = originalBtnContent;
                demoAuthBtn.disabled = false;
            }
            // Hide skeleton in finally block to ensure it's always hidden
            if (authSkeletonScreen) {
                authSkeletonScreen.style.display = 'none';
            }
        }
    },

    // --- Google OAuth2 Authentication (Comments apply here too) ---
    signInWithGoogle: async function () {
        try {
            const googleSigninBtn = document.getElementById('googleSigninBtn');
            const authSkeletonScreen = document.getElementById('authSkeletonScreen');
            if (googleSigninBtn) googleSigninBtn.disabled = true;
            if (authSkeletonScreen) {
                authSkeletonScreen.style.display = 'flex';
            }
            window.location.href = '/auth/google/login';
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

    // --- Check Auth Status (This is often called on page load or periodically) ---
    checkAuthStatus: async function () {
        try {
            const response = await fetch('/api/auth/session', { credentials: 'include' }); // Ensure credentials are sent
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
                // Handle non-2xx responses (e.g., 401, 500)
                console.log(`Failed to fetch auth session. Status: ${response.status}`);
                // Optionally, check response.status for specific actions (e.g., 401 might mean session expired)
                window.State.currentUser = null;
                return false;
            }
        } catch (err) {
            console.log('Error checking auth status:', err);
            window.State.currentUser = null;
            // Could potentially show a network error message here
            return false;
        }
        // The showing/hiding of screens based on window.State should be handled by core-main.js
        // after this function resolves (e.g., in the caller of checkAuthStatus).
    },

    // --- Logout (Revised) ---
    logout: async function () {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include' // Ensure session cookie is sent
            });
            // Reset local state regardless of server response (best effort)
            window.State.currentUser = null;
            window.State.userHasVoted = false;
            window.State.electionOpen = true; // Default assumption

            // Option 1: Reload for a clean slate (simplest)
            // window.location.reload();

            // Option 2: Manual UI transition (smoother, requires careful state management)
             const authScreen = document.getElementById('authScreen');
             const mainApp = document.getElementById('mainApp');
             if (authScreen) {
                 authScreen.style.display = 'flex'; // or remove 'hidden' class
                 authScreen.classList.remove('hidden'); // Ensure it's visible
             }
             if (mainApp) {
                 mainApp.classList.add('hidden');
                 mainApp.style.display = 'none'; // Ensure it's hidden
             }
             // Reset any UI elements if needed (e.g., candidate lists, votes)
             // VotingModule.reset(); // Hypothetical reset function
             // CandidatesModule.clear(); // Hypothetical clear function

             Utils.showMessage('Logged out successfully', 'success');

             // If using a state management pattern that relies on checking auth status:
             // StateModule.initialize(); // This might call checkAuthStatus again

        } catch (err) {
            console.error('Error logging out:', err);
            Utils.showMessage('Error occurred during logout. Please close and reopen the browser.', 'error');
            // Even if server logout fails, clear local state/UI for security/usability
            window.State.currentUser = null;
            const authScreen = document.getElementById('authScreen');
            const mainApp = document.getElementById('mainApp');
            if (authScreen) authScreen.style.display = 'flex';
            if (mainApp) mainApp.classList.add('hidden');
        }
    }
};
// ✅ Ensure this closing brace is present
