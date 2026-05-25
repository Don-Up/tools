# CardTimer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CardTimer.html page for managing Anki card review timers with TTS notification when countdown ends.

**Architecture:** Single self-contained HTML file with embedded CSS and JavaScript. Timer cards managed in an array, each with its own interval. TTS uses Web Speech API with default English voice.

**Tech Stack:** Vanilla HTML/CSS/JS, Web Speech API (window.speechSynthesis)

---

## File Structure

- Create: `CardTimer.html` - Self-contained single file with all functionality

---

## Tasks

### Task 1: HTML Structure and CSS Styling

**Files:**
- Create: `CardTimer.html`

- [ ] **Step 1: Create the HTML file with basic structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CardTimer</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #121212;
            color: #e0e0e0;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
        }

        h1 {
            font-size: 24px;
            margin-bottom: 20px;
            color: #fff;
        }

        .input-section {
            background: #1e1e1e;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .input-row {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }

        #cardNameInput {
            flex: 1;
            padding: 12px;
            font-size: 16px;
            background: #2c2c2c;
            color: #e0e0e0;
            border: 1px solid #444;
            border-radius: 4px;
        }

        #cardNameInput::placeholder {
            color: #888;
        }

        #durationSelect {
            padding: 12px;
            font-size: 16px;
            background: #2c2c2c;
            color: #e0e0e0;
            border: 1px solid #444;
            border-radius: 4px;
            min-width: 120px;
        }

        #customDurationInput {
            padding: 12px;
            font-size: 16px;
            background: #2c2c2c;
            color: #e0e0e0;
            border: 1px solid #444;
            border-radius: 4px;
            width: 80px;
            display: none;
        }

        #confirmBtn {
            width: 100%;
            padding: 12px;
            font-size: 16px;
            background: #3a86ff;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        #confirmBtn:hover {
            background: #2a6edc;
        }

        .timer-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .timer-card {
            background: #1e1e1e;
            padding: 15px 20px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .timer-card.ended {
            opacity: 0.6;
        }

        .timer-info {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .timer-name {
            font-size: 16px;
            font-weight: 500;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .timer-duration {
            font-size: 14px;
            color: #888;
        }

        .timer-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .status-dot.running {
            background: #4ade80;
            animation: pulse 1.5s infinite;
        }

        .status-dot.ended {
            background: #888;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .timer-countdown {
            font-size: 18px;
            font-weight: 600;
            color: #fff;
            min-width: 60px;
            text-align: center;
        }

        .delete-btn {
            background: transparent;
            color: #888;
            border: none;
            cursor: pointer;
            padding: 8px;
            font-size: 18px;
        }

        .delete-btn:hover {
            color: #ff5252;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>CardTimer</h1>

        <div class="input-section">
            <div class="input-row">
                <input type="text" id="cardNameInput" placeholder="Card name...">
                <select id="durationSelect">
                    <option value="30">30s</option>
                    <option value="60" selected>1min</option>
                    <option value="180">3min</option>
                    <option value="300">5min</option>
                    <option value="600">10min</option>
                    <option value="custom">Custom</option>
                </select>
                <input type="number" id="customDurationInput" placeholder="秒" min="1">
            </div>
            <button id="confirmBtn">Confirm</button>
        </div>

        <div id="timerList" class="timer-list"></div>
    </div>

    <script>
        // Code will be added in Task 2
    </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add CardTimer.html
git commit -m "feat: create CardTimer with HTML structure and dark theme CSS"
```

---

### Task 2: JavaScript Logic

**Files:**
- Modify: `CardTimer.html:150-200` (add script content)

- [ ] **Step 1: Add timer state management and functions**

Replace the placeholder `// Code will be added in Task 2` with:

```javascript
let timers = [];
let timerIntervals = {};

const cardNameInput = document.getElementById('cardNameInput');
const durationSelect = document.getElementById('durationSelect');
const customDurationInput = document.getElementById('customDurationInput');
const confirmBtn = document.getElementById('confirmBtn');
const timerList = document.getElementById('timerList');

// Show/hide custom duration input
durationSelect.addEventListener('change', () => {
    customDurationInput.style.display = durationSelect.value === 'custom' ? 'block' : 'none';
});

// Confirm button click handler
confirmBtn.addEventListener('click', addTimer);

function addTimer() {
    const name = cardNameInput.value.trim();
    if (!name) {
        alert('Please enter a card name');
        return;
    }

    let durationSeconds;
    if (durationSelect.value === 'custom') {
        durationSeconds = parseInt(customDurationInput.value, 10);
        if (!durationSeconds || durationSeconds <= 0) {
            alert('Please enter a valid duration');
            return;
        }
    } else {
        durationSeconds = parseInt(durationSelect.value, 10);
    }

    const timer = {
        id: Date.now(),
        name: name,
        duration: durationSeconds,
        remaining: durationSeconds,
        status: 'running'
    };

    timers.unshift(timer);
    renderTimer(timer);
    startCountdown(timer);

    // Reset inputs
    cardNameInput.value = '';
    customDurationInput.value = '';
}

function renderTimer(timer) {
    const card = document.createElement('div');
    card.className = `timer-card ${timer.status === 'ended' ? 'ended' : ''}`;
    card.id = `timer-${timer.id}`;

    const formattedDuration = formatDuration(timer.duration);
    const statusText = timer.status === 'running' ? '倒计时中' : '已结束';

    card.innerHTML = `
        <div class="timer-info">
            <span class="timer-name" title="${timer.name}">${timer.name}</span>
            <span class="timer-duration">${formattedDuration}</span>
        </div>
        <div class="timer-status">
            <span class="timer-countdown" id="countdown-${timer.id}">${formatTime(timer.remaining)}</span>
            <span class="status-dot ${timer.status}"></span>
            <span>${statusText}</span>
        </div>
        <button class="delete-btn" onclick="deleteTimer(${timer.id})">&times;</button>
    `;

    timerList.insertBefore(card, timerList.firstChild);
}

function startCountdown(timer) {
    timerIntervals[timer.id] = setInterval(() => {
        timer.remaining--;

        const countdownEl = document.getElementById(`countdown-${timer.id}`);
        if (countdownEl) {
            countdownEl.textContent = formatTime(timer.remaining);
        }

        if (timer.remaining <= 0) {
            clearInterval(timerIntervals[timer.id]);
            timer.status = 'ended';
            onTimerEnd(timer);
        }
    }, 1000);
}

function onTimerEnd(timer) {
    // Update card appearance
    const card = document.getElementById(`timer-${timer.id}`);
    if (card) {
        card.classList.add('ended');
        const statusDot = card.querySelector('.status-dot');
        if (statusDot) {
            statusDot.className = 'status-dot ended';
        }
        const statusText = card.querySelector('.timer-status span:last-child');
        if (statusText) {
            statusText.textContent = '已结束';
        }
    }

    // TTS speak card name twice
    speakTwice(timer.name);
}

function speakTwice(text) {
    if ('speechSynthesis' in window) {
        const speakOnce = () => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            speechSynthesis.speak(utterance);
        };

        speakOnce();
        setTimeout(speakOnce, 1500);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds) {
    if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        return mins > 1 ? `${mins}min` : '1min';
    }
    return `${seconds}s`;
}

function deleteTimer(id) {
    if (timerIntervals[id]) {
        clearInterval(timerIntervals[id]);
        delete timerIntervals[id];
    }
    timers = timers.filter(t => t.id !== id);
    const card = document.getElementById(`timer-${id}`);
    if (card) {
        card.remove();
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add CardTimer.html
git commit -m "feat: add timer functionality with countdown and TTS"
```

---

## Self-Review Checklist

1. **Spec coverage:** All requirements from spec implemented
   - Card name input: ✓
   - Duration selector with presets and custom: ✓
   - Confirm button: ✓
   - Timer list with name, duration, status: ✓
   - Delete button: ✓
   - Countdown updates per second: ✓
   - TTS speaks twice when timer ends: ✓
   - Dark theme: ✓

2. **Placeholder scan:** No "TBD", "TODO", or incomplete sections

3. **Type consistency:** All function names consistent across tasks
   - `addTimer()`, `renderTimer()`, `startCountdown()`, `onTimerEnd()`, `speakTwice()`, `deleteTimer()`
   - `formatTime()`, `formatDuration()` - helper functions

---

## Execution Options

**1. Subagent-Driven (recommended)** - Dispatch subagent per task, faster iteration

**2. Inline Execution** - Execute tasks in this session, batch with checkpoints

Which approach?