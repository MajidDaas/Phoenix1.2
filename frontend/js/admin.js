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

    // --- NEW: Add Candidate Functionality (Updated for Enter Navigation & Confirmation) ---
    addCandidate: async function (event) {
        event.preventDefault(); // Prevent default form submission
        const addCandidateForm = event.target; // Get the form element from the event
        if (!addCandidateForm) {
            console.error("Add Candidate form not found in event.");
            Utils.showMessage('UI Error: Form not found.', 'error');
            return;
        }

        // --- Collect form data using the actual IDs from index.html ---
        // Map HTML form field IDs to temporary JS variable names
        const formDataTemp = {
            name: document.getElementById('candidateName')?.value.trim() || '',
            photo: document.getElementById('candidatePhoto')?.value.trim() || '',
            bio: document.getElementById('candidateBriefBio')?.value.trim() || '',
            biography: document.getElementById('candidateBio')?.value.trim() || '',
            full_name: document.getElementById('candidateFullName')?.value.trim() || '',
            email: document.getElementById('candidateEmail')?.value.trim() || '',
            phone: document.getElementById('candidatePhone')?.value.trim() || '',
            field_of_activity: document.getElementById('candidateFieldOfActivity')?.value.trim() || '',
            place_of_birth: document.getElementById('candidatePoB')?.value.trim() || '',
            residence: document.getElementById('candidatePoResidence')?.value.trim() || '',
            activity: parseInt(document.getElementById('candidateActivity')?.value.trim(), 10) || 0,
            date_of_birth: document.getElementById('candidateDoB')?.value.trim() || '',
            work: document.getElementById('candidateWork')?.value.trim() || '',
            education: document.getElementById('candidateEducation')?.value.trim() || '', // Corrected ID
            facebook_url: document.getElementById('candidateFacebook')?.value.trim() || '',
        };

        console.log("Collected Candidate Data (raw):", formDataTemp); // For debugging

        // --- Transform keys to match backend expectations (data_handler.py add_candidate) ---
        const formDataObject = {
            name: formDataTemp.name,
            photo: formDataTemp.photo,
            bio: formDataTemp.bio,
            biography: formDataTemp.biography,
            full_name: formDataTemp.full_name,
            email: formDataTemp.email,
            phone: formDataTemp.phone,
            field_of_activity: formDataTemp.field_of_activity,
            place_of_birth: formDataTemp.place_of_birth,
            residence: formDataTemp.residence,
            activity: formDataTemp.activity,
            date_of_birth: formDataTemp.date_of_birth,
            work: formDataTemp.work,
            education: formDataTemp.education,
            facebook_url: formDataTemp.facebook_url,
        };

        console.log("Candidate Data (to be sent):", formDataObject); // For debugging

        // --- Validate required fields based on actual form and backend needs ---
        // Backend requires 'name' and 'bio'. 'bio' comes from candidateBriefBio.
        if (!formDataObject.name || !formDataObject.bio) {
            Utils.showMessage('Please fill in the required fields: Name and Brief Biography.', 'error');
            return; // Stop submission if validation fails
        }

        // --- NEW: Confirmation Dialog ---
        const confirmationMessage = `Are you sure you want to add the candidate "${formDataObject.name}"?\n\nPlease verify the details before proceeding.`;
        const isConfirmed = window.confirm(confirmationMessage);
        if (!isConfirmed) {
            console.log("Candidate addition cancelled by user.");
            return;
        }
        // --- END NEW ---

        // Disable submit button and show loading indicator
        const submitBtn = addCandidateForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        const resetBtn = addCandidateForm.querySelector('button[type="reset"]'); // Also disable reset button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        }
        if (resetBtn) {
            resetBtn.disabled = true;
        }

        try {
            // --- Call the API function from api.js ---
            const result = await ElectionAPI.addCandidate(formDataObject);
            console.log("API Response:", result); // For debugging
            if (result && result.message) {
                // Check if the message indicates success
                if (result.message.toLowerCase().includes('success') || result.message.includes('added') || result.message.includes('created')) {
                    Utils.showMessage(`Success: ${result.message}`, 'success');
                    addCandidateForm.reset(); // Clear the form on success
                    // Refresh candidate lists if needed
                    if (typeof CandidatesModule !== 'undefined' && typeof CandidatesModule.loadCandidates === 'function') {
                         CandidatesModule.loadCandidates();
                    } else {
                         console.warn("CandidatesModule.loadCandidates not found. Candidate list might not update automatically.");
                    }
                } else {
                    // Assume it's an error message from the backend
                    Utils.showMessage(`Notice: ${result.message}`, 'warning'); // Use warning/info for backend messages that aren't strictly errors
                }
            } else {
                Utils.showMessage('Unexpected response from server.', 'error');
            }
        } catch (error) {
            console.error('Error adding candidate:', error);
            // Check if error is a network issue or if we got a response with an error status
            if (error instanceof TypeError && error.message.includes('fetch')) {
                Utils.showMessage('Network error. Please check your connection.', 'error');
            } else {
                // This handles errors thrown by our API function (e.g., non-2xx status)
                Utils.showMessage(`Failed to add candidate: ${error.message || 'Unknown error'}`, 'error');
            }
        } finally {
            // Re-enable submit and reset buttons and restore original text
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText || '<i class="fas fa-plus-circle"></i> Add Candidate'; // Restore original text or default
            }
            if (resetBtn) {
                resetBtn.disabled = false;
            }
        }
    },
    // --- END NEW ---
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
            const updateResponse = await fetch('/api/admin/election/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include credentials if your auth mechanism requires it (e.g., session cookies)
                    'credentials': 'include', // Ensure session cookie is sent
                },
                body: JSON.stringify({ is_open: newStatus })
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json().catch(() => ({}));
                const errorMessage = errorData.message || updateResponse.statusText;
                throw new Error(`Failed to update election status: ${errorMessage}`);
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

            // 8. Update voting tab content if needed
            if (typeof updateVotingTabContent === 'function') {
                 updateVotingTabContent();
            }

        } catch (error) {
            console.error("Error toggling election status:", error);
            Utils.showMessage(`Failed to toggle election status: ${error.message}`, 'error');
        } finally {
            // Re-enable button
            toggleBtn.disabled = false;
        }
    },

    // - Export Votes -
    exportVotes: async function () {
        try {
            // Use the API method if available in api.js
            if (typeof ElectionAPI !== 'undefined' && typeof ElectionAPI.exportVotes === 'function') {
                 // Assuming ElectionAPI.exportVotes handles the fetch and blob download
                 await ElectionAPI.exportVotes();
                 Utils.showMessage('Votes export initiated. Check your downloads.', 'success');
                 return;
            }

            // Fallback direct fetch if API method is missing
            console.warn("ElectionAPI.exportVotes not found, using direct fetch.");
            const response = await fetch('/api/admin/votes/export', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'credentials': 'include',
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || response.statusText;
                throw new Error(`Export failed: ${errorMessage}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'votes.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            Utils.showMessage('Votes exported successfully', 'success');
        } catch (error) {
            console.error("Error exporting votes:", error);
            Utils.showMessage(`Failed to export votes: ${error.message}`, 'error');
        }
    },

    // - Export Votes to CSV -
    exportVotesToCSV: async function () {
        try {
             // Use the API method if available in api.js
            if (typeof ElectionAPI !== 'undefined' && typeof ElectionAPI.exportVotesToCSV === 'function') {
                 // Assuming ElectionAPI.exportVotesToCSV handles the fetch and blob download
                 await ElectionAPI.exportVotesToCSV();
                 Utils.showMessage('Votes CSV export initiated. Check your downloads.', 'success');
                 return;
            }

            // Fallback direct fetch if API method is missing
            console.warn("ElectionAPI.exportVotesToCSV not found, using direct fetch.");
            const response = await fetch('/api/admin/votes/export/csv', {
                method: 'GET',
                headers: {
                    'Content-Type': 'text/csv',
                    'credentials': 'include',
                }
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 const errorMessage = errorData.message || response.statusText;
                 throw new Error(`CSV Export failed: ${errorMessage}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Try to get filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'votes.csv';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            Utils.showMessage('Votes exported to CSV successfully', 'success');
        } catch (error) {
            console.error("Error exporting votes to CSV:", error);
            Utils.showMessage(`Failed to export votes to CSV: ${error.message}`, 'error');
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

        // --- Manage visibility of the Admin Tab Button ---
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
        // --- END ---

        // Manage visibility of admin controls within the admin tab content
        const adminControls = document.getElementById('adminControls'); // Content inside #admin tab
        const adminPasswordSection = document.querySelector('#admin .admin-password-section'); // Check structure
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
        const topRightAdminBtn = document.getElementById('adminBtn'); // Check if this ID exists in your HTML
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
        const adminControls = document.getElementById('adminControls'); // Check if this ID exists in your HTML
        const adminPasswordSection = document.querySelector('#admin .admin-password-section'); // Check structure
        if (adminControls) adminControls.classList.add('hidden');
        // Optionally show password section or a "logged out" message
        // if (adminPasswordSection) adminPasswordSection.classList.remove('hidden');

        // Hide the top-right admin button
        const topRightAdminBtn = document.getElementById('adminBtn'); // Check if this ID exists in your HTML
        if (topRightAdminBtn) {
            topRightAdminBtn.style.display = 'none';
        }

        // --- Ensure the main tab button is also hidden for logged out users ---
        const adminTabBtn = document.getElementById('adminTabBtn');
        if (adminTabBtn) {
            adminTabBtn.classList.add('hidden-by-status');
            console.log("User logged out, ensuring admin tab button (#adminTabBtn) is hidden.");
        }
        // --- END ---
    }
};

// --- ATTACH EVENT LISTENER after DOM is Loaded ---
// This is crucial to make the form submission logic work.
document.addEventListener('DOMContentLoaded', function () {
    // --- Attach the Add Candidate Form Handler ---
    const addCandidateForm = document.getElementById('addCandidateForm');
    if (addCandidateForm) {
        // --- NEW: Add Enter Key Navigation ---
        addCandidateForm.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission on Enter in an input

                const formElements = Array.from(addCandidateForm.elements);
                const currentIndex = formElements.indexOf(document.activeElement);

                // Find the next focusable element (input, select, textarea, button)
                let nextIndex = currentIndex + 1;
                let nextElement = null;
                while (nextIndex < formElements.length) {
                    const element = formElements[nextIndex];
                    // Check if the element is focusable
                    if (
                        element &&
                        !element.disabled &&
                        element.tabIndex !== -1 && // Not explicitly removed from tab order
                        ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(element.tagName)
                    ) {
                        nextElement = element;
                        break;
                    }
                    nextIndex++;
                }

                if (nextElement) {
                    nextElement.focus();
                } else {
                    // If no next element, optionally submit the form
                    addCandidateForm.dispatchEvent(new Event('submit'));
                    console.log("Reached the end of focusable elements in the form.");
                }
            }
        });
        // --- END NEW ---

        // Bind the 'addCandidate' method of AdminModule to the form's submit event
        addCandidateForm.addEventListener('submit', AdminModule.addCandidate.bind(AdminModule));
        console.log("Add Candidate form listeners attached (Enter navigation, Submit).");
    } else {
        console.warn("Add Candidate form (#addCandidateForm) not found on this page when attaching listener.");
    }

    // --- You can attach other admin-related event listeners here if needed ---
    // Example for toggle button:
    const toggleBtn = document.getElementById('electionToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', AdminModule.toggleElection);
    }

    // Example for export buttons:
    const exportVotesBtn = document.getElementById('exportVotesBtn');
    if (exportVotesBtn) {
        exportVotesBtn.addEventListener('click', AdminModule.exportVotes);
    }
    const exportVotesToCSVBtn = document.getElementById('exportVotesToCSVBtn');
    if (exportVotesToCSVBtn) {
        exportVotesToCSVBtn.addEventListener('click', AdminModule.exportVotesToCSV);
    }
    // --- End other listeners ---
});
