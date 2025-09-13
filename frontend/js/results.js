// results.js - Results fetching, rendering, and winner popup logic (modernized & mobile-friendly)
const ResultsModule = {
    currentChart: null,
    // --- Render Results ---
    renderResults: async function () {
        const resultsContent = document.getElementById('resultsContent');
        if (!resultsContent) {
            console.error('resultsContent element not found');
            return;
        }
        try {
            // Fetch results and public candidate info
            const [resultsRes, candidatesRes] = await Promise.all([
                fetch('/api/results', { credentials: 'include' }),
                fetch('/api/candidates', { credentials: 'include' })
            ]);
            if (!resultsRes.ok) {
                throw new Error('Failed to fetch results from server');
            }
            const resultsData = await resultsRes.json();
            const candidatesList = candidatesRes.ok ? await candidatesRes.json() : [];
            const totalCandidatesEl = document.getElementById('totalVotersStat');
            const voterTurnoutEl = document.getElementById('turnoutRateStat');
            const totalVotesEl = document.getElementById('votesCastStat');
            // totalCandidates: use candidate list length
            const totalCandidates = candidatesList.length || (resultsData.results ? resultsData.results.length : 0);
            const totalVotes = resultsData.totalVotes || 0;
            if (totalCandidatesEl) totalCandidatesEl.textContent = totalCandidates;
            // --- Conditional Display Logic ---
            const isOpen = !!resultsData.isOpen;
            if (voterTurnoutEl) {
                if (isOpen) {
                    voterTurnoutEl.innerHTML = '<span data-i18n="electionStatus">Elections are open</span>';
                    voterTurnoutEl.title = 'Turnout data is hidden while voting is active.';
                    // Apply translation
                    if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                        I18nModule.applyTranslations();
                    }
                } else {
                    // Voter turnout: per spec, number of voters equals number of candidates for turnout calculation
                    const turnoutPercent = totalCandidates > 0 ? Math.round((totalVotes / totalCandidates) * 100) : 0;
                    voterTurnoutEl.textContent = `${turnoutPercent}%`;
                    voterTurnoutEl.title = ''; // Clear title if election is closed
                }
            }
            if (totalVotesEl) {
                if (isOpen) {
                    totalVotesEl.innerHTML = '<span data-i18n="electionStatus">Elections are open</span>';
                    totalVotesEl.title = 'Vote count is hidden while voting is active.';
                    // Apply translation
                    if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                        I18nModule.applyTranslations();
                    }
                } else {
                    totalVotesEl.textContent = totalVotes.toLocaleString();
                    totalVotesEl.title = ''; // Clear title if election is closed
                }
            }
            // --- End Conditional Display Logic ---
            if (isOpen) {
                // When election is open, show friendly message and hide chart
                resultsContent.innerHTML = `
                    <div class="status-info modern-info">
                        <p><i class="fas fa-info-circle"></i> <span data-i18n="electionResultsPending">Voting is in progress. Partial results will be available after the election closes.</span></p>
                    </div>
                `;
                // Apply translation
                if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                    I18nModule.applyTranslations();
                }
                if (this.currentChart) {
                    this.currentChart.destroy();
                    this.currentChart = null;
                }
                const chartContainerElement = document.getElementById('chartContainer');
                if (chartContainerElement) {
                    chartContainerElement.classList.add('hidden');
                }
                return;
            }
            // Election closed: render full leaderboard
            const fullResultsArray = resultsData.results || [];
            // Enrich results with candidate meta if available (Use 'photo' instead of 'avatar')
            const enriched = fullResultsArray.map(r => {
                const meta = candidatesList.find(c => c.id === r.id) || {};
                return Object.assign({}, r, {
                    bio: meta.bio || '',
                    position: meta.position || '',
                    activity: meta.activity || '',
                    photo: meta.photo || '' // Use 'photo'
                });
            });
            // Sort by council votes descending then exec votes
            enriched.sort((a, b) => {
                if (b.councilVotes !== a.councilVotes) return b.councilVotes - a.councilVotes;
                return b.executiveVotes - a.executiveVotes;
            });
            const top15 = enriched.slice(0, 15);
            // Determine executive officers: top 7 by executiveVotes among the top15
            const sortedByExec = [...top15].sort((a, b) => b.executiveVotes - a.executiveVotes);
            const execNames = sortedByExec.slice(0, 7).map(x => x.name);
            // Build modern leaderboard HTML
            let resultsHTML = `<div class="leaderboard">`;
            top15.forEach((candidate, idx) => {
                const isExecutive = execNames.includes(candidate.name);
                const rank = idx + 1;
                // Determine rank medal/label
                let rankDisplay = `#${rank}`;
                if (rank === 1) rankDisplay = `<i class="fas fa-medal gold-medal"></i>`;
                else if (rank === 2) rankDisplay = `<i class="fas fa-medal silver-medal"></i>`;
                else if (rank === 3) rankDisplay = `<i class="fas fa-medal bronze-medal"></i>`;
                // progress widths relative to top performer
                const maxCouncil = top15[0] ? Math.max(1, top15[0].councilVotes) : 1;
                const maxExec = sortedByExec[0] ? Math.max(1, sortedByExec[0].executiveVotes) : 1;
                const councilPct = Math.min(100, Math.round((candidate.councilVotes / maxCouncil) * 100));
                const execPct = Math.min(100, Math.round((candidate.executiveVotes / maxExec) * 100));
                // Use 'photo' in the image source
                resultsHTML += `
                    <div class="leader-item ${isExecutive ? 'executive' : ''}" data-name="${candidate.name}"
                         data-position="${candidate.position || ''}" data-bio="${candidate.bio || ''}"
                         data-activity="${candidate.activity || ''}" data-is-winner="${rank <= 15 ? 'true' : 'false'}"
                         onclick="ResultsModule.showWinnerPopup(event)">
                        <div class="leader-avatar">
                            ${candidate.photo ? `<img src="${candidate.photo}" alt="${candidate.name}">` : `<div class="avatar-placeholder"><i class="fas fa-user"></i></div>`}
                        </div>
                        <div class="leader-content">
                            <div class="leader-meta">
                                <div class="leader-name">${candidate.name}${isExecutive ? ' <span class="exec-badge" data-i18n="[title]results.executiveOfficer" title="Executive Officer"><i class="fas fa-star"></i></span>' : ''}</div>
                                <div class="leader-position">${candidate.position || '<span data-i18n="results.councilMember">Council Member</span>'}</div>
                            </div>
                            <div class="leader-stats">
                                <div class="stat-row">
                                    <div class="stat-label"><i class="fas fa-users"></i> <span data-i18n="results.council">Council</span></div>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar">
                                            <div class="stat-fill" style="width:${councilPct}%"></div>
                                        </div>
                                    </div>
                                    <div class="stat-value">${candidate.councilVotes.toLocaleString()}</div>
                                </div>
                                <div class="stat-row">
                                    <div class="stat-label"><i class="fas fa-star"></i> <span data-i18n="results.executive">Executive</span></div>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar small">
                                            <div class="stat-fill exec" style="width:${execPct}%"></div>
                                        </div>
                                    </div>
                                    <div class="stat-value">${candidate.executiveVotes.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            resultsHTML += `</div>`;
            resultsContent.innerHTML = resultsHTML;
            // Show chart container and render mobile-friendly chart
            const chartContainerElement = document.getElementById('chartContainer');
            if (chartContainerElement) chartContainerElement.classList.remove('hidden');
            // Choose chart orientation based on viewport width
            const mobile = window.innerWidth <= 700;
            const indexAxis = mobile ? 'x' : 'y'; // vertical bars on phone, horizontal on bigger screens
            // Prepare data for chart - show top15 names and both council & exec votes
            const chartLabels = top15.map(c => c.name);
            const councilData = top15.map(c => c.councilVotes);
            const execData = top15.map(c => c.executiveVotes);
            // Destroy previous chart if present
            if (this.currentChart) {
                this.currentChart.destroy();
                this.currentChart = null;
            }
            // Create chart with responsive options
            const chartCanvas = document.getElementById('resultsChart');
            if (!chartCanvas) {
                console.error('resultsChart canvas element not found');
                return;
            }
            const ctx = chartCanvas.getContext('2d');
            // Use friendly colors
            const councilColor = 'rgba(0, 150, 87, 0.9)';
            const execColor = 'rgba(243, 156, 18, 0.9)';
            this.currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                     datasets: [
                        {
                            label: '<span data-i18n="results.chart.council">Council</span>',
                            data: councilData,
                            backgroundColor: councilColor,
                            borderColor: councilColor,
                            borderRadius: 6,
                            barPercentage: mobile ? 0.8 : 0.9,
                        },
                        {
                            label: '<span data-i18n="results.chart.executive">Executive</span>',
                            data: execData,
                            backgroundColor: execColor,
                            borderColor: execColor,
                            borderRadius: 6,
                            barPercentage: mobile ? 0.6 : 0.9,
                        }
                    ]
                },
                options: {
                    indexAxis: indexAxis,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                usePointStyle: true,
                                // Note: Chart.js doesn't natively support data-i18n in legend labels.
                                // You would need a custom plugin or to set the label text after translation.
                                // For now, we leave it as-is, assuming the initial label text is sufficient.
                                // If you need dynamic translation, you can update the chart after applying translations.
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    // Use translated text for tooltips if possible
                                    const labelKey = context.datasetIndex === 0 ? 'results.chart.council' : 'results.chart.executive';
                                    // This is a limitation: tooltips are generated dynamically and won't have data-i18n.
                                    // A better approach would be to store translated labels in a global object after I18nModule.applyTranslations.
                                    // For simplicity, we use the key as a fallback.
                                    const translatedLabel = translations && translations[currentLanguage] && translations[currentLanguage][labelKey]
                                        ? translations[currentLanguage][labelKey]
                                        : context.dataset.label;
                                    return `${translatedLabel}: ${context.parsed.y !== undefined ? context.parsed.y : context.parsed.x} <span data-i18n="results.chart.votes">votes</span>`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                maxTicksLimit: mobile ? 5 : 10,
                                callback: function (value) {
                                    return value.toLocaleString();
                                }
                            }
                        },
                        y: {
                            ticks: {
                                autoSkip: false,
                                callback: function (value) {
                                    return value;
                                }
                            }
                        }
                    }
                }
            });

            // --- Apply translations to the newly rendered results content ---
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }

        } catch (err) {
            console.error('Error fetching results:', err);
            resultsContent.innerHTML = `
                <div class="status-error">
                    <p><span data-i18n="results.load.error">Error loading results. Please try again later.</span></p>
                </div>
            `;
            // Apply translation
            if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
                I18nModule.applyTranslations();
            }
            if (this.currentChart) {
                this.currentChart.destroy();
                this.currentChart = null;
            }
            const chartContainerElement = document.getElementById('chartContainer');
            if (chartContainerElement) {
                chartContainerElement.classList.add('hidden');
            }
        }
    },
    // --- Winner Popup ---
    showWinnerPopup: function (event) {
        const winnerInfoPopup = document.getElementById('winnerInfoPopup');
        if (!winnerInfoPopup) {
            console.error('winnerInfoPopup element not found');
            return;
        }
        // normalize target (might be child element)
        let target = event.currentTarget || event.target;
        // climb up until leader-item
        while (target && !target.classList.contains('leader-item')) {
            target = target.parentElement;
        }
        if (!target) return;
        const isWinner = target.getAttribute('data-is-winner') === 'true';
        // Only show popup for top winners (we mark top15 as winners per earlier logic)
        if (!isWinner) return;
        const name = target.getAttribute('data-name') || 'Unknown';
        const position = target.getAttribute('data-position') || '<span data-i18n="results.councilMember">Council Member</span>';
        const bio = target.getAttribute('data-bio') || '<span data-i18n="candidates.bio.unavailable">No bio available</span>';
        const activity = target.getAttribute('data-activity') || '';
        const winnerNameEl = document.getElementById('winnerName');
        const winnerPositionEl = document.getElementById('winnerPosition');
        const winnerBioEl = document.getElementById('winnerBio');
        const winnerActivityEl = document.getElementById('winnerActivity');
        if (winnerNameEl) winnerNameEl.textContent = name;
        if (winnerPositionEl) winnerPositionEl.innerHTML = position;
        if (winnerBioEl) winnerBioEl.innerHTML = bio;
        if (winnerActivityEl) winnerActivityEl.textContent = activity;
        // position popup near clicked item
        const rect = target.getBoundingClientRect();
        const popup = winnerInfoPopup;
        // center horizontally
        const left = Math.max(12, rect.left + window.pageXOffset + rect.width / 2 - popup.offsetWidth / 2);
        const top = Math.max(12, rect.top + window.pageYOffset - popup.offsetHeight - 10);
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        popup.style.display = 'block';
        popup.setAttribute('aria-hidden', 'false');

        // --- Apply translations to the popup content ---
        if (typeof I18nModule !== 'undefined' && typeof I18nModule.applyTranslations === 'function') {
            I18nModule.applyTranslations();
        }
    },
    hideWinnerPopup: function () {
        const winnerInfoPopup = document.getElementById('winnerInfoPopup');
        if (!winnerInfoPopup) return;
        winnerInfoPopup.style.display = 'none';
        winnerInfoPopup.setAttribute('aria-hidden', 'true');
    }
};
