# Agent Development Guide

## Commands

### Setup
```bash
npm install
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Tests
Tests are configured with vitest but no test script is defined. Run manually: `npx vitest`

### Dev Server
```bash
npm run dev
```
Server runs on http://localhost:3000

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Radix UI components
- **State**: Zustand + TanStack Query
- **Storage**: Dexie (IndexedDB) + localForage
- **AI/ML**: TensorFlow.js + Universal Sentence Encoder
- **Editor**: Monaco Editor + XTerm.js terminal
- **Build**: Vite with PWA support, Capacitor for native mobile
- **Mobile**: Capacitor for iOS/Android deployment

## Architecture
- `src/pages/`: Page components (routing)
- `src/components/`: Reusable UI components
- `src/services/`: Business logic and API calls
- `src/stores/`: Zustand state management
- `src/database/`: Dexie database schemas
- `src/workers/`: Web Workers for background tasks
- Path aliases configured: `@/` points to `src/`

## Code Style
- TypeScript strict mode
- React functional components with hooks
- ESLint with React/TypeScript rules
- No semicolons, single quotes preferred (follow existing patterns)
- Component files use PascalCase, utilities use camelCase
