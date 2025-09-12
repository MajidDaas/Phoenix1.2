// utils.js - Small, reusable utility functions (i18n-ready + popup notifications)

const Utils = {
    // --- Show Message in Popup Notification ---
    showMessage: function(messageKey, type = 'info') {
        // Accept translation key OR raw HTML string
        let messageContent = messageKey;

        // If it looks like a translation key (no HTML tags), try to translate it
        if (typeof messageKey === 'string' && !messageKey.includes('<') && translations && translations[currentLanguage]) {
            const translated = translations[currentLanguage][messageKey];
            if (translated !== undefined) {
                messageContent = translated;
            }
        }

        // Create or get notification popup
        let popup = document.getElementById('globalNotificationPopup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'globalNotificationPopup';
            popup.className = 'notification-popup';
            document.body.appendChild(popup);
        }

        // Set content
        popup.innerHTML = messageContent;

        // Set style based on type
        popup.className = 'notification-popup notification-' + type;

        // Show popup with animation
        popup.classList.add('show');

        // Auto-hide after 3 seconds
        clearTimeout(popup._hideTimer);
        popup._hideTimer = setTimeout(() => {
            popup.classList.remove('show');
        }, 3000);
    },

    // --- Show Validation Popup (centered, auto-hiding) ---
    showValidationPopup: function(messageKey) {
        // Accept translation key OR raw string
        let messageContent = messageKey;

        if (typeof messageKey === 'string' && !messageKey.includes('<') && translations && translations[currentLanguage]) {
            const translated = translations[currentLanguage][messageKey];
            if (translated !== undefined) {
                messageContent = translated;
            }
        }

        const popup = document.getElementById('validationPopup');
        const messageEl = document.getElementById('validationMessage');
        if (popup && messageEl) {
            messageEl.innerHTML = messageContent;
            popup.classList.remove('hidden');

            setTimeout(() => {
                popup.classList.add('hidden');
            }, 2000);
        } else {
            console.warn('Validation popup elements not found. Fallback to global notification.');
            this.showMessage(messageKey, 'error');
        }
    },

    // --- Sort Candidates Utility ---
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
