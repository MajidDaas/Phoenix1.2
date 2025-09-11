// i18n.js - Internationalization and language switching logic

const I18nModule = {
    // --- Fetch Translations ---
    fetchTranslations: async function() {
        try {
            const response = await fetch('/api/translations');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            translations = await response.json(); // `translations` is global in core.js
            console.log("Translations fetched from backend:", translations);
        } catch (error) {
            console.error("Failed to fetch translations from backend:", error);
        }
    },

// --- Switch Language ---
switchLanguage: function(lang) {
    if (lang && translations && typeof translations === 'object' && translations[lang]) {
        currentLanguage = lang; // `currentLanguage` is global in core.js
        this.applyTranslations();

        const langSwitcher = document.getElementById('languageSwitcher');
        if (langSwitcher) {
            // Set the button text to "English" if current is Arabic, and "عربي" if current is English.
            const buttonText = currentLanguage === 'en' ? 'عربي' : 'English';
            // OR, if you prefer to use the translation keys for consistency:
            // const buttonText = currentLanguage === 'en' ? (translations['ar']['switchToArabic'] || 'عربي') : (translations['en']['switchToEnglish'] || 'English');

            langSwitcher.textContent = buttonText;
            langSwitcher.setAttribute('data-lang', currentLanguage);
        }

        document.body.classList.toggle('rtl', currentLanguage === 'ar');
    } else {
        console.warn(`Cannot switch to language '${lang}'. It's not available in the loaded translations.`);
    }
},

    // --- Apply Translations ---
    applyTranslations: function() {
        if (!translations[currentLanguage]) {
             console.warn(`Translations for language '${currentLanguage}' are not loaded.`);
             return;
        }
        const elementsToTranslate = document.querySelectorAll('[data-i18n]');
        elementsToTranslate.forEach(element => {
            const fullKey = element.getAttribute('data-i18n');
            const parts = fullKey.split('|');
            const key = parts[0];
            const attr = parts[1] || 'textContent'; // ✅ Default to textContent if no attribute specified

            const translation = translations[currentLanguage][key];
            if (translation !== undefined && translation !== null) {
                if (element.dataset.i18nParams) {
                     try {
                         const params = JSON.parse(element.dataset.i18nParams);
                         let translatedText = translation;
                         for (const [paramKey, paramValue] of Object.entries(params)) {
                             translatedText = translatedText.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue);
                         }
                         // ✅ Apply to correct target
                         if (attr === 'textContent') {
                             element.textContent = translatedText;
                         } else {
                             element.setAttribute(attr, translatedText);
                         }
                     } catch (e) {
                         console.error("Error parsing i18n params for key:", key, e);
                         // ✅ Fallback: apply to correct target
                         if (attr === 'textContent') {
                             element.textContent = translation;
                         } else {
                             element.setAttribute(attr, translation);
                         }
                     }
                } else {
                    // ✅ Apply to correct target — THIS IS THE ONLY CHANGE
                    if (attr === 'textContent') {
                        element.textContent = translation;
                    } else {
                        element.setAttribute(attr, translation);
                    }
                }
            } else {
                if (key) {
                     console.warn(`Translation key '${key}' not found for language '${currentLanguage}'`);
                }
            }
        });
        this.updateSortingOptions();
    },

    // --- Update Sorting Options ---
    updateSortingOptions: function() {
        if (!translations[currentLanguage]) return;

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
                    default: return;
                }
                if (translations[currentLanguage][key] !== undefined) {
                    option.textContent = translations[currentLanguage][key];
                }
            });
        }

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
                    default: return;
                }
                if (translations[currentLanguage][key] !== undefined) {
                    option.textContent = translations[currentLanguage][key];
                }
            });
        }
    }
};
