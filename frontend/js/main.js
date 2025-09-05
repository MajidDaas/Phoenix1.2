// main.js - Main application logic with Language Switching, Sorting, and other features

// State management
let selectedCandidates = [];
let executiveCandidates = [];
const maxSelections = 15;
const maxExecutives = 7;
let activeDetails = null;
let electionOpen = true; // This will be updated by the backend
let currentChart = null;
const totalVoters = 20; // Number of eligible voters (for demo)
let currentUser = null; // Store the authenticated user information
let candidates = []; // Moved from const to let, initialized as empty

// --- Language Switching (Using Backend API) ---
let translations = {}; // Will hold translations fetched from backend
let currentLanguage = 'en'; // Default language
// --- END Language Switching ---

// DOM Elements - Initialize as null to avoid errors
let candidateList = null;
let selectedCount = null;
let submitVoteBtn = null;
let electionStatus = null;
let resultsContent = null;
let winnerInfoPopup = null;

// Initialize DOM elements after DOM is loaded
function initDOMElements() {
    candidateList = document.getElementById('candidateList');
    selectedCount = document.getElementById('selectedCount');
    submitVoteBtn = document.getElementById('submitVoteBtn');
    electionStatus = document.getElementById('electionStatus');
    resultsContent = document.getElementById('resultsContent');
    winnerInfoPopup = document.getElementById('winnerInfoPopup');
}

// --- NEW: Sorting Utility Function ---
/**
 * Sorts an array of candidate objects based on the given criteria.
 * @param {Array} candidatesArray - The array of candidate objects to sort.
 * @param {string} criteria - The sorting criteria ('name-asc', 'name-desc', 'activity-asc', 'activity-desc').
 * @returns {Array} - The sorted array.
 */
function sortCandidates(candidatesArray, criteria) {
    return candidatesArray.sort((a, b) => {
        switch (criteria) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'activity-desc':
                // Sort by activity descending, then by name ascending for ties
                if (b.activity !== a.activity) {
                    return b.activity - a.activity;
                }
                return a.name.localeCompare(b.name);
            case 'activity-asc':
                // Sort by activity ascending, then by name ascending for ties
                if (a.activity !== b.activity) {
                    return a.activity - b.activity;
                }
                return a.name.localeCompare(b.name);
            default:
                return 0; // No sorting
        }
    });
}
// --- END NEW: Sorting Utility ---


// --- UI Functions ---
// Initialize candidates for voting
function initCandidates() {
    if (!candidateList) {
        console.error('candidateList element not found');
        return;
    }
    candidateList.innerHTML = '';

    // --- NEW: Get sorting criteria for Voting Tab ---
    const sortSelect = document.getElementById('sortVoteBy');
    let sortBy = 'name-asc'; // Default
    if (sortSelect) {
        sortBy = sortSelect.value;
    }
    // --- END NEW ---

    // --- NEW: Sort candidates based on criteria ---
    const sortedCandidates = sortCandidates([...candidates], sortBy); // Create a copy to sort
    // --- END NEW ---

    sortedCandidates.forEach(candidate => {
        const activityClass = candidate.activity >= 14 ? 'activity-high' :
                            candidate.activity >= 7 ? 'activity-medium' : 'activity-low';
        const activityText = candidate.activity >= 14 ? 'High Activity' :
                           candidate.activity >= 7 ? 'Medium Activity' : 'Low Activity';
        const card = document.createElement('div');
        card.className = 'candidate-item';
        card.dataset.id = candidate.id;
        card.innerHTML = `
            <div class="candidate-info" data-id="${candidate.id}">
                <i class="fas fa-info"></i>
            </div>
            <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                 onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${candidate.name.charAt(0)}'">
            <div class="candidate-name">${candidate.name}</div>
            <div class="candidate-position">${candidate.position}</div>
            <div class="activity-indicator ${activityClass}">${activityText}</div>
            <div class="candidate-details" id="details-${candidate.id}">
                <div class="close-details" data-id="${candidate.id}">×</div>
                <h4>${candidate.name}</h4>
                <p>${candidate.bio}</p>
                <p><strong>Weekly Activity:</strong> ${candidate.activity} hours</p>
            </div>
        `;
        card.addEventListener('click', (e) => {
            // Prevent triggering when clicking on info icon or close button
            if (e.target.closest('.candidate-info') || e.target.closest('.close-details')) {
                return;
            }
            const id = parseInt(card.dataset.id);
            selectCandidate(id);
        });
        candidateList.appendChild(card);
    });
    // Add event listeners for info icons
    document.querySelectorAll('.candidate-info').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(icon.dataset.id);
            showCandidateDetails(id);
        });
    });
    // Add event listeners for close buttons
    document.querySelectorAll('.close-details').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(button.dataset.id);
            hideCandidateDetails(id);
        });
    });
}

// Show candidate details
function showCandidateDetails(id) {
    // Hide any currently active details
    if (activeDetails) {
        hideCandidateDetails(activeDetails);
    }
    const details = document.getElementById(`details-${id}`);
    if (details) {
        details.classList.add('show');
        activeDetails = id;
    }
}

// Hide candidate details
function hideCandidateDetails(id) {
    const details = document.getElementById(`details-${id}`);
    if (details) {
        details.classList.remove('show');
        activeDetails = null;
    }
}

// Select candidate for council (UPDATED LOGIC: Clicking EO removes selection entirely)
function selectCandidate(id) {
    // Check if election is open
    if (!electionOpen) {
        showMessage('Voting is currently closed', 'error');
        return;
    }
    // Ensure candidates data is available
    if (typeof candidates === 'undefined' || !Array.isArray(candidates)) {
        showMessage('Candidate data is not loaded correctly.', 'error');
        return;
    }
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) {
        console.warn(`Candidate with ID ${id} not found.`);
        return;
    }
    const isSelected = selectedCandidates.includes(id);
    const isExecutive = executiveCandidates.includes(id);
    // --- UPDATED LOGIC ---
    if (isSelected) {
        // Clicked on a candidate that is already selected
        if (isExecutive) {
            // --- CHANGE: Clicking an EO removes it completely ---
            // 1. Remove from Executive Officers list (removes orange badge)
            executiveCandidates = executiveCandidates.filter(cId => cId !== id);
            console.log(`Removed candidate ID ${id} from Executive Officers (orange badge removed).`);
            // 2. Remove from Selected list (removes green border)
            selectedCandidates = selectedCandidates.filter(cId => cId !== id);
            console.log(`Deselected candidate ID ${id} (green border removed).`);
            // --- END CHANGE ---
        } else {
            // It's selected but NOT an Executive Officer.
            // Check if we can promote it to Executive Officer
            if (executiveCandidates.length < maxExecutives) {
                executiveCandidates.push(id);
                console.log(`Promoted candidate ID ${id} to Executive Officer (added orange badge).`);
            } else {
                // EO list is full. Interpret click as deselection.
                selectedCandidates = selectedCandidates.filter(cId => cId !== id);
                console.log(`Deselected candidate ID ${id} (EO list full, green border removed).`);
            }
        }
    } else {
        // Clicked on a candidate that is NOT selected
        if (selectedCandidates.length < maxSelections) {
            selectedCandidates.push(id);
            console.log(`Selected candidate ID ${id} (added green border).`);
        } else {
            showMessage(`You can only select ${maxSelections} council members`, 'error');
            return;
        }
    }
    // --- END UPDATED LOGIC ---
    updateUI();
}
// --- END FIXED VOTING LOGIC ---

