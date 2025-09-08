// admin.js - Admin panel functionality and user interface management (tweaked for modern admin UI)
const AdminModule = {
    // - Google OAuth2 for Admin (redirects to same login flow) -
    signInWithGoogleForAdmin: async function () {
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

    // - Toggle Election Status with Animations (unchanged) -
    toggleElection: async function () {
        const toggleBtn = document.getElementById('electionToggle');
        if (!toggleBtn) {
            console.error("Election toggle button not found.");
            Utils.showMessage('UI Error: Toggle button not found.', 'error');
            return;
        }

        // Disable button immediately to prevent spam
        toggleBtn.disabled = true;

        try {
            // 1. Fetch current status
            const statusResponse = await ElectionAPI.getElectionStatus();
            const isOpen = statusResponse.is_open;

            // 2. Determine new status
            const newStatus = !isOpen;
            console.log(`Toggling election status from ${isOpen} to ${newStatus}`);

            // 3. Call API to update status
            const updateResponse = await fetch('/api/admin/election/status', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_open: newStatus })
            });

            if (!updateResponse.ok) {
                throw new Error(`Failed to update election status: ${updateResponse.statusText}`);
            }

            const data = await updateResponse.json();
            console.log("Election status update response:", data);

            // 4. Update frontend state
            window.State.electionOpen = data.is_open;
            console.log("Frontend electionOpen state updated to:", window.State.electionOpen);

            // 5. Update UI elements
            const electionStatusElement = document.getElementById('electionStatus');
            if (electionStatusElement) {
                if (data.is_open) {
                    electionStatusElement.innerHTML = '<i class="fas fa-lock-open"></i> Election is open';
                    electionStatusElement.classList.remove('closed');
                    electionStatusElement.classList.add('open');
                } else {
                    electionStatusElement.innerHTML = '<i class="fas fa-lock"></i> Election is closed';
                    electionStatusElement.classList.remove('open');
                    electionStatusElement.classList.add('closed');
                }
            }

            // 6. Update button text and style with animation
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                // Remove any existing animation class
                toggleBtn.classList.remove('scale-animation');

                if (data.is_open) {
                    // Election is now open
                    toggleBtn.innerHTML = '<i class="fas fa-lock"></i> Close Election';
                    toggleBtn.classList.remove('btn-success');
                    toggleBtn.classList.add('btn-warning');
                } else {
                    // Election is now closed
                    toggleBtn.innerHTML = '<i class="fas fa-lock-open"></i> Open Election';
                    toggleBtn.classList.remove('btn-warning');
                    toggleBtn.classList.add('btn-success');
                }
                // Trigger reflow to restart animation
                // eslint-disable-next-line no-unused-vars
                const _ = toggleBtn.offsetWidth;
                toggleBtn.classList.add('scale-animation');
            }

            // 7. Show success message
            Utils.showMessage(`Election ${data.is_open ? 'opened' : 'closed'} successfully`, 'success');

            // 8. Update voting tab content if needed (e.g., if it should now show "Election Closed")
            // This might be handled by the electionStatusElement update and CSS, or might need explicit call
            // updateVotingTabContent(); // Assuming this function exists globally or is accessible

        } catch (error) {
            console.error("Error toggling election status:", error);
            Utils.showMessage('Failed to toggle election status. Please try again.', 'error');
        } finally {
            // Re-enable button
            toggleBtn.disabled = false;
        }
    },

    // - Export Votes -
    exportVotes: async function () {
        try {
            const response = await fetch('/api/admin/export/votes', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'votes.json'; // Or get filename from response headers
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            Utils.showMessage('Votes exported successfully', 'success');
        } catch (error) {
            console.error("Error exporting votes:", error);
            Utils.showMessage('Failed to export votes.', 'error');
        }
    },

    // - Export Votes to CSV -
    exportVotesToCSV: async function () {
        try {
            const response = await fetch('/api/admin/export/votes/csv', {
                method: 'GET',
                headers: {
                    'Content-Type': 'text/csv',
                }
            });

            if (!response.ok) {
                throw new Error(`CSV Export failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'votes.csv'; // Or get filename from response headers
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            Utils.showMessage('Votes exported to CSV successfully', 'success');
        } catch (error) {
            console.error("Error exporting votes to CSV:", error);
            Utils.showMessage('Failed to export votes to CSV.', 'error');
        }
    },

    // - Placeholder Functions -
    refreshData: async function () {
        Utils.showMessage('Data refreshed successfully', 'success');
        // trigger a refresh in other modules
        if (window.ResultsModule && typeof window.ResultsModule.renderResults === 'function') {
            window.ResultsModule.renderResults();
        }
    },
    backupToCloud: async function () {
        Utils.showMessage('Data backed up to cloud successfully', 'success');
    },

    // - Admin UI Management -
    updateAdminUIForLoggedInUser: function (user) {
        console.log("Updating Admin UI for logged-in user:", user);
        // Assumes the user object from the backend has an 'isAdmin' boolean property
        // e.g., { ..., "isAdmin": true, ... }
        const isAdmin = user && user.isAdmin === true;

        // --- FIX: Manage visibility of the Admin Tab Button ---
        const adminTabBtn = document.getElementById('adminTabBtn'); // The button in the main .tabs list
        if (adminTabBtn) {
            if (isAdmin) {
                adminTabBtn.classList.remove('hidden-by-status');
                console.log("User is admin, showing admin tab button (#adminTabBtn).");
            } else {
                adminTabBtn.classList.add('hidden-by-status');
                console.log("User is not admin, hiding admin tab button (#adminTabBtn).");
            }
        } else {
             console.warn("Admin tab button (#adminTabBtn) not found in the DOM.");
        }
        // --- END FIX ---

        // Manage visibility of admin controls within the admin tab content
        const adminControls = document.getElementById('adminControls'); // Content inside #admin tab
        const adminPasswordSection = document.querySelector('#admin .admin-password-section');
        if (isAdmin) {
            console.log("User is an admin. Revealing admin controls in tab.");
            if (adminControls) {
                adminControls.classList.remove('hidden');
            }
            if (adminPasswordSection) {
                adminPasswordSection.classList.add('hidden'); // Hide password prompt if user is admin
            }
        } else {
            console.log("User is authenticated but NOT an admin. Hiding admin controls in tab.");
            if (adminControls) {
                adminControls.classList.add('hidden');
            }
            // Optionally, show a "not authorized" message or the password section
            // if (adminPasswordSection) { adminPasswordSection.classList.remove('hidden'); }
        }

        // Manage visibility of the top-right admin quick-access button
        const topRightAdminBtn = document.getElementById('adminBtn');
        if (isAdmin) {
            console.log("User is an admin. Revealing top-right admin button.");
            if (topRightAdminBtn) {
                topRightAdminBtn.style.display = 'flex'; // Or remove 'hidden' class if styled that way
            }
        } else {
            console.log("User is authenticated but NOT an admin. Hiding top-right admin button.");
            if (topRightAdminBtn) {
                topRightAdminBtn.style.display = 'none'; // Or add 'hidden' class
            }
        }
    },

    hideAdminUIForLoggedOutUser: function () {
        console.log("Hiding all admin UI for logged-out user.");
        // Hide content inside the admin tab
        const adminControls = document.getElementById('adminControls');
        const adminPasswordSection = document.querySelector('#admin .admin-password-section');
        if (adminControls) adminControls.classList.add('hidden');
        // Optionally show password section or a "logged out" message
        // if (adminPasswordSection) adminPasswordSection.classList.remove('hidden');

        // Hide the top-right admin button
        const topRightAdminBtn = document.getElementById('adminBtn');
        if (topRightAdminBtn) {
            topRightAdminBtn.style.display = 'none';
        }

        // --- ADDITION: Ensure the main tab button is also hidden for logged out users ---
        const adminTabBtn = document.getElementById('adminTabBtn');
        if (adminTabBtn) {
            adminTabBtn.classList.add('hidden-by-status');
            console.log("User logged out, ensuring admin tab button (#adminTabBtn) is hidden.");
        }
        // --- END ADDITION ---
    }
};
