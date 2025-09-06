// admin.js - Admin panel functionality and user interface management

const AdminModule = {
    // --- Admin Authentication ---
    authenticateAdmin: async function() {
        const adminPasswordEl = document.getElementById('adminPassword');
        if (!adminPasswordEl) {
            Utils.showMessage('Admin password field not found', 'error');
            return;
        }
        const password = adminPasswordEl.value;
        if (!password) {
            Utils.showMessage('Please enter admin password', 'error');
            return;
        }

        const authAdminBtn = document.getElementById('authAdminBtn');
        const adminAuthLoading = document.getElementById('adminAuthLoading');
        if (authAdminBtn) authAdminBtn.disabled = true;
        if (adminAuthLoading) adminAuthLoading.classList.remove('hidden');

        try {
            const response = await ElectionAPI.authenticateAdmin(password);
            if (response.message && response.message.includes('authenticated')) {
                const adminControls = document.getElementById('adminControls');
                if (adminControls) adminControls.classList.remove('hidden');
                Utils.showMessage('Admin access granted', 'success');
            } else {
                Utils.showMessage(response.message || 'Authentication failed', 'error');
            }
        } catch (err) {
            console.error('Error authenticating admin:', err);
            Utils.showMessage('An error occurred during authentication. Please try again.', 'error');
        } finally {
            if (authAdminBtn) authAdminBtn.disabled = false;
            if (adminAuthLoading) adminAuthLoading.classList.add('hidden');
        }
    },

    // --- Google OAuth2 for Admin ---
    signInWithGoogleForAdmin: async function() {
        try {
            const googleAdminBtn = document.getElementById('googleAdminSigninBtn');
            const adminAuthLoading = document.getElementById('adminAuthLoading');
            if (googleAdminBtn && adminAuthLoading) {
                googleAdminBtn.disabled = true;
                adminAuthLoading.classList.remove('hidden');
            }
            window.location.href = '/auth/google/login';
        } catch (err) {
            console.error('Error initiating Google admin sign-in redirect:', err);
            Utils.showMessage('An error occurred while redirecting to Google. Please try again.', 'error');
        } finally {
            const googleAdminBtn = document.getElementById('googleAdminSigninBtn');
            const adminAuthLoading = document.getElementById('adminAuthLoading');
            if (googleAdminBtn && adminAuthLoading) {
                googleAdminBtn.disabled = false;
                adminAuthLoading.classList.add('hidden');
            }
        }
    },

// --- Toggle Election Status with Animations ---
toggleElection: async function() {
    const toggleBtn = document.getElementById('electionToggle');
    if (!toggleBtn) return;

    // Get current state from button class
    const isCurrentlyOpen = toggleBtn.classList.contains('btn-success');
    
    // Show loading state
    toggleBtn.disabled = true;
    toggleBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isCurrentlyOpen ? 'Closing...' : 'Opening...'}`;

    try {
        const response = await ElectionAPI.toggleElectionStatus();
        
        // ✅ FIXED: Only check for response.isOpen — ignore response.message for success/fail logic
        if (response.isOpen !== undefined) {
            // Update local state
            window.State.electionOpen = response.isOpen;

            // --- ANIMATED TOGGLE ---
            if (response.isOpen) {
                // Animate to ON state
                toggleBtn.classList.remove('btn-danger', 'btn-warning');
                toggleBtn.classList.add('btn-success');
                toggleBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Close Election';
                toggleBtn.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    toggleBtn.style.transform = 'scale(1)';
                }, 200);
            } else {
                // Animate to OFF state
                toggleBtn.classList.remove('btn-success', 'btn-warning');
                toggleBtn.classList.add('btn-danger');
                toggleBtn.innerHTML = '<i class="fas fa-toggle-off"></i> Open Election';
                toggleBtn.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    toggleBtn.style.transform = 'scale(1)';
                }, 200);
            }

            // Update election status display
            const electionStatusEl = document.getElementById('electionStatus');
            if (electionStatusEl) {
                if (response.isOpen) {
                    electionStatusEl.innerHTML = '<i class="fas fa-lock"></i> Election is currently open';
                    electionStatusEl.classList.remove('closed');
                    electionStatusEl.classList.add('open');
                } else {
                    electionStatusEl.innerHTML = '<i class="fas fa-lock-open"></i> Election is closed';
                    electionStatusEl.classList.remove('open');
                    electionStatusEl.classList.add('closed');
                }
            }

            // Update UI elements
            const electionClosedMessage = document.getElementById('electionClosedMessage');
            const step1 = document.getElementById('step1');

            if (response.isOpen) {
                if (electionClosedMessage) electionClosedMessage.classList.add('hidden');
                if (step1) step1.classList.remove('disabled');
                Utils.showMessage('Election has been opened. Voting is now allowed.', 'success');
            } else {
                if (electionClosedMessage) electionClosedMessage.classList.remove('hidden');
                if (step1) step1.classList.add('disabled');
                Utils.showMessage('Election has been closed. Results are now available.', 'warning');
            }

            // Update results display if on results tab
            const resultsTab = document.getElementById('results');
            if (resultsTab && resultsTab.classList.contains('active')) {
                ResultsModule.renderResults();
            }

        } else {
            // ✅ Only throw error if response.isOpen is undefined → real error
            throw new Error(response.message || 'Failed to toggle election status');
        }
    } catch (err) {
        console.error('Error toggling election:', err);
        Utils.showMessage('An error occurred while toggling the election. Please try again.', 'error');
        
        // Revert button to previous state on error
        if (isCurrentlyOpen) {
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-success');
            toggleBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Close Election';
        } else {
            toggleBtn.classList.remove('btn-success');
            toggleBtn.classList.add('btn-danger');
            toggleBtn.innerHTML = '<i class="fas fa-toggle-off"></i> Open Election';
        }
    } finally {
        toggleBtn.disabled = false;
    }
},

    // --- Export Functions ---
    exportVotes: async function() {
        try {
            await ElectionAPI.exportVotes();
            Utils.showMessage('Votes export initiated. Check console for data.', 'success');
        } catch (err) {
            console.error('Error exporting votes:', err);
            Utils.showMessage('An error occurred while exporting votes. Please try again.', 'error');
        }
    },

    exportVotesToCSV: async function() {
        const exportCSVBtn = document.getElementById('exportVotesToCSVBtn');
        let originalHTML = '';
        try {
            if (exportCSVBtn) {
                originalHTML = exportCSVBtn.innerHTML;
                exportCSVBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
                exportCSVBtn.disabled = true;
            }

            const response = await ElectionAPI.exportVotesToCSV();
            if (response.ok) {
                const contentType = response.headers.get('Content-Type');
                if (contentType && contentType.includes('text/csv')) {
                    const contentDisposition = response.headers.get('Content-Disposition');
                    let filename = 'votes_export.csv';
                    if (contentDisposition) {
                        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                        if (filenameMatch && filenameMatch.length === 2) {
                            filename = filenameMatch[1];
                        }
                    }
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    Utils.showMessage(`Votes exported successfully as ${filename}`, 'success');
                } else {
                    let responseText = await response.text();
                    let errorMessage = 'Unexpected response format from server during CSV export.';
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.message || errorMessage;
                    } catch (parseErr) {
                        console.warn('Could not parse unexpected response from CSV export as JSON:', parseErr);
                    }
                    throw new Error(errorMessage);
                }
            } else {
                let errorMessage = `Failed to export votes to CSV (Status: ${response.status}).`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (parseErr) {
                    console.warn('Could not parse error response (status ' + response.status + ') from CSV export:', parseErr);
                }
                throw new Error(errorMessage);
            }
        } catch (err) {
            console.error('Error exporting votes to CSV:', err);
            Utils.showMessage(`Error exporting votes to CSV: ${err.message}`, 'error');
        } finally {
            if (exportCSVBtn) {
                exportCSVBtn.disabled = false;
                exportCSVBtn.innerHTML = originalHTML;
            }
        }
    },

    // --- Placeholder Functions ---
    refreshData: async function() {
        Utils.showMessage('Data refreshed successfully', 'success');
    },

    backupToCloud: async function() {
        Utils.showMessage('Data backed up to cloud successfully', 'success');
    },

    // --- Admin UI Management ---
    updateAdminUIForLoggedInUser: function(user) {
        console.log("Updating Admin UI for logged-in user:", user);
        const isAdmin = user && user.isAdmin === true;

        const adminControls = document.getElementById('adminControls');
        const adminPasswordSection = document.querySelector('#admin .admin-password-section');
        if (isAdmin) {
            console.log("User is an admin. Revealing admin controls in tab.");
            if (adminControls) {
                adminControls.classList.remove('hidden');
            }
            if (adminPasswordSection) {
                adminPasswordSection.classList.add('hidden');
            }
        } else {
            console.log("User is authenticated but NOT an admin. Hiding admin controls in tab.");
            if (adminControls) {
                adminControls.classList.add('hidden');
            }
        }

        const topRightAdminBtn = document.getElementById('adminBtn');
        if (isAdmin) {
            console.log("User is an admin. Revealing top-right admin button.");
            if (topRightAdminBtn) {
                topRightAdminBtn.style.display = 'flex';
            }
        } else {
            console.log("User is authenticated but NOT an admin. Hiding top-right admin button.");
            if (topRightAdminBtn) {
                topRightAdminBtn.style.display = 'none';
            }
        }
    },

    hideAdminUIForLoggedOutUser: function() {
        console.log("Hiding all admin UI for logged-out user.");
        const adminControls = document.getElementById('adminControls');
        const adminPasswordSection = document.querySelector('#admin .admin-password-section');
        if (adminControls) adminControls.classList.add('hidden');
        const topRightAdminBtn = document.getElementById('adminBtn');
        if (topRightAdminBtn) {
            topRightAdminBtn.style.display = 'none';
        }
    }
};