// Update UI based on selections
function updateUI() {
    // Update counters - Check if elements exist
    if (selectedCount) selectedCount.textContent = selectedCandidates.length;

    // Update card states
    document.querySelectorAll('.candidate-item').forEach(card => {
        const id = parseInt(card.dataset.id);
        const isSelected = selectedCandidates.includes(id);
        const isExecutive = executiveCandidates.includes(id);
        card.classList.toggle('selected', isSelected);
        card.classList.toggle('executive-selected', isExecutive);
        // Remove existing badges
        const existingBadge = card.querySelector('.priority-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        // Add new badge if selected
        if (isSelected) {
            const badge = document.createElement('div');
            badge.className = 'priority-badge';
            badge.textContent = selectedCandidates.indexOf(id) + 1;
            if (isExecutive) {
                badge.classList.add('executive-badge');
                badge.textContent = executiveCandidates.indexOf(id) + 1;
            }
            card.appendChild(badge);
        }
    });
    // Enable/disable submit button - Check if element exists
    if (submitVoteBtn) {
        submitVoteBtn.disabled = selectedCandidates.length !== maxSelections;
    }
}

// Submit vote
async function submitVote() {
    if (!currentUser) {
         showMessage('You must be authenticated before submitting.', 'error');
         return;
    }
    if (selectedCandidates.length !== maxSelections) {
        showMessage(`Please select exactly ${maxSelections} candidates`, 'error');
        return;
    }
    if (executiveCandidates.length !== maxExecutives) {
        showMessage(`Please designate exactly ${maxExecutives} executive officers`, 'error');
        return;
    }
    // Check if loading element exists before using it
    const submitLoadingElement = document.getElementById('submitLoading');
    // Show loading state
    if (submitVoteBtn) submitVoteBtn.disabled = true;
    if (submitLoadingElement) submitLoadingElement.classList.remove('hidden');
    try {
        const response = await ElectionAPI.submitVote(selectedCandidates, executiveCandidates);
        if (response.message && response.message.includes('successfully')) {
            showMessage(`Vote submitted successfully!
Selected Candidates: ${selectedCandidates.length}
Executive Officers: ${executiveCandidates.length}`, 'success');
            // Reset selections
            selectedCandidates = [];
            executiveCandidates = [];
            updateUI();
            // Reset to step 1
            const step1 = document.getElementById('step1');
            const step2 = document.getElementById('step2');
            const step3 = document.getElementById('step3');
            if (step1) step1.classList.remove('hidden');
            if (step2) step2.classList.add('hidden');
            if (step3) step3.classList.add('hidden');
            currentUser = null; // Clear user after submission
        } else {
            showMessage(response.message || 'Failed to submit vote', 'error');
        }
    } catch (err) {
        console.error('Error submitting vote:', err);
        showMessage('An error occurred while submitting your vote. Please try again.', 'error');
    } finally {
        // Hide loading state
        if (submitVoteBtn) submitVoteBtn.disabled = false;
        if (submitLoadingElement) submitLoadingElement.classList.add('hidden');
    }
}

// Render results - Showing only Top 15 Council Members
async function renderResults() {
    if (!resultsContent) {
        console.error('resultsContent element not found');
        return;
    }
    try {
        const resultsData = await ElectionAPI.getResults();
        // FIX: Check if stats exists and provide default values
        const stats = resultsData.stats || { totalCandidates: 0, totalVotes: 0 };
        // Update stats - Check if elements exist
        const totalCandidatesEl = document.getElementById('totalCandidates');
        const voterTurnoutEl = document.getElementById('voterTurnout');
        if (totalCandidatesEl) totalCandidatesEl.textContent = stats.totalCandidates;
        if (voterTurnoutEl) {
            voterTurnoutEl.textContent = resultsData.isOpen ?
                'Elections in Progress' :
                `${Math.round((stats.totalVotes / totalVoters) * 100)}%`;
        }
        if (resultsData.isOpen) {
            resultsContent.innerHTML = `
                <div class="status-info">
                    <p><i class="fas fa-info-circle"></i> Results will be available after the election is closed.</p>
                </div>
            `;
            // Destroy existing chart if election reopens
            if (currentChart) {
                currentChart.destroy();
                currentChart = null;
            }
            // Hide the pre-defined chart container if election is open
            const chartContainerElement = document.getElementById('chartContainer');
            if (chartContainerElement) {
                chartContainerElement.classList.add('hidden');
            }
            return;
        }
        // FIX: Check if results exists and provide default
        const fullResultsArray = resultsData.results || [];
        // --- NEW: Get only the top 15 candidates based on Council Votes ---
        const top15ResultsArray = fullResultsArray.slice(0, 15);
        // --- END NEW ---
        // --- MODIFIED: Identify executive officers within the TOP 15 ---
        // Sort the TOP 15 by executive votes to find the top 7 EOs among them
        const sortedTop15ByExecutiveVotes = [...top15ResultsArray].sort((a, b) => b.executiveVotes - a.executiveVotes);
        const executiveOfficers = sortedTop15ByExecutiveVotes.slice(0, 7).map(c => c.name);
        // --- END MODIFIED ---
        let resultsHTML = `<div class="results-container">`;
        // --- MODIFIED: Loop only through the TOP 15 results ---
        top15ResultsArray.forEach(candidate => {
        // --- END MODIFIED ---
            // Find the full candidate object to get winner status and other details
            const fullCandidate = candidates.find(c => c.id === candidate.id);
            const isExecutive = executiveOfficers.includes(candidate.name);
            // Add data attribute for winner status and use winner-name class for styling and interaction
            const winnerClass = (fullCandidate && fullCandidate.isWinner) ? 'winner-name' : '';
            const winnerDataAttr = (fullCandidate && fullCandidate.isWinner) ? `data-is-winner="true"` : `data-is-winner="false"`;
            resultsHTML += `
                <div class="result-card ${isExecutive ? 'executive' : ''}">
                    <h4>
                        <span class="${winnerClass}" ${winnerDataAttr}
                              data-name="${candidate.name}"
                              data-position="${fullCandidate ? fullCandidate.position : ''}"
                              data-bio="${fullCandidate ? fullCandidate.bio : ''}"
                              data-activity="${fullCandidate ? fullCandidate.activity : ''}"
                              onclick="showWinnerPopup(event)">
                            ${candidate.name}
                        </span>
                    </h4>
                    <div class="progress-container">
                        <div class="progress-label">Council Votes:</div>
                        <div class="progress-bar">
                            <!-- Adjust width calculation based on the max council vote among the TOP 15 -->
                            <div class="progress-fill" style="width: ${Math.min(100, (candidate.councilVotes / (top15ResultsArray[0]?.councilVotes || 1)) * 100)}%"></div>
                        </div>
                        <div class="progress-value">${candidate.councilVotes.toLocaleString()}</div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-label">Executive Votes:</div>
                        <div class="progress-bar">
                            <!-- Adjust width calculation based on the max executive vote among the TOP 15 by exec votes -->
                            <div class="progress-fill executive" style="width: ${Math.min(100, (candidate.executiveVotes / (sortedTop15ByExecutiveVotes[0]?.executiveVotes || 1)) * 100)}%"></div>
                        </div>
                        <div class="progress-value">${candidate.executiveVotes.toLocaleString()}</div>
                    </div>
                </div>
            `;
        });
        resultsHTML += `</div>`;
        resultsContent.innerHTML = resultsHTML;
        // --- MODIFIED: Show the pre-defined chart container ---
        const chartContainerElement = document.getElementById('chartContainer');
        if (chartContainerElement) {
            chartContainerElement.classList.remove('hidden');
        }
        // --- END MODIFIED ---
        // --- MODIFIED: Create chart using only the TOP 15 data ---
        // Use the explicitly sorted data for the chart to guarantee the order matches the backend sorting logic:
        // Primary sort: Council Votes (descending), Secondary sort: Executive Votes (descending) for ties.
        const sortedChartData = [...top15ResultsArray]; // Create a copy to avoid modifying the original slice
        sortedChartData.sort((a, b) => {
            // Primary sort: Council Votes (descending)
            if (b.councilVotes !== a.councilVotes) {
                return b.councilVotes - a.councilVotes;
            }
            // Secondary sort: Executive Votes (descending) for ties in council votes
            return b.executiveVotes - a.executiveVotes;
        });
        // Create chart - Ensuring it's destroyed and recreated correctly
        setTimeout(() => {
            const chartCanvas = document.getElementById('resultsChart');
            if (!chartCanvas) {
                console.error('resultsChart canvas element not found');
                return;
            }
            const ctx = chartCanvas.getContext('2d');
            if (currentChart) {
                currentChart.destroy();
                currentChart = null; // Ensure it's nulled after destruction
            }
            currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    // --- USE THE EXPLICITLY SORTED TOP 15 DATA ---
                    labels: sortedChartData.map(c => c.name),
                    datasets: [
                        {
                            label: 'Council Votes',
                            data: sortedChartData.map(c => c.councilVotes),
                            backgroundColor: 'rgba(0, 150, 87, 0.7)', // Green
                            borderColor: 'rgba(0, 150, 87, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Executive Votes',
                            data: sortedChartData.map(c => c.executiveVotes),
                            backgroundColor: 'rgba(243, 156, 18, 0.7)', // Orange
                            borderColor: 'rgba(243, 156, 18, 1)',
                            borderWidth: 1
                        }
                    ]
                    // --- END USE OF SORTED DATA ---
                },
                options: {
                    responsive: true,              // Crucial for responsiveness
                    maintainAspectRatio: false,    // Allow height to be set by CSS/container
                    indexAxis: 'y',                // Horizontal bar chart for better mobile label display
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                // Improve legend readability on smaller screens
                                font: function(context) {
                                    const width = context.chart.width;
                                    return {
                                        size: width < 500 ? 10 : width < 800 ? 12 : 14
                                    };
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    // Adjust tooltip for horizontal chart (x-axis value)
                                    return `${context.dataset.label}: ${context.parsed.x} votes`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { // x-axis for horizontal bar chart (represents vote count)
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Votes',
                                font: function(context) {
                                    const width = context.chart.width;
                                    return {
                                        size: width < 500 ? 10 : width < 800 ? 12 : 14
                                    };
                                }
                            },
                            ticks: {
                                font: function(context) {
                                    const width = context.chart.width;
                                    return {
                                        size: width < 500 ? 8 : width < 800 ? 10 : 12
                                    };
                                }
                            }
                        },
                        y: { // y-axis for horizontal bar chart (represents candidate names)
                            title: {
                                display: true,
                                text: 'Top 15 Council Members',
                                font: function(context) {
                                    const width = context.chart.width;
                                    return {
                                        size: width < 500 ? 10 : width < 800 ? 12 : 14
                                    };
                                }
                            },
                            ticks: {
                                font: function(context) {
                                    const width = context.chart.width;
                                    return {
                                        size: width < 500 ? 8 : width < 800 ? 10 : 12
                                    };
                                },
                                // Auto-skip labels if they get too crowded, keep horizontal
                                autoSkip: false, // Try not to skip names if possible
                                maxRotation: 0,  // Keep labels horizontal
                                minRotation: 0
                            }
                            // reverse: true // Optional: Uncomment to reverse the bar order if needed
                        }
                    }
                }
            });
        }, 100);
        // --- END MODIFIED CHART CREATION ---
    } catch (err) {
        console.error('Error fetching results:', err);
        resultsContent.innerHTML = `<div class="status-error"><p>Error loading results. Please try again later.</p></div>`;
         // Destroy existing chart on error
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        // Hide the chart container on error
        const chartContainerElement = document.getElementById('chartContainer');
        if (chartContainerElement) {
            chartContainerElement.classList.add('hidden');
        }
    }
}

