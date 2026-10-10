/**
 * CYBER CUBE TIMER - Graph Module
 * Handles time visualization with Chart.js
 */

const Graph = {
    chart: null,
    maxPoints: 50, // Maximum number of points to display

    /**
     * Initialize graph
     */
    init() {
        const ctx = document.getElementById('time-chart');
        if (!ctx) {
            console.error('Canvas element not found');
            return false;
        }

        // Chart.js configuration
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Time',
                        data: [],
                        borderColor: '#00f5ff',
                        backgroundColor: 'rgba(0, 245, 255, 0.1)',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#00f5ff',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 1,
                        pointHoverRadius: 6,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Ao5',
                        data: [],
                        borderColor: '#ff00ff',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#ff00ff',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 1,
                        tension: 0.3,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#ffffff',
                            font: {
                                family: 'Rajdhani, sans-serif',
                                size: 12
                            },
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(22, 33, 62, 0.9)',
                        titleColor: '#00f5ff',
                        bodyColor: '#ffffff',
                        borderColor: '#00f5ff',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(3) + 's';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(0, 245, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a0a0a0',
                            font: {
                                family: 'JetBrains Mono, monospace',
                                size: 10
                            }
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 245, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a0a0a0',
                            font: {
                                family: 'JetBrains Mono, monospace',
                                size: 10
                            },
                            callback: function(value) {
                                return value.toFixed(2) + 's';
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ Graph initialized');
        return true;
    },

    /**
     * Update graph with new data
     */
    async update(times) {
        if (!this.chart) {
            console.warn('Chart not initialized yet, skipping update');
            return;
        }

        // If no times provided, fetch them
        if (!times) {
            times = await DB.getTimes(App.currentSession, App.currentCubeType);
        }

        // Filter valid times and reverse to chronological order
        const validTimes = times
            .filter(t => !t.dnf)
            .reverse()
            .slice(-this.maxPoints); // Take last N points

        if (validTimes.length === 0) {
            this.chart.data.labels = [];
            this.chart.data.datasets[0].data = [];
            this.chart.data.datasets[1].data = [];
            this.chart.update('none');
            return;
        }

        // Prepare labels (solve numbers)
        const totalSolves = times.filter(t => !t.dnf).length;
        const startIndex = Math.max(1, totalSolves - this.maxPoints + 1);
        const labels = validTimes.map((_, index) => `#${startIndex + index}`);

        // Prepare time data
        const timeData = validTimes.map(t => (t.time + (t.penalty || 0)) / 1000);

        // Calculate Ao5 for each point
        const ao5Data = [];
        const allValidTimes = times.filter(t => !t.dnf).reverse();

        for (let i = 0; i < validTimes.length; i++) {
            const absoluteIndex = startIndex - 1 + i;
            if (absoluteIndex >= 4) {
                // We have at least 5 times
                const window = allValidTimes.slice(absoluteIndex - 4, absoluteIndex + 1);
                const avg = Statistics.calculateAverage(window);
                ao5Data.push(avg.value && avg.value !== 'DNF' ? parseFloat(avg.value) : null);
            } else {
                ao5Data.push(null);
            }
        }

        // Update chart data
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = timeData;
        this.chart.data.datasets[1].data = ao5Data;

        // Update chart with animation
        this.chart.update('active');
    },

    /**
     * Highlight a specific point
     */
    highlightPoint(index) {
        if (!this.chart) return;

        // Reset all points
        this.chart.data.datasets[0].pointRadius = 4;

        // Highlight specific point
        const pointRadii = new Array(this.chart.data.labels.length).fill(4);
        pointRadii[index] = 8;
        this.chart.data.datasets[0].pointRadius = pointRadii;

        this.chart.update('none');
    },

    /**
     * Reset highlight
     */
    resetHighlight() {
        if (!this.chart) return;

        this.chart.data.datasets[0].pointRadius = 4;
        this.chart.update('none');
    },

    /**
     * Change graph type
     */
    changeType(type) {
        if (!this.chart) return;

        this.chart.config.type = type;
        this.chart.update();
    },

    /**
     * Export graph as image
     */
    exportImage() {
        if (!this.chart) return;

        const url = this.chart.toBase64Image();
        const a = document.createElement('a');
        a.href = url;
        a.download = `cyber-cube-graph-${Date.now()}.png`;
        a.click();
    }
};

// Make Graph globally available
window.Graph = Graph;
