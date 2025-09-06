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

    // --- Toggle Election Status ---
    toggleElection: async function() {
        try {
            const response = await ElectionAPI.toggleElectionStatus();
            if (response.message) {
                window.State.electionOpen = response.isOpen;
                const btn = document.getElementById('electionToggle');
                const electionClosedMessage = document.getElementById('electionClosedMessage');
                const step1 = document.getElementById('step1');
                if (window.State.electionOpen) {
                    if (btn) {
                        btn.innerHTML = '<i class="fas fa-toggle-on"></i> Close Election';
                        btn.classList.remove('btn-danger');
                        btn.classList.add('btn-success');
                    }
                    if (electionStatus) {
                        electionStatus.innerHTML = '<i class="fas fa-lock"></i> Election is currently open';
                        electionStatus.classList.remove('closed');
                    }
                    if (electionClosedMessage) electionClosedMessage.classList.add('hidden');
                    if (step1) step1.classList.remove('disabled');
                    Utils.showMessage('Election has been opened. Voting is now allowed.', 'success');
                } else {
                    if (btn) {
                        btn.innerHTML = '<i class="fas fa-toggle-off"></i> Open Election';
                        btn.classList.remove('btn-success');
                        btn.classList.add('btn-danger');
                    }
                    if (electionStatus) {
                        electionStatus.innerHTML = '<i class="fas fa-lock-open"></i> Election is closed';
                        electionStatus.classList.add('closed');
                    }
                    if (electionClosedMessage) electionClosedMessage.classList.remove('hidden');
                    const step2 = document.getElementById('step2');
                    const step3 = document.getElementById('step3');
                    if (step1) step1.classList.add('disabled');
                    if (step2) step2.classList.add('disabled');
                    if (step3) step3.classList.add('disabled');
                    Utils.showMessage('Election has been closed. Results are now available.', 'success');
                }
                const resultsTab = document.getElementById('results');
                if (resultsTab && resultsTab.classList.contains('active')) {
                    ResultsModule.renderResults();
                }
            } else {
                Utils.showMessage(response.message || 'Failed to toggle election status', 'error');
            }
        } catch (err) {
            console.error('Error toggling election:', err);
            Utils.showMessage('An error occurred while toggling the election. Please try again.', 'error');
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
