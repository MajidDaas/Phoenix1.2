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
            Utils.showMessage('auth.googleError', 'error');
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
            Utils.showMessage('admin.uiErrorFormNotFound', 'error');
            return;
        }
        // --- Collect form data using the actual IDs from index.html ---
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
            education: document.getElementById('candidateEducation')?.value.trim() || '',
            facebook_url: document.getElementById('candidateFacebook')?.value.trim() || '',
        };
        console.log("Collected Candidate Data (raw):", formDataTemp);
        // --- Transform keys to match backend expectations ---
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
        console.log("Candidate Data (to be sent):", formDataObject);
        // --- Validate required fields ---
        if (!formDataObject.name || !formDataObject.bio) {
            Utils.showMessage('admin.requiredFields', 'error');
            return;
        }
        // --- NEW: Confirmation Dialog ---
        const confirmationMessage = translations[currentLanguage]?.admin.confirmAddCandidate
            ? translations[currentLanguage].admin.confirmAddCandidate.replace('{name}', formDataObject.name)
            : `Are you sure you want to add the candidate "${formDataObject.name}"? Please verify the details before proceeding.`;
        const isConfirmed = window.confirm(confirmationMessage);
        if (!isConfirmed) {
            console.log("Candidate addition cancelled by user.");
            return;
        }
        // --- END NEW ---
        // Disable submit button and show loading indicator
        const submitBtn = addCandidateForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        const resetBtn = addCandidateForm.querySelector('button[type="reset"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span data-i18n="admin.addingCandidate">Adding...</span>';
            // Apply translations
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
        }
        if (resetBtn) {
            resetBtn.disabled = true;
        }
        try {
            const result = await ElectionAPI.addCandidate(formDataObject);
            console.log("API Response:", result);
            if (result && result.message) {
                if (result.message.toLowerCase().includes('success') || result.message.includes('added') || result.message.includes('created')) {
                    Utils.showMessage('admin.addCandidateSuccess', 'success');
                    addCandidateForm.reset();
                    if (typeof CandidatesModule !== 'undefined' && typeof CandidatesModule.loadCandidates === 'function') {
                         CandidatesModule.loadCandidates();
                    } else {
                         console.warn("CandidatesModule.loadCandidates not found. Candidate list might not update automatically.");
                    }
                } else {
                    Utils.showMessage(`admin.backendNotice: ${result.message}`, 'warning');
                }
            } else {
                Utils.showMessage('admin.unexpectedResponse', 'error');
            }
        } catch (error) {
            console.error('Error adding candidate:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
                Utils.showMessage('admin.networkError', 'error');
            } else {
                Utils.showMessage('admin.addCandidateFailed', 'error');
            }
        } finally {
            // Re-enable submit and reset buttons and restore original text
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText || '<i class="fas fa-plus-circle"></i> <span data-i18n="addCandidate">Add Candidate</span>';
                // Apply translations
                if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                    I18nModule.applyTranslations();
                }
            }
            if (resetBtn) {
                resetBtn.disabled = false;
            }
        }
    },
    // --- END NEW ---
    // - Toggle Election Status with Animations -
    toggleElection: async function () {
        const toggleBtn = document.getElementById('electionToggle');
        if (!toggleBtn) {
            console.error("Election toggle button not found.");
            Utils.showMessage('admin.uiErrorToggleNotFound', 'error');
            return;
        }
        toggleBtn.disabled = true;
        try {
            const statusResponse = await ElectionAPI.getElectionStatus();
            const isOpen = statusResponse.is_open;
            const newStatus = !isOpen;
            console.log(`Toggling election status from ${isOpen} to ${newStatus}`);
            const updateResponse = await fetch('/api/admin/election/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'credentials': 'include',
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
            window.State.electionOpen = data.is_open;
            console.log("Frontend electionOpen state updated to:", window.State.electionOpen);
            const electionStatusElement = document.getElementById('electionStatus');
            if (electionStatusElement) {
                if (data.is_open) {
                    electionStatusElement.innerHTML = '<i class="fas fa-lock-open"></i> <span data-i18n="electionIsClosed">Election is open</span>';
                } else {
                    electionStatusElement.innerHTML = '<i class="fas fa-lock"></i> <span data-i18n="electionIsClosed">Election is closed</span>';
                }
                // Apply translations
                if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                    I18nModule.applyTranslations();
                }
            }
            // Update button text and style with animation
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                toggleBtn.classList.remove('scale-animation');
                if (data.is_open) {
                    toggleBtn.innerHTML = '<i class="fas fa-lock"></i> <span data-i18n="admin.closeElection">Close Election</span>';
                    toggleBtn.classList.remove('btn-success');
                    toggleBtn.classList.add('btn-warning');
                } else {
                    toggleBtn.innerHTML = '<i class="fas fa-lock-open"></i> <span data-i18n="admin.openElection">Open Election</span>';
                    toggleBtn.classList.remove('btn-warning');
                    toggleBtn.classList.add('btn-success');
                }
                // Trigger reflow to restart animation
                const _ = toggleBtn.offsetWidth;
                toggleBtn.classList.add('scale-animation');
                // Apply translations
                if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                    I18nModule.applyTranslations();
                }
            }
            Utils.showMessage(data.is_open ? 'admin.electionOpened' : 'admin.electionClosed', 'success');
            if (typeof updateVotingTabContent === 'function') {
                 updateVotingTabContent();
            }
        } catch (error) {
            console.error("Error toggling election status:", error);
            Utils.showMessage('admin.toggleElectionFailed', 'error');
        } finally {
            toggleBtn.disabled = false;
        }
    },
