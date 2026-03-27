/**
 * Corporate Lobby Directory - Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- Data: 15 Enterprise Tenants ---
    const tenants = [
        { id: 't1', name: 'Acme Corporation', floor: '12', suite: '1200', bank: 'C' },
        { id: 't2', name: 'Global Tech Solutions', floor: '12', suite: '1250', bank: 'C' },
        { id: 't3', name: 'Summit Financial Partners', floor: '11', suite: '1100', bank: 'C' },
        { id: 't4', name: 'Nexus Innovations', floor: '11', suite: '1120', bank: 'C' },
        { id: 't5', name: 'Pinnacle Legal Group', floor: '10', suite: '1000', bank: 'B' },
        { id: 't6', name: 'Horizon Media Network', floor: '9', suite: '900', bank: 'B' },
        { id: 't7', name: 'Quantum Dynamics', floor: '9', suite: '950', bank: 'B' },
        { id: 't8', name: 'Vanguard Enterprise', floor: '8', suite: '800', bank: 'B' },
        { id: 't9', name: 'Crestview Capital', floor: '7', suite: '700', bank: 'A' },
        { id: 't10', name: 'Meridian Consulting', floor: '7', suite: '750', bank: 'A' },
        { id: 't11', name: 'Stellar Logistics', floor: '6', suite: '600', bank: 'A' },
        { id: 't12', name: 'Aurora Health Systems', floor: '5', suite: '500', bank: 'A' },
        { id: 't13', name: 'Apex Capital Management', floor: '4', suite: '400', bank: 'A' },
        { id: 't14', name: 'Zenith Architecture', floor: '3', suite: '300', bank: 'A' },
        { id: 't15', name: 'Catalyst Marketing', floor: '2', suite: '200', bank: 'A' }
    ];

    // Sort alphabetically for the directory
    tenants.sort((a, b) => a.name.localeCompare(b.name));

    // --- State Management ---
    const state = {
        visitorName: '',
        selectedTenant: null,
        currentStep: 1,
        idleTimer: null,
        scrollTimer: null,
        autoScrollActive: true,
        scrollDirection: 1,
        isCheckInMode: false
    };

    const IDLE_TIMEOUT_MS = 45000; // 45 seconds of inactivity resets the kiosk
    const WARNING_TIME_MS = 10000; // Show warning 10s before reset

    // --- DOM Elements ---
    const els = {
        // Clock
        time: document.getElementById('time'),
        date: document.getElementById('date'),

        // Views
        viewDirectory: document.getElementById('view-directory'),
        viewCheckin: document.getElementById('view-checkin'),

        // Directory
        dirList: document.getElementById('directory-list'),
        dirViewport: document.querySelector('.directory-viewport'),
        dirSearch: document.getElementById('directory-search'),

        // Navigation / Controls
        btnStart: document.getElementById('btn-start-checkin'),
        btnCancel: document.getElementById('btn-cancel-checkin'),
        timeoutWarning: document.getElementById('timeout-warning'),
        timeoutSeconds: document.getElementById('timeout-seconds'),

        // Wizard Steps
        steps: [
            document.getElementById('step-1'),
            document.getElementById('step-2'),
            document.getElementById('step-3'),
            document.getElementById('step-4')
        ],
        dots: document.querySelectorAll('.progress-indicator .dot'),

        // Step 1 Elements
        inputName: document.getElementById('visitor-name'),
        btnNext1: document.getElementById('btn-next-to-2'),

        // Step 2 Elements
        companyGrid: document.getElementById('company-selection-grid'),
        btnBack1: document.getElementById('btn-back-to-1'),
        btnNext2: document.getElementById('btn-next-to-3'),

        // Step 3 Elements
        reviewName: document.getElementById('review-name'),
        reviewCompany: document.getElementById('review-company'),
        reviewLocation: document.getElementById('review-location'),
        ndaCheck: document.getElementById('nda-checkbox'),
        btnBack2: document.getElementById('btn-back-to-2'),
        btnFinish: document.getElementById('btn-finish'),

        // Step 4 Elements
        successName: document.getElementById('success-name'),
        successBank: document.getElementById('success-bank'),
        successFloor: document.getElementById('success-floor'),
        successCountdown: document.getElementById('success-countdown')
    };

    // --- Initialization ---
    function init() {
        startClock();
        renderDirectory();
        renderCompanyGrid();
        setupEventListeners();
        startAutoScroll();
    }

    // --- 1. Clock Logic ---
    function startClock() {
        const updateClock = () => {
            const now = new Date();

            // Time: e.g., "02:45 PM"
            els.time.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Date: e.g., "Monday, October 24"
            els.date.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    // --- 2. Render Directory ---
    function renderDirectory(filterText = '') {
        const filtered = tenants.filter(t => t.name.toLowerCase().includes(filterText.toLowerCase()));

        if (filtered.length === 0) {
            els.dirList.innerHTML = '<li class="directory-item empty-state">No matching companies found</li>';
            return;
        }

        els.dirList.innerHTML = filtered.map(t => `
            <li class="directory-item">
                <span class="col-tenant">${t.name}</span>
                <span class="col-floor">${t.floor}</span>
                <span class="col-suite">${t.suite}</span>
            </li>
        `).join('');
    }

    // --- 3. Render Company Grid (Step 2) ---
    function renderCompanyGrid() {
        els.companyGrid.innerHTML = tenants.map(t => `
            <div class="company-card" data-id="${t.id}">
                <div class="company-info">
                    <div class="company-name">${t.name}</div>
                    <div class="company-location">Fl ${t.floor}, Ste ${t.suite}</div>
                </div>
            </div>
        `).join('');
    }

    // --- 4. Event Listeners ---
    function setupEventListeners() {
        // Global interaction listener to reset idle timer
        document.body.addEventListener('touchstart', resetIdleTimer);
        document.body.addEventListener('click', resetIdleTimer);
        document.body.addEventListener('input', resetIdleTimer);

        // Directory Search
        if (els.dirSearch) {
            els.dirSearch.addEventListener('input', (e) => {
                const term = e.target.value.trim();
                renderDirectory(term);

                // Stop auto scroll when searching
                if (term.length > 0) {
                    state.autoScrollActive = false;
                    els.dirViewport.scrollTop = 0;
                } else if (!state.isCheckInMode) {
                    state.autoScrollActive = true;
                }
            });
        }

        // View Navigation
        els.btnStart.addEventListener('click', startCheckIn);
        els.btnCancel.addEventListener('click', cancelCheckIn);

        // Wizard Flow - Step 1
        els.inputName.addEventListener('input', (e) => {
            state.visitorName = e.target.value.trim();
            els.btnNext1.disabled = state.visitorName.length < 2;
        });

        els.btnNext1.addEventListener('click', () => goToStep(2));

        // Wizard Flow - Step 2
        els.companyGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.company-card');
            if (!card) return;

            // Visual selection
            document.querySelectorAll('.company-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            // Update state
            const tenantId = card.dataset.id;
            state.selectedTenant = tenants.find(t => t.id === tenantId);
            els.btnNext2.disabled = false;
        });

        els.btnBack1.addEventListener('click', () => goToStep(1));
        els.btnNext2.addEventListener('click', () => {
            populateReviewCard();
            goToStep(3);
        });

        // Wizard Flow - Step 3
        els.ndaCheck.addEventListener('change', (e) => {
            els.btnFinish.disabled = !e.target.checked;
        });

        els.btnBack2.addEventListener('click', () => goToStep(2));
        els.btnFinish.addEventListener('click', finishCheckIn);
    }

    // --- 5. Navigation & View Logic ---
    function startCheckIn() {
        state.isCheckInMode = true;
        state.autoScrollActive = false;

        // Reset form state
        state.visitorName = '';
        state.selectedTenant = null;
        els.inputName.value = '';
        els.btnNext1.disabled = true;

        if (els.dirSearch) {
            els.dirSearch.value = '';
            renderDirectory();
            els.dirViewport.scrollTop = 0;
        }

        document.querySelectorAll('.company-card').forEach(c => c.classList.remove('selected'));
        els.btnNext2.disabled = true;

        els.ndaCheck.checked = false;
        els.btnFinish.disabled = true;

        goToStep(1, true); // force immediate switch

        // Switch Views with fade
        els.viewDirectory.classList.remove('active');

        setTimeout(() => {
            els.viewDirectory.classList.add('hidden');
            els.viewCheckin.classList.remove('hidden');

            // Small delay for DOM to update before transition
            setTimeout(() => els.viewCheckin.classList.add('active'), 50);
        }, 400); // Wait for fade out

        startIdleTimer();
    }

    function cancelCheckIn() {
        state.isCheckInMode = false;
        clearTimeout(state.idleTimer);
        hideTimeoutWarning();

        if (els.dirSearch) {
            els.dirSearch.value = '';
            renderDirectory();
            els.dirViewport.scrollTop = 0;
        }

        els.viewCheckin.classList.remove('active');

        setTimeout(() => {
            els.viewCheckin.classList.add('hidden');
            els.viewDirectory.classList.remove('hidden');
            setTimeout(() => {
                els.viewDirectory.classList.add('active');
                state.autoScrollActive = true;
            }, 50);
        }, 400); // Wait for fade out
    }

    function goToStep(stepNumber, forceImmediate = false) {
        const prevStep = els.steps[state.currentStep - 1];
        state.currentStep = stepNumber;

        if (!forceImmediate && prevStep && prevStep !== els.steps[stepNumber - 1]) {
            // Fade out previous step
            prevStep.classList.remove('active');

            setTimeout(() => {
                prevStep.classList.add('hidden');
                showTargetStep(stepNumber);
            }, 300); // Wait for CSS transition
        } else {
            // Initial load, forced immediate switch, or same step
            els.steps.forEach(s => {
                s.classList.remove('active');
                s.classList.add('hidden');
            });
            showTargetStep(stepNumber);
        }

        // Update progress indicator (only for steps 1-3)
        if (stepNumber <= 3) {
            els.dots.forEach(dot => {
                const dotStep = parseInt(dot.dataset.step);
                if (dotStep <= stepNumber) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    }

    function showTargetStep(stepNumber) {
        const target = els.steps[stepNumber - 1];
        target.classList.remove('hidden');
        setTimeout(() => target.classList.add('active'), 50);
    }

    function populateReviewCard() {
        els.reviewName.textContent = state.visitorName;
        els.reviewCompany.textContent = state.selectedTenant.name;
        els.reviewLocation.textContent = `Floor ${state.selectedTenant.floor}, Suite ${state.selectedTenant.suite}`;
    }

    function finishCheckIn() {
        // Populate Success Data
        const firstName = state.visitorName.split(' ')[0] || state.visitorName;
        els.successName.textContent = firstName;
        els.successBank.textContent = state.selectedTenant.bank;
        els.successFloor.textContent = state.selectedTenant.floor;

        goToStep(4);
        clearTimeout(state.idleTimer); // Stop idle timeout on success screen
        hideTimeoutWarning();

        // Auto-return countdown
        let count = 8;
        els.successCountdown.textContent = count;

        const countdownInterval = setInterval(() => {
            count--;
            els.successCountdown.textContent = count;
            if (count <= 0) {
                clearInterval(countdownInterval);
                cancelCheckIn();
            }
        }, 1000);
    }

    // --- 6. Idle Timer Logic ---
    function resetIdleTimer() {
        if (!state.isCheckInMode || state.currentStep === 4) return;

        hideTimeoutWarning();
        startIdleTimer();
    }

    function startIdleTimer() {
        clearTimeout(state.idleTimer);

        state.idleTimer = setTimeout(() => {
            // Show warning
            showTimeoutWarning();

            // Set secondary timer for actual reset
            let secondsLeft = Math.floor(WARNING_TIME_MS / 1000);
            els.timeoutSeconds.textContent = secondsLeft;

            const warningInterval = setInterval(() => {
                secondsLeft--;
                els.timeoutSeconds.textContent = secondsLeft;

                // If user interacted, timer was reset and warning hidden
                if (!els.timeoutWarning.classList.contains('visible')) {
                    clearInterval(warningInterval);
                    return;
                }

                if (secondsLeft <= 0) {
                    clearInterval(warningInterval);
                    cancelCheckIn(); // Auto reset
                }
            }, 1000);

        }, IDLE_TIMEOUT_MS - WARNING_TIME_MS);
    }

    function showTimeoutWarning() {
        els.timeoutWarning.classList.add('visible');
    }

    function hideTimeoutWarning() {
        els.timeoutWarning.classList.remove('visible');
    }

    // --- 7. Auto-Scroll Logic ---
    function startAutoScroll() {
        let scrollPos = 0;
        const scrollSpeed = 0.5; // pixels per frame

        function scrollLoop() {
            if (state.autoScrollActive && els.dirList.scrollHeight > els.dirViewport.clientHeight) {
                const maxScroll = els.dirList.scrollHeight - els.dirViewport.clientHeight;

                scrollPos += (scrollSpeed * state.scrollDirection);

                if (scrollPos >= maxScroll) {
                    scrollPos = maxScroll;
                    state.scrollDirection = -1; // Reverse
                } else if (scrollPos <= 0) {
                    scrollPos = 0;
                    state.scrollDirection = 1; // Forward
                }

                els.dirViewport.scrollTop = scrollPos;
            }
            requestAnimationFrame(scrollLoop);
        }

        // Only start if needed (using requestAnimationFrame for smooth 60fps)
        setTimeout(() => requestAnimationFrame(scrollLoop), 2000);
    }

    // Run
    init();
});
