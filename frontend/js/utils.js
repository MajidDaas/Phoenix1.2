// utils.js - Small, reusable utility functions

const Utils = {
    // --- Show Status Message (persistent in tab) ---
    showMessage: function(message, type) {
        const div = document.createElement('div');
        div.className = `status-message status-${type}`;
        div.innerHTML = `<p>${message}</p>`;
        const container = document.querySelector('.tab-content.active');
        if (container) {
            container.insertBefore(div, container.firstChild);
            setTimeout(() => {
                if (div && div.parentNode) {
                    div.remove();
                }
            }, 5000);
        }
    },

    // --- Show Validation Popup (centered, auto-hiding) ---
    showValidationPopup: function(message) {
        const popup = document.getElementById('validationPopup');
        const messageEl = document.getElementById('validationMessage');
        
        if (popup && messageEl) {
            // Set message
            messageEl.textContent = message;
            
            // Show popup
            popup.classList.remove('hidden');
            
            // Auto-hide after 2 seconds
            setTimeout(() => {
                popup.classList.add('hidden');
            }, 2000);
        } else {
            console.warn('Validation popup elements not found. Ensure #validationPopup and #validationMessage exist in HTML.');
            // Fallback: show as regular message
            this.showMessage(message, 'error');
        }
    },

    // --- Sort Candidates Utility ---
    /**
     * Sorts an array of candidate objects based on the given criteria.
     * @param {Array} candidatesArray - The array of candidate objects to sort.
     * @param {string} criteria - The sorting criteria ('name-asc', 'name-desc', 'activity-asc', 'activity-desc').
     * @returns {Array} - The sorted array.
     */
    sortCandidates: function(candidatesArray, criteria) {
        return candidatesArray.sort((a, b) => {
            switch (criteria) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'activity-desc':
                    if (b.activity !== a.activity) {
                        return b.activity - a.activity;
                    }
                    return a.name.localeCompare(b.name);
                case 'activity-asc':
                    if (a.activity !== b.activity) {
                        return a.activity - b.activity;
                    }
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
    }
};
