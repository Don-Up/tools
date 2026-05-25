# CardTimer Design Specification

## Overview

A single-page web application for managing Anki card review timers with TTS notification.

## Layout Structure

```
┌─────────────────────────────────────────┐
│  CardTimer                              │
├─────────────────────────────────────────┤
│  [Card Name Input        ] [Duration ▼] │
│  [Confirm Button]                       │
├─────────────────────────────────────────┤
│  Timer List                             │
│  ┌───────────────────────────────────┐  │
│  │ CSS Parsing  │ 1min │ ● 倒计时中  │  │
│  │ [Delete]                            │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Flexbox     │ 3min  │ ○ 已结束   │  │
│  │ [Delete]                            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Components

### Input Section
- **Card Name Input**: Text field, placeholder "Card name..."
- **Duration Selector**: Dropdown with presets (30s, 1min, 3min, 5min, 10min) + "Custom" option that reveals number input
- **Confirm Button**: Adds new timer card to list

### Timer Card
- **Card Name**: Display the input card name
- **Duration**: Show total duration (e.g., "1min", "30s")
- **Status**: "倒计时中" (green dot, animated) or "已结束" (gray, static)
- **Delete Button**: Remove this timer card

## Functionality

### Adding a Timer
1. User enters card name
2. User selects duration (preset or custom)
3. User clicks Confirm
4. New timer card appears at top of list with "倒计时中" status

### Countdown Behavior
- Updates every second showing remaining time (mm:ss format)
- When countdown ends:
  - TTS speaks the card name twice using default English voice
  - Status changes to "已结束"
  - Card styling becomes muted/desaturated

### TTS
- Uses `window.speechSynthesis` default voice
- Speaks card name 2 times when timer completes

## Visual Design

| Element | Value |
|---------|-------|
| Background | #121212 |
| Card Background | #1e1e1e |
| Text Color | #e0e0e0 |
| Primary Accent | #3a86ff |
| Running Status | #4ade80 (green) |
| Ended Status | #888888 (gray) |
| Font | System sans-serif |

## States

### Timer Card States
- **Running**: Green status indicator, countdown updating, full opacity
- **Ended**: Gray status indicator, no countdown, reduced opacity (0.6)

### Input Validation
- Card name required (cannot be empty)
- Duration must be positive number

## File
- `CardTimer.html` - Single self-contained HTML file with embedded CSS and JS