// --- Winner Popup ---
// Show winner info popup
function showWinnerPopup(event) {
    if (!winnerInfoPopup) {
        console.error('winnerInfoPopup element not found');
        return;
    }
    const target = event.currentTarget;
    const isWinner = target.getAttribute('data-is-winner') === 'true';
    if (!isWinner) {
        return;
    }
    const name = target.getAttribute('data-name');
    const position = target.getAttribute('data-position');
    const bio = target.getAttribute('data-bio');
    const activity = target.getAttribute('data-activity');
    // Populate popup content - Check if elements exist
    const popupNameEl = document.getElementById('popupName'); // These IDs don't exist in the HTML
    const popupPositionEl = document.getElementById('popupPosition');
    const popupBioEl = document.getElementById('popupBio');
    const popupActivityEl = document.getElementById('popupActivity');
    // Use the correct IDs from the HTML
    const winnerNameEl = document.getElementById('winnerName');
    const winnerPositionEl = document.getElementById('winnerPosition');
    const winnerBioEl = document.getElementById('winnerBio');
    const winnerActivityEl = document.getElementById('winnerActivity');

    if (winnerNameEl) winnerNameEl.textContent = name;
    if (winnerPositionEl) winnerPositionEl.textContent = position;
    if (winnerBioEl) winnerBioEl.textContent = bio;
    if (winnerActivityEl) winnerActivityEl.textContent = activity;

    // Position the popup near the cursor or the element
    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    winnerInfoPopup.style.left = `${rect.left + scrollLeft + rect.width / 2 - winnerInfoPopup.offsetWidth / 2}px`;
    winnerInfoPopup.style.top = `${rect.top + scrollTop - winnerInfoPopup.offsetHeight - 10}px`;
    // Show the popup
    winnerInfoPopup.style.display = 'block';
    // Update ARIA attributes for accessibility
    winnerInfoPopup.setAttribute('aria-hidden', 'false');
}

