// core-init.js - Global state and shared utilities

// --- Global State ---
let selectedCandidates = [];
let executiveCandidates = [];
const maxSelections = 15;
const maxExecutives = 7;
let activeDetails = null;
let electionOpen = true;
let currentChart = null;
const totalVoters = 20;
let currentUser = null;
let candidates = [];

// --- Language State ---
let translations = {};
let currentLanguage = 'en';

// --- DOM Elements ---
let candidateList = null;
let selectedCount = null;
let submitVoteBtn = null;
let electionStatus = null;
let resultsContent = null;
let winnerInfoPopup = null;

// --- Initialize DOM Elements ---
function initDOMElements() {
    candidateList = document.getElementById('candidateList');
    selectedCount = document.getElementById('selectedCount');
    submitVoteBtn = document.getElementById('submitVoteBtn');
    electionStatus = document.getElementById('electionStatus');
    resultsContent = document.getElementById('resultsContent');
    winnerInfoPopup = document.getElementById('winnerInfoPopup');
}

// --- Utility Functions ---
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

// --- Expose to window ---
window.State = {
    get selectedCandidates() { return selectedCandidates; },
    set selectedCandidates(val) { selectedCandidates = val; },
    get executiveCandidates() { return executiveCandidates; },
    set executiveCandidates(val) { executiveCandidates = val; },
    get electionOpen() { return electionOpen; },
    set electionOpen(val) { electionOpen = val; },
    get currentUser() { return currentUser; },
    set currentUser(val) { currentUser = val; },
    get candidates() { return candidates; },
    set candidates(val) { candidates = val; },
    get currentLanguage() { return currentLanguage; }
};

// Also expose utility if needed
window.Utils = {
    showMessage
};
