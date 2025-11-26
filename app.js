// State management
let commitments = [];

// DOM elements
const wakeTimeInput = document.getElementById('wakeTime');
const sleepTimeInput = document.getElementById('sleepTime');
const commitmentsList = document.getElementById('commitmentsList');
const addCommitmentBtn = document.getElementById('addCommitment');
const calculateBtn = document.getElementById('calculate');
const hoursLeftDisplay = document.getElementById('hoursLeft');
const percentageDisplay = document.getElementById('percentage');
const liveClockDisplay = document.getElementById('liveClock');
const currentDateDisplay = document.getElementById('currentDate');
const centerHoursDisplay = document.getElementById('centerHours');
const totalCommittedDisplay = document.getElementById('totalCommitted');
const totalFreeDisplay = document.getElementById('totalFree');
const productivityScoreDisplay = document.getElementById('productivityScore');
const productivityBarDisplay = document.getElementById('productivityBar');
const themeToggle = document.getElementById('themeToggle');
const timelineDisplay = document.getElementById('timeline');
const canvas = document.getElementById('donutChart');
const ctx = canvas.getContext('2d');

// Load saved preferences from localStorage
function loadPreferences() {
    const saved = localStorage.getItem('timeLeftPrefs');
    if (saved) {
        const prefs = JSON.parse(saved);
        wakeTimeInput.value = prefs.wakeTime || '07:00';
        sleepTimeInput.value = prefs.sleepTime || '23:00';
        commitments = prefs.commitments || [];
        renderCommitments();
        calculateTimeLeft();
    }
}

// Save preferences to localStorage
function savePreferences() {
    const prefs = {
        wakeTime: wakeTimeInput.value,
        sleepTime: sleepTimeInput.value,
        commitments: commitments
    };
    localStorage.setItem('timeLeftPrefs', JSON.stringify(prefs));
}

// Add commitment
function addCommitment() {
    commitments.push({
        name: '',
        start: '',
        end: ''
    });
    renderCommitments();
    savePreferences();
}

// Remove commitment
function removeCommitment(index) {
    commitments.splice(index, 1);
    renderCommitments();
    savePreferences();
}

// Update commitment
function updateCommitment(index, field, value) {
    commitments[index][field] = value;
    savePreferences();
}

// Render commitments list
function renderCommitments() {
    commitmentsList.innerHTML = '';
    
    if (commitments.length === 0) {
        commitmentsList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No commitments yet. Add one to get started!</div>';
        return;
    }
    
    commitments.forEach((commitment, index) => {
        const div = document.createElement('div');
        div.className = 'commitment-item';
        div.innerHTML = `
            <input type="text" placeholder="Name (e.g., Gym)" value="${commitment.name}" 
                   onchange="updateCommitment(${index}, 'name', this.value)">
            <input type="time" value="${commitment.start}" 
                   onchange="updateCommitment(${index}, 'start', this.value)">
            <input type="time" value="${commitment.end}" 
                   onchange="updateCommitment(${index}, 'end', this.value)">
            <button class="btn-remove" onclick="removeCommitment(${index})">✕</button>
        `;
        commitmentsList.appendChild(div);
    });
    
    renderTimeline();
}

// Add quick commitment
function addQuickCommitment(name, start, end) {
    commitments.push({ name, start, end });
    renderCommitments();
    savePreferences();
    calculateTimeLeft();
    
    // Show feedback
    showNotification(`Added ${name} to your schedule`);
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #06b6d4, #3b82f6);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(6, 182, 212, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Convert time string to minutes since midnight
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Update current time and date display
function updateCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    liveClockDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    
    // Update date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateDisplay.textContent = now.toLocaleDateString('en-US', options);
}

