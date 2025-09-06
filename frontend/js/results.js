// results.js - Results fetching, rendering, and winner popup logic

const ResultsModule = {
    // --- Render Results ---
    renderResults: async function() {
        const resultsContent = document.getElementById('resultsContent');
        if (!resultsContent) {
            console.error('resultsContent element not found');
            return;
        }

        try {
            const resultsData = await ElectionAPI.getResults();
            const stats = resultsData.stats || { totalCandidates: 0, totalVotes: 0 };

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
                if (currentChart) {
                    currentChart.destroy();
                    currentChart = null;
                }
                const chartContainerElement = document.getElementById('chartContainer');
                if (chartContainerElement) {
                    chartContainerElement.classList.add('hidden');
                }
                return;
            }

            const fullResultsArray = resultsData.results || [];
            const top15ResultsArray = fullResultsArray.slice(0, 15);
            const sortedTop15ByExecutiveVotes = [...top15ResultsArray].sort((a, b) => b.executiveVotes - a.executiveVotes);
            const executiveOfficers = sortedTop15ByExecutiveVotes.slice(0, 7).map(c => c.name);

            let resultsHTML = `<div class="results-container">`;
            top15ResultsArray.forEach(candidate => {
                const fullCandidate = window.State.candidates.find(c => c.id === candidate.id);
                const isExecutive = executiveOfficers.includes(candidate.name);
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
                                  onclick="ResultsModule.showWinnerPopup(event)">
                                ${candidate.name}
                            </span>
                        </h4>
                        <div class="progress-container">
                            <div class="progress-label">Council Votes:</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(100, (candidate.councilVotes / (top15ResultsArray[0]?.councilVotes || 1)) * 100)}%"></div>
                            </div>
                            <div class="progress-value">${candidate.councilVotes.toLocaleString()}</div>
                        </div>
                        <div class="progress-container">
                            <div class="progress-label">Executive Votes:</div>
                            <div class="progress-bar">
                                <div class="progress-fill executive" style="width: ${Math.min(100, (candidate.executiveVotes / (sortedTop15ByExecutiveVotes[0]?.executiveVotes || 1)) * 100)}%"></div>
                            </div>
                            <div class="progress-value">${candidate.executiveVotes.toLocaleString()}</div>
                        </div>
                    </div>
                `;
            });
            resultsHTML += `</div>`;
            resultsContent.innerHTML = resultsHTML;

            const chartContainerElement = document.getElementById('chartContainer');
            if (chartContainerElement) {
                chartContainerElement.classList.remove('hidden');
            }

            const sortedChartData = [...top15ResultsArray];
            sortedChartData.sort((a, b) => {
                if (b.councilVotes !== a.councilVotes) {
                    return b.councilVotes - a.councilVotes;
                }
                return b.executiveVotes - a.executiveVotes;
            });

            setTimeout(() => {
                const chartCanvas = document.getElementById('resultsChart');
                if (!chartCanvas) {
                    console.error('resultsChart canvas element not found');
                    return;
                }
                const ctx = chartCanvas.getContext('2d');
                if (currentChart) {
                    currentChart.destroy();
                    currentChart = null;
                }
                currentChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: sortedChartData.map(c => c.name),
                        datasets: [
                            {
                                label: 'Council Votes',
                                data: sortedChartData.map(c => c.councilVotes),
                                backgroundColor: 'rgba(0, 150, 87, 0.7)',
                                borderColor: 'rgba(0, 150, 87, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'Executive Votes',
                                data: sortedChartData.map(c => c.executiveVotes),
                                backgroundColor: 'rgba(243, 156, 18, 0.7)',
                                borderColor: 'rgba(243, 156, 18, 1)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
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
                                        return `${context.dataset.label}: ${context.parsed.x} votes`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
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
                            y: {
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
                                    autoSkip: false,
                                    maxRotation: 0,
                                    minRotation: 0
                                }
                            }
                        }
                    }
                });
            }, 100);
        } catch (err) {
            console.error('Error fetching results:', err);
            resultsContent.innerHTML = `<div class="status-error"><p>Error loading results. Please try again later.</p></div>`;
            if (currentChart) {
                currentChart.destroy();
                currentChart = null;
            }
            const chartContainerElement = document.getElementById('chartContainer');
            if (chartContainerElement) {
                chartContainerElement.classList.add('hidden');
            }
        }
    },

    // --- Winner Popup ---
    showWinnerPopup: function(event) {
        const winnerInfoPopup = document.getElementById('winnerInfoPopup');
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

        const winnerNameEl = document.getElementById('winnerName');
        const winnerPositionEl = document.getElementById('winnerPosition');
        const winnerBioEl = document.getElementById('winnerBio');
        const winnerActivityEl = document.getElementById('winnerActivity');

        if (winnerNameEl) winnerNameEl.textContent = name;
        if (winnerPositionEl) winnerPositionEl.textContent = position;
        if (winnerBioEl) winnerBioEl.textContent = bio;
        if (winnerActivityEl) winnerActivityEl.textContent = activity;

        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        winnerInfoPopup.style.left = `${rect.left + scrollLeft + rect.width / 2 - winnerInfoPopup.offsetWidth / 2}px`;
        winnerInfoPopup.style.top = `${rect.top + scrollTop - winnerInfoPopup.offsetHeight - 10}px`;

        winnerInfoPopup.style.display = 'block';
        winnerInfoPopup.setAttribute('aria-hidden', 'false');
    },

    hideWinnerPopup: function() {
        const winnerInfoPopup = document.getElementById('winnerInfoPopup');
        if (!winnerInfoPopup) return;
        winnerInfoPopup.style.display = 'none';
        winnerInfoPopup.setAttribute('aria-hidden', 'true');
    }
};