// Hide winner info popup (can be called by clicking outside or a close button if added)
function hideWinnerPopup() {
    if (!winnerInfoPopup) return;
    winnerInfoPopup.style.display = 'none';
    // Update ARIA attributes for accessibility
    winnerInfoPopup.setAttribute('aria-hidden', 'true');
}

// Add event listener to hide popup when clicking anywhere else
document.addEventListener('click', function(event) {
    if (winnerInfoPopup && !winnerInfoPopup.contains(event.target) && event.target.closest('.winner-name') === null) {
        hideWinnerPopup();
    }
});
// --- Voting Process Functions ---

// Google OAuth2 Authentication for Admin Tab
// Redirects the browser window to initiate Google login for potential admin access.
async function signInWithGoogleForAdmin() {
    try {
        // Show loading state on the admin-specific button
        const googleAdminBtn = document.getElementById('googleAdminSigninBtn');
        const adminAuthLoading = document.getElementById('adminAuthLoading');
        if (googleAdminBtn && adminAuthLoading) {
            googleAdminBtn.disabled = true;
            adminAuthLoading.classList.remove('hidden');
        }
        // --- CHANGE: Redirect the browser window ---
        // This avoids CORS issues and initiates the standard OAuth2 flow.
        // The backend will check if the email is in PHOENIX_ADMIN_EMAILS.
        window.location.href = '/auth/google/login';
        // --- END CHANGE ---
        // Note: Because we redirect, code after window.location.href might not run
        // depending on how quickly the redirect happens.
    } catch (err) {
        console.error('Error initiating Google admin sign-in redirect:', err);
        showMessage('An error occurred while redirecting to Google. Please try again.', 'error');
    } finally {
        // Hide loading state (this might not run if redirect is fast)
        // It's good practice, and harmless if the page unloads first.
        const googleAdminBtn = document.getElementById('googleAdminSigninBtn');
        const adminAuthLoading = document.getElementById('adminAuthLoading');
        if (googleAdminBtn && adminAuthLoading) {
            googleAdminBtn.disabled = false;
            adminAuthLoading.classList.add('hidden');
        }
    }
}

// Google OAuth2 Authentication - FIXED TO AVOID CORS
async function signInWithGoogle() {
    try {
        // --- CHANGE: Redirect the browser window instead of using fetch ---
        // This avoids the CORS issue encountered with fetch + redirect
        window.location.href = '/auth/google/login';
        // --- END CHANGE ---
    } catch (err) {
        console.error('Error initiating Google sign-in redirect:', err);
        // Provide a user-friendly message
        showMessage('An error occurred while redirecting to Google. Please try again or use Demo Mode.', 'error');
    }
    // Note: Because we redirect, code after window.location.href might not run
    // depending on how quickly the redirect happens. The loading state logic
    // below is kept for potential asynchronous pre-checks, but the redirect itself
    // will stop further JS execution on this page.
    // Show loading state *before* redirect attempt (optional, might be very brief)
    const googleSigninBtn = document.getElementById('googleSigninBtn');
    const authLoading = document.getElementById('authLoading');
    if (googleSigninBtn && authLoading) {
         googleSigninBtn.disabled = true;
         authLoading.classList.remove('hidden');
    }
    // The redirect happens above. The 'finally' block from fetch is not applicable here
    // in the same way, as the page unloads. If the redirect fails, the catch block handles it.
}

// Demo authentication (skip Google OAuth2)
async function demoAuth() {
    try {
        // Show loading state
        const demoAuthBtn = document.getElementById('demoAuthBtn');
        const authLoading = document.getElementById('authLoading');
        if (demoAuthBtn) demoAuthBtn.disabled = true;
        if (authLoading) authLoading.classList.remove('hidden');
        // Call demo authentication endpoint
        const response = await fetch('/api/auth/demo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            // Show step 3 directly
            const step1 = document.getElementById('step1');
            const step2 = document.getElementById('step2');
            const step3 = document.getElementById('step3');
            if (step1) step1.classList.add('hidden');
            if (step2) step2.classList.add('hidden');
            if (step3) step3.classList.remove('hidden');
            // Update UI with demo user info
            const confirmedUserNameEl = document.getElementById('confirmedUserName');
            if (confirmedUserNameEl) confirmedUserNameEl.textContent = currentUser.name;
            // Initialize candidates
            initCandidates();
            updateUI();
            showMessage('Demo mode: Authentication successful. You may now vote.', 'success');
        } else {
            throw new Error('Demo authentication failed');
        }
    } catch (err) {
        console.error('Demo auth error:', err);
        showMessage('Demo authentication failed. Please try again.', 'error');
    } finally {
        // Hide loading state
        const demoAuthBtn = document.getElementById('demoAuthBtn');
        const authLoading = document.getElementById('authLoading');
        if (demoAuthBtn) demoAuthBtn.disabled = false;
        if (authLoading) authLoading.classList.add('hidden');
    }
}

// Check authentication status on page load
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                currentUser = data.user;
                // Show step 3 if authenticated
                const step1 = document.getElementById('step1');
                const step2 = document.getElementById('step2');
                const step3 = document.getElementById('step3');
                if (step1) step1.classList.add('hidden');
                if (step2) step2.classList.add('hidden');
                if (step3) step3.classList.remove('hidden');
                const confirmedUserNameEl = document.getElementById('confirmedUserName');
                if (confirmedUserNameEl) confirmedUserNameEl.textContent = currentUser.name;
                initCandidates();
                updateUI();
                showMessage('Welcome back! You are authenticated.', 'success');
            }
        }
    } catch (err) {
        console.log('Not authenticated or error checking auth status');
    }
}