// Render timeline
function renderTimeline() {
    if (!timelineDisplay) return;
    
    timelineDisplay.innerHTML = '';
    
    // Add wake time
    const wakeItem = document.createElement('div');
    wakeItem.className = 'timeline-item';
    wakeItem.innerHTML = `
        <div class="timeline-time">${wakeTimeInput.value}</div>
        <div class="timeline-dot"></div>
        <div class="timeline-content">🌅 Wake Up</div>
    `;
    timelineDisplay.appendChild(wakeItem);
    
    // Add commitments
    commitments.forEach(commitment => {
        if (commitment.start && commitment.name) {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-time">${commitment.start} - ${commitment.end}</div>
                <div class="timeline-dot"></div>
                <div class="timeline-content">${commitment.name}</div>
            `;
            timelineDisplay.appendChild(item);
        }
    });
    
    // Add sleep time
    const sleepItem = document.createElement('div');
    sleepItem.className = 'timeline-item';
    sleepItem.innerHTML = `
        <div class="timeline-time">${sleepTimeInput.value}</div>
        <div class="timeline-dot"></div>
        <div class="timeline-content">🌙 Sleep Time</div>
    `;
    timelineDisplay.appendChild(sleepItem);
}

// Calculate time left in the day
function calculateTimeLeft() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const wakeMinutes = timeToMinutes(wakeTimeInput.value);
    let sleepMinutes = timeToMinutes(sleepTimeInput.value);
    
    // Handle sleep time past midnight
    if (sleepMinutes < wakeMinutes) {
        sleepMinutes += 24 * 60;
    }
    
    // Total available minutes in the day
    const totalAvailableMinutes = sleepMinutes - wakeMinutes;
    
    // Calculate committed time
    let committedMinutes = 0;
    commitments.forEach(commitment => {
        if (commitment.start && commitment.end) {
            const start = timeToMinutes(commitment.start);
            const end = timeToMinutes(commitment.end);
            const duration = end > start ? end - start : (24 * 60 + end - start);
            committedMinutes += duration;
        }
    });
    
    // Calculate elapsed time today
    const elapsedMinutes = currentMinutes - wakeMinutes;
    
    // Calculate remaining free time
    const usedMinutes = elapsedMinutes + committedMinutes;
    const remainingMinutes = Math.max(0, totalAvailableMinutes - usedMinutes);
    const totalFreeMinutes = totalAvailableMinutes - committedMinutes;
    
    // Convert to hours
    const hoursLeft = (remainingMinutes / 60).toFixed(1);
    const committedHours = (committedMinutes / 60).toFixed(1);
    const totalFreeHours = (totalFreeMinutes / 60).toFixed(1);
    
    // Calculate percentage
    const percentage = Math.max(0, Math.min(100, (remainingMinutes / totalAvailableMinutes) * 100));
    
    // Calculate productivity score (0-100)
    const timeUsedEfficiently = Math.min(elapsedMinutes, totalAvailableMinutes - committedMinutes);
    const productivityScore = Math.round((timeUsedEfficiently / totalAvailableMinutes) * 100);
    
    // Update displays
    hoursLeftDisplay.textContent = hoursLeft;
    percentageDisplay.textContent = `${Math.round(percentage)}%`;
    totalCommittedDisplay.textContent = `${committedHours}h`;
    totalFreeDisplay.textContent = `${totalFreeHours}h`;
    productivityScoreDisplay.textContent = productivityScore;
    centerHoursDisplay.textContent = hoursLeft;
    
    // Update productivity bar
    if (productivityBarDisplay) {
        productivityBarDisplay.style.width = `${productivityScore}%`;
    }
    
    // Draw donut chart
    drawDonutChart(percentage);
    
    // Update timeline
    renderTimeline();
    
    savePreferences();
}

// Draw donut chart with animation
function drawDonutChart(percentage) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    const lineWidth = 24;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background circle with glow
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    
    // Progress arc
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * percentage / 100);
    
    // Create gradient based on percentage
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (percentage > 50) {
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(1, '#3b82f6');
    } else if (percentage > 25) {
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(1, '#ef4444');
    } else {
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(1, '#dc2626');
    }
    
    // Add glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = percentage > 50 ? 'rgba(6, 182, 212, 0.5)' : 'rgba(239, 68, 68, 0.5)';
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;
}

// Theme toggle
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('light-theme');
    
    const isLight = body.classList.contains('light-theme');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    const themeText = themeToggle.querySelector('.theme-text');
    
    if (themeIcon) {
        themeIcon.textContent = isLight ? '☀️' : '🌙';
    }
    if (themeText) {
        themeText.textContent = isLight ? 'Light Mode' : 'Dark Mode';
    }
    
    // Save theme preference
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Load theme preference
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    const themeText = themeToggle.querySelector('.theme-text');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Light Mode';
    }
}

// Event listeners
addCommitmentBtn.addEventListener('click', addCommitment);
calculateBtn.addEventListener('click', () => {
    calculateTimeLeft();
    showNotification('Dashboard updated!');
});
wakeTimeInput.addEventListener('change', () => {
    savePreferences();
    calculateTimeLeft();
});
sleepTimeInput.addEventListener('change', () => {
    savePreferences();
    calculateTimeLeft();
});
themeToggle.addEventListener('click', toggleTheme);

// Make functions globally accessible
window.updateCommitment = updateCommitment;
window.removeCommitment = removeCommitment;
window.addQuickCommitment = addQuickCommitment;

// Update current time every second
setInterval(updateCurrentTime, 1000);

// Auto-calculate every minute
setInterval(calculateTimeLeft, 60000);

// Initialize
loadTheme();
loadPreferences();
updateCurrentTime();
