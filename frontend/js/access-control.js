// access-control.js - Enforce visibility based on registration / vote status
// Updated to ensure the "Cast Vote" tab is always present (not hidden) and to
// force the UI to switch to the vote tab when showing the "not registered",
// "thank you" or "election closed" cards so the user sees the expected content.
//
// The previous behavior hid the voting interface but in some flows the tab
// button itself could end up hidden or another tab stayed active. This file
// now explicitly controls tab visibility and active tab state.

(async function () {
  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Failed to fetch session:', err);
      return null;
    }
  }

  async function fetchElectionStatus() {
    try {
      const res = await fetch('/api/election/status', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Failed to fetch election status:', err);
      return null;
    }
  }

  async function fetchCandidates() {
    try {
      const res = await fetch('/api/candidates', { credentials: 'include' });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('Failed to fetch candidates:', err);
      return [];
    }
  }

  function showElement(el) {
    if (!el) return;
    el.classList.remove('hidden');
  }
  function hideElement(el) {
    if (!el) return;
    el.classList.add('hidden');
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('Logout failed:', err);
    } finally {
      // reload to show auth screen
      window.location.href = '/';
    }
  }

  // Attach logout handlers to all logout buttons
  function wireLogoutButtons() {
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    });
  }

  // Tab helper: ensure tab button exists/visible and switch active class
  function ensureTabVisible(tabName) {
    const tabBtn = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (!tabBtn) return null;
    tabBtn.style.display = 'inline-flex';
    tabBtn.classList.remove('disabled');
    return tabBtn;
  }
  function setActiveTab(tabName) {
    // Remove active from all tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    // Set active to requested tab
    const target = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (target) {
      target.classList.add('active');
      // Trigger any existing switch/tab handlers if present (UIController.switchTab)
      if (window.UIController && typeof window.UIController.switchTab === 'function') {
        try { window.UIController.switchTab(tabName); } catch(e){ /* ignore */ }
      }
    }
  }

  // Run main logic
  function showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    if (authScreen) authScreen.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
  }

  function showMainApp() {
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    if (authScreen) authScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
  }

  // Update UI according to session + election status
  async function applyAccessControl() {
    wireLogoutButtons();

    const session = await fetchSession();
    if (!session || !session.authenticated) {
      // Not authenticated: show auth screen (existing behavior)
      showAuthScreen();
      return;
    }

    // Authenticated - check eligibility
    const user = session.user || {};
    const isEligible = !!user.isEligibleVoter;
    const hasVoted = !!user.hasVoted;
    const isAdmin = !!user.isAdmin;

    // Show main app
    showMainApp();

    // Ensure vote tab is always visible (per design we keep the tab present)
    ensureTabVisible('vote');

    // Admin button in header
    const topAdminBtn = document.getElementById('adminBtn');
    if (topAdminBtn) {
      topAdminBtn.style.display = isAdmin ? 'flex' : 'none';
    }

    // Update admin tab visibility
    const adminTabButton = document.querySelector('.tab[data-tab="admin"]');
    if (adminTabButton) {
      adminTabButton.style.display = isAdmin ? 'inline-flex' : 'none';
    }

    // Update admin UI module if available
    if (window.AdminModule && typeof window.AdminModule.updateAdminUIForLoggedInUser === 'function') {
      window.AdminModule.updateAdminUIForLoggedInUser(user);
    }

    // Get election status and candidates
    const [electionStatus, candidates] = await Promise.all([fetchElectionStatus(), fetchCandidates()]);
    const isOpen = electionStatus && electionStatus.is_open;

    // Save candidate list to global state for other modules
    window.State = window.State || {};
    window.State.candidates = candidates;

    // Update election status UI
    const electionStatusEl = document.getElementById('electionStatus');
    const statusBadge = document.getElementById('statusBadge');
    if (electionStatusEl) {
      if (isOpen) {
        electionStatusEl.innerHTML = '<i class="fas fa-lock-open"></i> Election is currently open';
        electionStatusEl.classList.remove('closed');
        electionStatusEl.classList.add('open');
      } else {
        electionStatusEl.innerHTML = '<i class="fas fa-lock"></i> Election is closed';
        electionStatusEl.classList.remove('open');
        electionStatusEl.classList.add('closed');
      }
    }
    if (statusBadge) {
      statusBadge.textContent = isOpen ? 'Open' : 'Closed';
      statusBadge.className = isOpen ? 'badge badge-open' : 'badge badge-closed';
    }

    // Determine what to show in the voting tab
    const notRegisteredCard = document.getElementById('notRegisteredCard');
    const votingInterface = document.getElementById('votingInterface');
    const thankYouMessage = document.getElementById('thankYouMessage');
    const electionClosedMessage = document.getElementById('electionClosedMessage');

    // ALWAYS keep the "vote" tab present. Control only the tab CONTENT.
    if (!isEligible) {
      // Show not-registered card, hide voting interface
      showElement(notRegisteredCard);
      hideElement(votingInterface);
      hideElement(thankYouMessage);
      hideElement(electionClosedMessage);

      // Ensure cast vote tab is active so user sees the "not registered" card
      setActiveTab('vote');
    } else {
      // Registered voter - hide not-registered card
      hideElement(notRegisteredCard);

      if (hasVoted) {
        // Show thank you card in the vote tab
        showElement(thankYouMessage);
        hideElement(votingInterface);
        hideElement(electionClosedMessage);
        setActiveTab('vote');
      } else if (!isOpen) {
        // Registered but election closed
        showElement(electionClosedMessage);
        hideElement(votingInterface);
        hideElement(thankYouMessage);
        setActiveTab('vote');
      } else {
        // Registered, election open, not voted -> show actual voting interface
        showElement(votingInterface);
        hideElement(thankYouMessage);
        hideElement(electionClosedMessage);
        setActiveTab('vote');
      }
    }

    // Render results (results.js handles its own loading)
    if (window.ResultsModule && typeof window.ResultsModule.renderResults === 'function') {
      window.ResultsModule.renderResults();
    }
  }

  // Kick off
  document.addEventListener('DOMContentLoaded', applyAccessControl);
})();