// Proceed to voting after authentication
function proceedToVoting() {
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const confirmedUserNameEl = document.getElementById('confirmedUserName');
    if (step2) step2.classList.add('hidden');
    if (step3) step3.classList.remove('hidden');
    if (confirmedUserNameEl) confirmedUserNameEl.textContent = currentUser.name;
    initCandidates();
    updateUI();
    showMessage('Ready to vote!', 'success');
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        // Reset to step 1
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        const step3 = document.getElementById('step3');
        if (step1) step1.classList.remove('hidden');
        if (step2) step2.classList.add('hidden');
        if (step3) step3.classList.add('hidden');
        showMessage('Logged out successfully', 'success');
    } catch (err) {
        console.error('Error logging out:', err);
        showMessage('Error logging out', 'error');
    }
}

// Handle authentication callback from Google OAuth2
function handleAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authenticated = urlParams.get('authenticated');
    if (authenticated === 'true') {
        // User was redirected back from Google OAuth2
        checkAuthStatus();
    }
}

// --- Admin Functions ---
// Admin authentication
async function authenticateAdmin() {
    const adminPasswordEl = document.getElementById('adminPassword');
    if (!adminPasswordEl) {
        showMessage('Admin password field not found', 'error');
        return;
    }
    const password = adminPasswordEl.value;
    if (!password) {
        showMessage('Please enter admin password', 'error');
        return;
    }
    // Show loading state
    const authAdminBtn = document.getElementById('authAdminBtn');
    const adminAuthLoading = document.getElementById('adminAuthLoading');
    if (authAdminBtn) authAdminBtn.disabled = true;
    if (adminAuthLoading) adminAuthLoading.classList.remove('hidden');
    try {
        const response = await ElectionAPI.authenticateAdmin(password);
        if (response.message && response.message.includes('authenticated')) {
            const adminControls = document.getElementById('adminControls');
            if (adminControls) adminControls.classList.remove('hidden');
            showMessage('Admin access granted', 'success');
        } else {
            showMessage(response.message || 'Authentication failed', 'error');
        }
    } catch (err) {
        console.error('Error authenticating admin:', err);
        showMessage('An error occurred during authentication. Please try again.', 'error');
    } finally {
        // Hide loading state
        if (authAdminBtn) authAdminBtn.disabled = false;
        if (adminAuthLoading) adminAuthLoading.classList.add('hidden');
    }
}

// Toggle election status
async function toggleElection() {
    try {
        const response = await ElectionAPI.toggleElectionStatus();
        if (response.message) {
            // Update local state
            electionOpen = response.isOpen;
            // Update UI elements
            const btn = document.getElementById('electionToggle');
            const electionClosedMessage = document.getElementById('electionClosedMessage');
            const step1 = document.getElementById('step1');
            if (electionOpen) {
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
                showMessage('Election has been opened. Voting is now allowed.', 'success');
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
                showMessage('Election has been closed. Results are now available.', 'success');
            }
            // Update results display if on results tab
            const resultsTab = document.getElementById('results');
            if (resultsTab && resultsTab.classList.contains('active')) {
                renderResults();
            }
        } else {
            showMessage(response.message || 'Failed to toggle election status', 'error');
        }
    } catch (err) {
        console.error('Error toggling election:', err);
        showMessage('An error occurred while toggling the election. Please try again.', 'error');
    }
}

// Refresh data (placeholder)
async function refreshData() {
    showMessage('Data refreshed successfully', 'success');
    // In a real app, this might re-fetch candidate or vote data
}

// Export votes (placeholder)
async function exportVotes() {
    try {
        await ElectionAPI.exportVotes();
        showMessage('Votes export initiated. Check console for data.', 'success');
        // In a real app, this would trigger a file download
    } catch (err) {
        console.error('Error exporting votes:', err);
        showMessage('An error occurred while exporting votes. Please try again.', 'error');
    }
}

// Backup to cloud (placeholder)
async function backupToCloud() {
    showMessage('Data backed up to cloud successfully', 'success');
    // In a real app, this would make an API call to a backup service
}

// Export votes to CSV
async function exportVotesToCSV() {
    // Declare variables in function scope so they are accessible in try, catch, finally
    const exportCSVBtn = document.getElementById('exportVotesToCSVBtn');
    let originalHTML = '';
    try {
        // Show loading state if desired (optional for this action)
        if (exportCSVBtn) {
            originalHTML = exportCSVBtn.innerHTML;
            exportCSVBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            exportCSVBtn.disabled = true;
        }
        const response = await ElectionAPI.exportVotesToCSV();
        if (response.ok) {
            // --- Handle the successful file download ---
            // Check if the response is actually a CSV file based on headers
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('text/csv')) {
                // Get the filename from the Content-Disposition header if available
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = 'votes_export.csv'; // Default filename
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                    if (filenameMatch && filenameMatch.length === 2) {
                        filename = filenameMatch[1];
                    }
                }
                // Convert the response body to a Blob
                const blob = await response.blob();
                // Create a temporary download link
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename; // Use the filename from the header
                // Programmatically click the link to trigger the download
                document.body.appendChild(link); // Required for Firefox
                link.click();
                // Clean up: remove the link and revoke the object URL
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                showMessage(`Votes exported successfully as ${filename}`, 'success');
            } else {
                // Response was OK, but not CSV. Might be an unexpected JSON error from backend.
                // Read the response body text ONCE.
                let responseText = '';
                try {
                    responseText = await response.text(); // Read the body as text
                } catch (readErr) {
                    console.error('Error reading response body text:', readErr);
                    throw new Error('Failed to read response body from server.');
                }
                // Try parsing the text as JSON
                let errorMessage = 'Unexpected response format from server during CSV export.';
                try {
                    const errorData = JSON.parse(responseText); // Parse the text as JSON
                    errorMessage = errorData.message || errorMessage;
                } catch (parseErr) {
                    console.warn('Could not parse unexpected response from CSV export as JSON:', parseErr);
                    // Log the actual response text for debugging
                    console.warn('Response text was:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')); // Log first 200 chars
                }
                throw new Error(errorMessage);
            }
        } else {
            // Handle cases where the response status is not OK (e.g., 404, 500)
            // The backend should ideally return JSON errors for these cases.
            let errorMessage = `Failed to export votes to CSV (Status: ${response.status}).`;
            try {
                // Try to parse error message from JSON response
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseErr) {
                // If parsing fails, maybe it's plain text or unexpected format
                console.warn('Could not parse error response (status ' + response.status + ') from CSV export:', parseErr);
                // Optionally, try to get text content if JSON parsing fails
                // const responseText = await response.text().catch(() => '');
                // if (responseText) {
                //     console.warn('Response text was:', responseText.substring(0, 200) + '...');
                // }
            }
            throw new Error(errorMessage);
        }
    } catch (err) {
        // Handle network errors or other exceptions during the fetch process
        console.error('Error exporting votes to CSV:', err);
        showMessage(`Error exporting votes to CSV: ${err.message}`, 'error');
    } finally {
        // Restore button state if loading indicator was used
        if (exportCSVBtn) {
            exportCSVBtn.disabled = false;
            exportCSVBtn.innerHTML = originalHTML;
        }
    }
}