// - Export Votes -
exportVotes: async function () {
    try {
        // Use the API method if available in api.js
        if (typeof ElectionAPI !== 'undefined' && typeof ElectionAPI.exportVotes === 'function') {
            // --- CORRECTED: Handle the Response object returned by ElectionAPI.exportVotes ---
            console.log("AdminModule.exportVotes: Calling ElectionAPI.exportVotes");
            const response = await ElectionAPI.exportVotes(); // Get the Response object

            // --- CORRECTED: Perform the download logic here ---
            console.log("AdminModule.exportVotes: ElectionAPI response received, processing for download.");

            // --- Get the filename from the Content-Disposition header if possible ---
            let filename = 'votes_export.json'; // Default filename
            const contentDisposition = response.headers.get('Content-Disposition');
            console.log("AdminModule.exportVotes: Response Content-Disposition:", contentDisposition);
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                    console.log("AdminModule.exportVotes: Parsed filename:", filename);
                }
            }

            // --- Get the Blob from the response ---
            const blob = await response.blob();
            console.log("AdminModule.exportVotes: Blob received, size:", blob.size, "type:", blob.type);

            // --- Create a temporary URL for the blob ---
            const url = window.URL.createObjectURL(blob);
            console.log("AdminModule.exportVotes: Created Object URL:", url);

            // --- Create a temporary anchor element ---
            const a = document.createElement('a');
            a.style.display = 'none'; // Hide the anchor element
            a.href = url;
            a.download = filename; // Use the filename from the header or the default

            // --- Trigger the download by simulating a click ---
            console.log("AdminModule.exportVotes: Triggering download for", filename);
            document.body.appendChild(a);
            a.click();

            // --- Clean up: remove the anchor and revoke the Object URL ---
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log("AdminModule.exportVotes: Download triggered and resources cleaned up.");

            Utils.showMessage('admin.votesExported', 'success'); // Use translation key
            return; // Important: Exit after handling the API call
            // --- END CORRECTED ---
        }

        // --- Fallback direct fetch if API method is missing (shouldn't happen now) ---
        console.warn("ElectionAPI.exportVotes not found, using direct fetch.");
        const response = await fetch('/api/admin/votes/export', {
            method: 'GET',
            // --- FIX 1: Move credentials outside headers ---
            credentials: 'include', // Correct placement for including cookies
            headers: {
                // --- FIX 2: Remove Content-Type for GET request ---
                // 'Content-Type': 'application/json', // Not needed for GET and can interfere
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || response.statusText;
            throw new Error(`Export failed: ${errorMessage}`);
        }

        // --- Get the filename from the Content-Disposition header if possible (Fallback) ---
        let filename = 'votes_export.json'; // Default filename
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }

        // --- Get the Blob from the response (Fallback) ---
        const blob = await response.blob();

        // --- Create a temporary URL for the blob (Fallback) ---
        const url = window.URL.createObjectURL(blob);

        // --- Create a temporary anchor element (Fallback) ---
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;

        // --- Trigger the download (Fallback) ---
        document.body.appendChild(a);
        a.click();

        // --- Clean up (Fallback) ---
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        Utils.showMessage('admin.votesExported', 'success'); // Use translation key
    } catch (error) {
        console.error("Error in AdminModule.exportVotes:", error);
        // Use translation key for error message
        Utils.showMessage('admin.exportVotesFailed', 'error');
    }
},
    // - Export Votes to CSV -
    exportVotesToCSV: async function () {
        try {
            if (typeof ElectionAPI !== 'undefined' && typeof ElectionAPI.exportVotesToCSV === 'function') {
                const response = await ElectionAPI.exportVotesToCSV();
                const contentType = response.headers.get('content-type');
                let blob;
                if (contentType && contentType.includes('application/json')) {
                    const jsonData = await response.json();
                    if (jsonData.csv_data) {
                        blob = new Blob([jsonData.csv_data], { type: 'text/csv;charset=utf-8;' });
                    } else {
                        throw new Error('CSV data not found in server response.');
                    }
                } else if (contentType && contentType.includes('text/csv')) {
                    blob = await response.blob();
                } else {
                    throw new Error(`Unexpected content type: ${contentType}`);
                }
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                let filename = 'votes.csv';
                const contentDisposition = response.headers.get('Content-Disposition');
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
                Utils.showMessage('admin.votesExportedCSV', 'success');
                return;
            }
            console.warn("ElectionAPI.exportVotesToCSV not found, using direct fetch.");
            const response = await fetch('/api/admin/votes/export/csv', {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || response.statusText;
                throw new Error(`CSV Export failed: ${errorMessage}`);
            }
            const contentType = response.headers.get('content-type');
            let blob;
            if (contentType && contentType.includes('application/json')) {
                const jsonData = await response.json();
                if (jsonData.csv_data) {
                    blob = new Blob([jsonData.csv_data], { type: 'text/csv;charset=utf-8;' });
                } else {
                    throw new Error('CSV data not found in server response.');
                }
            } else if (contentType && contentType.includes('text/csv')) {
                blob = await response.blob();
            } else {
                throw new Error(`Unexpected content type: ${contentType}`);
            }
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            let filename = 'votes.csv';
            const contentDisposition = response.headers.get('Content-Disposition');
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
            Utils.showMessage('admin.votesExportedCSV', 'success');
        } catch (error) {
            console.error("Error exporting votes to CSV:", error);
            Utils.showMessage('admin.exportVotesCSVFailed', 'error');
        }
    },
    // - Placeholder Functions -
    refreshData: async function () {
        Utils.showMessage('admin.dataRefreshed', 'success');
        if (window.ResultsModule && typeof window.ResultsModule.renderResults === 'function') {
            window.ResultsModule.renderResults();
        }
    },
    backupToCloud: async function () {
        Utils.showMessage('admin.dataBackedUp', 'success');
    },
    // - Admin UI Management -
    updateAdminUIForLoggedInUser: function (user) {
        console.log("Updating Admin UI for logged-in user:", user);
        const isAdmin = user && user.isAdmin === true;
        const adminTabBtn = document.getElementById('adminTabBtn');
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
    hideAdminUIForLoggedOutUser: function () {
        console.log("Hiding all admin UI for logged-out user.");
        const adminControls = document.getElementById('adminControls');
        const adminPasswordSection = document.querySelector('#admin .admin-password-section');
        if (adminControls) adminControls.classList.add('hidden');
        const topRightAdminBtn = document.getElementById('adminBtn');
        if (topRightAdminBtn) {
            topRightAdminBtn.style.display = 'none';
        }
        const adminTabBtn = document.getElementById('adminTabBtn');
        if (adminTabBtn) {
            adminTabBtn.classList.add('hidden-by-status');
            console.log("User logged out, ensuring admin tab button (#adminTabBtn) is hidden.");
        }
    }
};

// --- ATTACH EVENT LISTENER after DOM is Loaded ---
document.addEventListener('DOMContentLoaded', function () {
    const addCandidateForm = document.getElementById('addCandidateForm');
    if (addCandidateForm) {
        addCandidateForm.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const formElements = Array.from(addCandidateForm.elements);
                const currentIndex = formElements.indexOf(document.activeElement);
                let nextIndex = currentIndex + 1;
                let nextElement = null;
                while (nextIndex < formElements.length) {
                    const element = formElements[nextIndex];
                    if (
                        element &&
                        !element.disabled &&
                        element.tabIndex !== -1 &&
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
                    addCandidateForm.dispatchEvent(new Event('submit'));
                    console.log("Reached the end of focusable elements in the form.");
                }
            }
        });
        addCandidateForm.addEventListener('submit', AdminModule.addCandidate.bind(AdminModule));
        console.log("Add Candidate form listeners attached (Enter navigation, Submit).");
    } else {
        console.warn("Add Candidate form (#addCandidateForm) not found on this page when attaching listener.");
    }
    const toggleBtn = document.getElementById('electionToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', AdminModule.toggleElection);
    }
    const exportVotesBtn = document.getElementById('exportVotesBtn');
    if (exportVotesBtn) {
        exportVotesBtn.addEventListener('click', AdminModule.exportVotes);
    }
    const exportVotesToCSVBtn = document.getElementById('exportVotesToCSVBtn');
    if (exportVotesToCSVBtn) {
        exportVotesToCSVBtn.addEventListener('click', AdminModule.exportVotesToCSV);
    }
});
