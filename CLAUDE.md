# CLAUDE.md

# 最重要！
日本語で答えて

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Interactive River Crossing Puzzle App - a React-based web application implementing the classic logic puzzle where a farmer must transport a cat, rabbit, and vegetable across a river under specific constraints.

## Development Commands

```bash
# Navigate to the main React app directory
cd river-crossing-puzzle

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm build
```

## Architecture & Key Components

### Current Structure Issue
The codebase has duplicate implementations that need consolidation:
- `/components/RiverCrossingPuzzle.js` - Full implementation with Tailwind CSS classes
- `/src/App.js` - Identical logic with inline styles
- `/river-crossing-puzzle/src/App.js` - Default CRA template (not integrated)

### Core Game State
The game uses a single `gameState` object managed with React's `useState`:
- `leftSide` / `rightSide` - Arrays tracking items on each riverbank
- `boat` - Array of items currently in the boat
- `boatSide` - Current boat position ('left' or 'right')
- `moves` - Move counter
- `operationLog` - Array for CSV export functionality

### Key Functions
- `checkConstraints()` - Validates game rules (src/App.js:15 or components/RiverCrossingPuzzle.js:15)
- `toggleItem()` - Handles loading/unloading items (src/App.js:37 or components/RiverCrossingPuzzle.js:37)
- `moveBoat()` - Executes boat movement and checks win condition (src/App.js:81 or components/RiverCrossingPuzzle.js:81)

### Game Rules Implementation
- Farmer always accompanies the boat automatically
- Boat capacity: 1 item (plus farmer)
- Constraints checked: Cat+Rabbit alone, Rabbit+Vegetable alone
- Win condition: All items on right bank

## Important Notes

1. **Component Integration**: The puzzle components are not properly integrated into the main React app. The actual game logic exists in standalone files outside the CRA structure.

2. **Styling Inconsistency**: Choose between Tailwind CSS (components version) or inline styles (src version) for consistency.

3. **Japanese UI**: The interface uses Japanese text for messages and labels.

4. **CSV Export Feature**: The app includes operation logging and CSV export functionality for tracking game moves.

When making changes:
- Prefer consolidating the duplicate implementations
- Ensure the main React app properly imports and uses the puzzle component
- Maintain the existing game logic and constraint system
- Test constraint validation thoroughly as it's core to the puzzle mechanics