// --- Utility Functions ---
// Show status message
function showMessage(message, type) {
    const div = document.createElement('div');
    div.className = `status-message status-${type}`;
    div.innerHTML = `<p>${message}</p>`;
    const container = document.querySelector('.tab-content.active');
    if (container) {
        container.insertBefore(div, container.firstChild);
        setTimeout(() => div.remove(), 5000);
    }
}

// UI Controller for tab switching
const UIController = {
    switchTab: (tabName) => {
        // Remove active class from all tabs and tab contents
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        // Add active class to the clicked tab and corresponding content
        const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(tabName);
        if (selectedTab) selectedTab.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');
        // Specific actions for certain tabs
        if (tabName === 'results') {
            renderResults();
        }
        // Specific actions for the admin tab
        if (tabName === 'admin') {
            // Focus the admin password input field when the admin tab is selected
            const adminPasswordInput = document.getElementById('adminPassword');
            if (adminPasswordInput) {
                // Small delay to ensure the tab is fully rendered
                setTimeout(() => {
                    adminPasswordInput.focus();
                }, 10);
            }
        }
        // Hide any active details when switching tabs
        if (activeDetails) {
            hideCandidateDetails(activeDetails);
        }
        // Hide winner popup when switching tabs
        hideWinnerPopup();
    }
};

// --- NEW FUNCTION: Fetch Candidates from Backend ---
/**
 * Fetches the list of candidates from the backend API.
 * Initializes the candidate display UI upon successful fetch.
 */
