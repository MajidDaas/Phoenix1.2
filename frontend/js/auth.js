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

    // --- Check Auth Status ---
    checkAuthStatus: async function() {
        try {
            const response = await fetch('/api/auth/session');
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    window.State.currentUser = data.user;
                    console.log("User authenticated:", window.State.currentUser);

                    // Fetch election status
                    const statusResponse = await ElectionAPI.getElectionStatus();
                    window.State.electionOpen = statusResponse.is_open;

                    // Hide auth screen, show main app
                    const authScreen = document.getElementById('authScreen');
                    const mainApp = document.getElementById('mainApp');
                    if (authScreen) authScreen.style.display = 'none';
                    if (mainApp) {
                        mainApp.classList.remove('hidden');
                        mainApp.style.display = 'block';
                    }

                    // Check if user has voted or election is closed
                    if (!window.State.electionOpen) {
                        // Hide voting tab, show election closed message
                        this.showElectionClosedMessage();
                    } else if (window.State.currentUser.hasVoted) {
                        // Hide voting tab, show thank you message
                        this.showThankYouMessage();
                    } else {
                        // Show voting tab normally
                        this.showVotingTab();
                    }

                    // Initialize candidates and UI
                    await CandidatesModule.loadCandidates();
                    VotingModule.updateUI();
                    AdminModule.updateAdminUIForLoggedInUser(window.State.currentUser);

                    Utils.showMessage('Welcome back! You are authenticated.', 'success');
                } else {
                    console.log("User is not authenticated.");
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

    // Show thank you message after voting
    showThankYouMessage: function() {
        // Hide voting tab
        const votingTab = document.querySelector('.tab[data-tab="vote"]');
        const votingContent = document.getElementById('vote');
        if (votingTab) votingTab.style.display = 'none';
        if (votingContent) votingContent.style.display = 'none';

        // Create thank you card
        const thankYouCard = document.createElement('div');
        thankYouCard.className = 'card thank-you-card';
        thankYouCard.innerHTML = `
            <div class="thank-you-content">
                <h2><i class="fas fa-check-circle"></i> Thank You for Voting!</h2>
                <p>Your vote has been recorded and will help shape the future of the Phoenix Council.</p>
                <p>You can now explore the candidate profiles or view results once the election is closed.</p>
                <div class="thank-you-actions">
                    <button class="btn btn-secondary" onclick="UIController.switchTab('info')">
                        <i class="fas fa-info-circle"></i> View Candidates
                    </button>
                    <button class="btn logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        `;

        // Add to main container
        const mainContainer = document.querySelector('.container');
        if (mainContainer) {
            mainContainer.appendChild(thankYouCard);
        }

        // Add logout event listener
        const logoutBtn = thankYouCard.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', AuthModule.logout);
        }
    },

    // Show election closed message
    showElectionClosedMessage: function() {
        // Hide voting tab
        const votingTab = document.querySelector('.tab[data-tab="vote"]');
        const votingContent = document.getElementById('vote');
        if (votingTab) votingTab.style.display = 'none';
        if (votingContent) votingContent.style.display = 'none';

        // Create election closed card
        const closedCard = document.createElement('div');
        closedCard.className = 'card election-closed-card';
        closedCard.innerHTML = `
            <div class="closed-content">
                <h2><i class="fas fa-lock"></i> Election is Closed</h2>
                <p>Thank you for your participation in the Phoenix Council elections.</p>
                <p>You can now view the final results and explore the winning candidates.</p>
                <div class="closed-actions">
                    <button class="btn btn-primary" onclick="UIController.switchTab('results')">
                        <i class="fas fa-chart-bar"></i> View Results
                    </button>
                    <button class="btn logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        `;

        // Add to main container
        const mainContainer = document.querySelector('.container');
        if (mainContainer) {
            mainContainer.appendChild(closedCard);
        }

        // Add logout event listener
        const logoutBtn = closedCard.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', AuthModule.logout);
        }
    },

    // Show voting tab normally
    showVotingTab: function() {
        const votingTab = document.querySelector('.tab[data-tab="vote"]');
        const votingContent = document.getElementById('vote');
        if (votingTab) votingTab.style.display = 'block';
        if (votingContent) votingContent.style.display = 'block';

        // Remove any thank you or closed cards
        const thankYouCard = document.querySelector('.thank-you-card');
        const closedCard = document.querySelector('.election-closed-card');
        if (thankYouCard) thankYouCard.remove();
        if (closedCard) closedCard.remove();
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
}; // ✅ This was the missing closing brace!