async function loadCandidates() {
    const candidateListElement = document.getElementById('candidateList');
    if (!candidateListElement) {
        console.error("Candidate list container (#candidateList) not found in the DOM.");
        return;
    }
    // Show a loading indicator while fetching data
    candidateListElement.innerHTML = '<div class="loader">Loading candidates...</div>';
    try {
        // --- FETCH DATA FROM BACKEND ---
        const response = await fetch('/api/candidates');
        if (!response.ok) {
            throw new Error(`Backend returned error ${response.status}: ${response.statusText}`);
        }
        const candidatesData = await response.json();
        if (!Array.isArray(candidatesData)) {
             throw new Error("Received candidate data is not in the expected array format.");
        }
        // --- SUCCESSFULLY LOADED ---
        candidates = candidatesData; // Assign fetched data to the global variable
        console.log("Candidates successfully loaded from backend:", candidates);
        // --- INITIALIZE UI DEPENDENT ON CANDIDATES ---
        // These functions now use the populated `candidates` array
        initCandidates();
        updateUI(); // Update counters, button states based on (initially empty) selections
        displayInfoCandidates(); // Populate the Info tab candidate list
    } catch (error) {
        // --- HANDLE ERRORS ---
        console.error("Error loading candidates from backend:", error);
        // Display a user-friendly error message in the candidate list area
        candidateListElement.innerHTML = `
            <div class="status-error">
                <p><i class="fas fa-exclamation-circle"></i> Failed to load candidate data.</p>
                <p>Details: ${error.message}</p>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

// --- NEW FUNCTION: Populate Info Tab Candidates ---
/**
 * Populates the "Meet the Candidates" section in the Info tab with expandable cards.
 */
function displayInfoCandidates() {
    const infoCandidateListElement = document.getElementById('infoCandidateList');
    if (!infoCandidateListElement) {
        console.warn("Info candidate list container (#infoCandidateList) not found.");
        return;
    }
    // Clear any existing content
    infoCandidateListElement.innerHTML = '';

    // Check if candidates data is loaded
    if (!Array.isArray(candidates) || candidates.length === 0) {
        infoCandidateListElement.innerHTML = '<p>Candidate information is not available yet.</p>';
        return;
    }

    // --- NEW: Get sorting criteria for Info Tab ---
    const sortSelect = document.getElementById('sortInfoBy');
    let sortBy = 'name-asc'; // Default
    if (sortSelect) {
        sortBy = sortSelect.value;
    }
    // --- END NEW ---

    // --- NEW: Sort candidates based on criteria ---
    const sortedCandidates = sortCandidates([...candidates], sortBy); // Create a copy to sort
    // --- END NEW ---

    // Loop through the loaded (and sorted) candidates array and create expandable HTML elements for the Info tab
    sortedCandidates.forEach(candidate => {
        const infoCard = document.createElement('div');
        infoCard.className = 'candidate-item info-candidate-item'; // Add a specific class for styling
        infoCard.dataset.id = candidate.id; // Store ID
        // Determine activity class and text
        const activityClass = candidate.activity >= 14 ? 'activity-high' :
                            candidate.activity >= 7 ? 'activity-medium' : 'activity-low';
        const activityText = candidate.activity >= 14 ? 'High Activity' :
                           candidate.activity >= 7 ? 'Medium Activity' : 'Low Activity';
        // Create the initial collapsed view HTML
        infoCard.innerHTML = `
            <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-image"
                 onerror="this.src='https://via.placeholder.com/80x80/cccccc/666666?text=${candidate.name.charAt(0)}'">
            <div class="candidate-name">${candidate.name}</div>
            <div class="candidate-position">${candidate.position}</div>
            <div class="activity-indicator ${activityClass}">${activityText}</div>
            <div class="candidate-bio-preview">
                <p>${candidate.bio.substring(0, 100)}${candidate.bio.length > 100 ? '...' : ''}</p>
                ${candidate.bio.length > 100 ? '<button class="btn btn-outline expand-info-btn" type="button">View Full Profile</button>' : ''}
            </div>
            <div class="candidate-full-profile hidden">
                 <p>${candidate.bio}</p>
                 <p><strong>Weekly Activity:</strong> ${candidate.activity} hours</p>
                 <!-- Add any other fields you want in the full profile -->
                 <button class="btn collapse-info-btn" type="button">Collapse</button>
            </div>
        `;
        // Add click listener to the card itself for expanding
        infoCard.addEventListener('click', (e) => {
             // Prevent triggering if clicking on buttons within the card
             if (e.target.closest('.expand-info-btn') || e.target.closest('.collapse-info-btn')) {
                 return;
             }
             const preview = infoCard.querySelector('.candidate-bio-preview');
             const fullProfile = infoCard.querySelector('.candidate-full-profile');
             if (preview && fullProfile) {
                 preview.classList.add('hidden');
                 fullProfile.classList.remove('hidden');
             }
        });
        // Add specific listener for the "View Full Profile" button if it exists
        const expandBtn = infoCard.querySelector('.expand-info-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the main card click
                const preview = infoCard.querySelector('.candidate-bio-preview');
                const fullProfile = infoCard.querySelector('.candidate-full-profile');
                if (preview && fullProfile) {
                    preview.classList.add('hidden');
                    fullProfile.classList.remove('hidden');
                }
            });
        }
        // Add listener for the "Collapse" button
        const collapseBtn = infoCard.querySelector('.collapse-info-btn');
        if (collapseBtn) {
             collapseBtn.addEventListener('click', (e) => {
                 e.stopPropagation(); // Prevent triggering the main card click
                 const preview = infoCard.querySelector('.candidate-bio-preview');
                 const fullProfile = infoCard.querySelector('.candidate-full-profile');
                 if (preview && fullProfile) {
                     fullProfile.classList.add('hidden');
                     preview.classList.remove('hidden');
                 }
             });
        }
        infoCandidateListElement.appendChild(infoCard);
    });
}
// --- END NEW FUNCTION: Populate Info Tab Candidates ---


// --- Language Switching Functions (Using Backend API) ---

/**
 * Fetches translations from the backend API.
 */
async function fetchTranslations() {
    try {
        const response = await fetch('/api/translations');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        translations = await response.json();
        console.log("Translations fetched from backend:", translations);
        // Apply translations after fetching
        // applyTranslations(); // Do not apply here, let the language determination logic do it
    } catch (error) {
        console.error("Failed to fetch translations from backend:", error);
        // Optionally, show a user-friendly message or fallback to hardcoded defaults
        // For now, we'll just log the error and translations will remain empty,
        // so applyTranslations won't do anything.
    }
}

/**
 * Switches the current language and updates the UI.
 * @param {string} lang - The language code (e.g., 'en', 'ar').
 */
function switchLanguage(lang) {
    // Ensure lang is a valid key in the fetched translations object
    if (lang && translations && typeof translations === 'object' && translations[lang]) {
        currentLanguage = lang;
        applyTranslations();
        // Update button text
        const langSwitcher = document.getElementById('languageSwitcher');
        if (langSwitcher) {
            // Determine the text for the *other* language
            const otherLang = currentLanguage === 'en' ? 'ar' : 'en';
            const buttonText = translations[otherLang] && translations[otherLang]['languageSwitcherText'] ?
                               translations[otherLang]['languageSwitcherText'] : otherLang; // Fallback to lang code
            langSwitcher.textContent = buttonText;
            langSwitcher.setAttribute('data-lang', currentLanguage);
        }
        // Apply RTL/LTR class to body
        document.body.classList.toggle('rtl', currentLanguage === 'ar');
        // Save preference (optional, handled in DOMContentLoaded now)
        // try {
        //     localStorage.setItem('preferredLanguage', currentLanguage);
        // } catch (e) {
        //     console.warn('Could not save language preference to localStorage:', e);
        // }
    } else {
        console.warn(`Cannot switch to language '${lang}'. It's not available in the loaded translations or translations haven't loaded yet.`);
    }
}

/**
 * Applies translations to elements with data-i18n attributes.
 */
function applyTranslations() {
    // Check if translations for currentLanguage are loaded
    if (!translations[currentLanguage]) {
         console.warn(`Translations for language '${currentLanguage}' are not loaded.`);
         return;
    }

    const elementsToTranslate = document.querySelectorAll('[data-i18n]');
    elementsToTranslate.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = translations[currentLanguage][key];
        if (translation !== undefined && translation !== null) { // Allow empty string translations
            // Check for placeholder replacement if data-i18n-params exists
            if (element.dataset.i18nParams) {
                 try {
                     const params = JSON.parse(element.dataset.i18nParams);
                     let translatedText = translation;
                     for (const [paramKey, paramValue] of Object.entries(params)) {
                         // Use global flag 'g' to replace all instances
                         translatedText = translatedText.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue);
                     }
                     element.innerHTML = translatedText;
                 } catch (e) {
                     console.error("Error parsing i18n params for key:", key, e);
                     element.textContent = translation; // Fallback to plain text
                 }
            } else {
                // Standard translation
                element.textContent = translation;
            }
        } else {
            // Only warn if the key exists in the source data-i18n attribute
            // This prevents warnings for elements that might not need translation in all languages
            // but still have the data-i18n attribute for consistency or future use.
            if (key) {
                 console.warn(`Translation key '${key}' not found for language '${currentLanguage}'`);
            }
            // Do not change the element's text if translation is missing.
            // It will retain its default text from the HTML.
        }
    });

    // Update sorting dropdown options if they exist
    updateSortingOptions();
}

/**
 * Updates the text of sorting options in the dropdowns based on current translations.
 */
function updateSortingOptions() {
    // Ensure translations for currentLanguage are loaded
    if (!translations[currentLanguage]) return;

    // Voting Tab Sorting
    const sortVoteSelect = document.getElementById('sortVoteBy');
    if (sortVoteSelect) {
        const voteOptions = sortVoteSelect.querySelectorAll('option');
        voteOptions.forEach(option => {
            const value = option.value;
            let key;
            switch (value) {
                case 'name-asc': key = 'sortByNameAsc'; break;
                case 'name-desc': key = 'sortByNameDesc'; break;
                case 'activity-desc': key = 'sortByActivityDesc'; break;
                case 'activity-asc': key = 'sortByActivityAsc'; break;
                default: return; // Skip if no matching key
            }
            if (translations[currentLanguage][key] !== undefined) {
                option.textContent = translations[currentLanguage][key];
            }
        });
    }

    // Info Tab Sorting
    const sortInfoSelect = document.getElementById('sortInfoBy');
    if (sortInfoSelect) {
        const infoOptions = sortInfoSelect.querySelectorAll('option');
        infoOptions.forEach(option => {
            const value = option.value;
            let key;
            switch (value) {
                case 'name-asc': key = 'sortByNameAsc'; break;
                case 'name-desc': key = 'sortByNameDesc'; break;
                case 'activity-desc': key = 'sortByActivityDesc'; break;
                case 'activity-asc': key = 'sortByActivityAsc'; break;
                default: return; // Skip if no matching key
            }
            if (translations[currentLanguage][key] !== undefined) {
                option.textContent = translations[currentLanguage][key];
            }
        });
    }
}

// --- END Language Switching Functions ---


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Phoenix Council Elections frontend initialized');

    // --- NEW: Language Switching Initialization ---
    // 1. Fetch translations from the backend
    await fetchTranslations(); // Wait for translations to load

    // 2. Determine initial language priority: localStorage -> Backend IP Detection -> Default
    let determinedLanguage = 'en'; // Start with default
    try {
        // Option A: Check localStorage first (user's last manual choice or previously saved)
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang && translations[savedLang]) {
            console.log(`Using language from localStorage: ${savedLang}`);
            determinedLanguage = savedLang;
        } else {
            // Option B: Fetch language determined by backend (IP-based)
            console.log("Fetching language from backend API (/api/language)...");
            const langResponse = await fetch('/api/language');
            if (langResponse.ok) {
                const langData = await langResponse.json();
                const backendLang = langData.language;
                if (backendLang && translations[backendLang]) {
                    console.log(`Using language determined by backend: ${backendLang}`);
                    determinedLanguage = backendLang;
                    // Optionally, save the backend-determined language to localStorage
                    // so it persists on subsequent visits if the user hasn't manually switched.
                    // This makes the IP detection influential only on the first visit
                    // (unless localStorage is cleared). Remove the try/catch if not needed.
                    try {
                        localStorage.setItem('preferredLanguage', determinedLanguage);
                        console.log(`Saved backend-determined language (${determinedLanguage}) to localStorage.`);
                    } catch (e) {
                        console.warn('Could not save backend-determined language to localStorage:', e);
                    }
                } else {
                    console.log(`Backend returned invalid or unsupported language: ${backendLang}. Using default.`);
                }
            } else {
                console.log(`Failed to fetch language from backend (Status: ${langResponse.status}). Using default or saved.`);
            }
        }
    } catch (e) {
        console.warn('Error determining initial language preference:', e, 'Using default.');
        // determinedLanguage remains 'en'
    }

    // 3. Set the current language state and apply it
    currentLanguage = determinedLanguage;
    console.log(`Initial language set to: ${currentLanguage}`);

    // 4. Apply initial translation and set up the switcher button
    const langSwitcher = document.getElementById('languageSwitcher');
    if (langSwitcher) {
        // Apply the determined initial language (sets text, RTL, translates elements)
        switchLanguage(currentLanguage);

        // Add click listener for manual switching
        langSwitcher.addEventListener('click', () => {
            // Determine the *other* language available
            const otherLang = currentLanguage === 'en' ? 'ar' : 'en';
            // Switch to the other language
            // switchLanguage handles checking if translations exist
            switchLanguage(otherLang);
            // Save the *manually chosen* language to localStorage
            // This makes the user's choice persistent, overriding IP detection on future visits.
            try {
                localStorage.setItem('preferredLanguage', otherLang);
                console.log(`Saved manually chosen language (${otherLang}) to localStorage.`);
            } catch (e) {
                console.warn('Could not save manually chosen language to localStorage:', e);
            }
        });
    } else {
        console.warn("Language switcher button (#languageSwitcher) not found in the DOM.");
    }
    // --- END NEW: Language Switching Initialization ---


    // Initialize DOM elements first
    initDOMElements();
    // Load candidates and check authentication
    loadCandidates(); // Initiates the fetch of candidate data
    checkAuthStatus(); // Check for existing authentication
    // Check for authentication callback
    handleAuthCallback();
    // Initial UI setup
    // Fetch initial election status
    try {
        const statusResponse = await ElectionAPI.getElectionStatus();
        electionOpen = statusResponse.is_open;
        // Update election status display
        if (!electionOpen && electionStatus) {
            electionStatus.innerHTML = '<i class="fas fa-lock-open"></i> Election is closed';
            electionStatus.classList.add('closed');
            const electionClosedMessage = document.getElementById('electionClosedMessage');
            const step1 = document.getElementById('step1');
            if (electionClosedMessage) electionClosedMessage.classList.remove('hidden');
            if (step1) step1.classList.add('disabled');
        }
    } catch (err) {
        console.error('Error fetching initial election status:', err);
    }
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            UIController.switchTab(tab.dataset.tab);
        });
    });
    // Admin button (top right corner)
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            UIController.switchTab('admin');
        });
    }
    // Authentication buttons
    const googleSigninBtn = document.getElementById('googleSigninBtn');
    const demoAuthBtn = document.getElementById('demoAuthBtn');
    const proceedToVoteBtn = document.getElementById('proceedToVoteBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const submitVoteBtn = document.getElementById('submitVoteBtn');
    if (googleSigninBtn) googleSigninBtn.addEventListener('click', signInWithGoogle);
    if (demoAuthBtn) demoAuthBtn.addEventListener('click', demoAuth);
    if (proceedToVoteBtn) proceedToVoteBtn.addEventListener('click', proceedToVoting);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (submitVoteBtn) submitVoteBtn.addEventListener('click', submitVote);
    // Admin buttons
    const authAdminBtn = document.getElementById('authAdminBtn');
    const googleAdminSigninBtn = document.getElementById('googleAdminSigninBtn');
    const electionToggle = document.getElementById('electionToggle');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    const exportVotesBtn = document.getElementById('exportVotesBtn');
    const exportVotesToCSVBtn = document.getElementById('exportVotesToCSVBtn');
    const backupToCloudBtn = document.getElementById('backupToCloudBtn');
    if (authAdminBtn) authAdminBtn.addEventListener('click', authenticateAdmin);
    if (googleAdminSigninBtn) googleAdminSigninBtn.addEventListener('click', signInWithGoogleForAdmin);
    if (electionToggle) electionToggle.addEventListener('click', toggleElection);
    if (refreshDataBtn) refreshDataBtn.addEventListener('click', refreshData);
    if (exportVotesBtn) exportVotesBtn.addEventListener('click', exportVotes);
    if (exportVotesToCSVBtn) exportVotesToCSVBtn.addEventListener('click', exportVotesToCSV);
    if (backupToCloudBtn) backupToCloudBtn.addEventListener('click', backupToCloud);
    // Allow pressing Enter in the admin password field to trigger authentication
    const adminPasswordInput = document.getElementById('adminPassword');
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                authenticateAdmin();
            }
        });
    }

    // --- NEW: Add Event Listeners for Sorting Dropdowns ---
    const sortVoteSelect = document.getElementById('sortVoteBy');
    if (sortVoteSelect) {
        sortVoteSelect.addEventListener('change', function() {
             // Re-render the voting candidates based on the new sort order
             initCandidates(); // This will now read the new value from the select
        });
    }

    const sortInfoSelect = document.getElementById('sortInfoBy');
    if (sortInfoSelect) {
        sortInfoSelect.addEventListener('change', function() {
            // Re-render the info candidates based on the new sort order
            displayInfoCandidates(); // This will now read the new value from the select
        });
    }
    // --- END NEW: Sorting Event Listeners ---

    // Initialize the application for the vote tab
    updateUI(); // Initial UI update
    // Add click outside listener for candidate details
    document.addEventListener('click', (e) => {
        if (activeDetails && !e.target.closest('.candidate-item')) {
            hideCandidateDetails(activeDetails);
        }
    });
});
// --- END Event Listeners ---

