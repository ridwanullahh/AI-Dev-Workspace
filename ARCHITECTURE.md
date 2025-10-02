# AI Dev Workspace - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Data Layer](#data-layer)
4. [Service Layer](#service-layer)
5. [Component Architecture](#component-architecture)
6. [AI Agent System](#ai-agent-system)
7. [State Management](#state-management)
8. [Security & Encryption](#security--encryption)
9. [Performance & Optimization](#performance--optimization)
10. [Mobile-First Design](#mobile-first-design)

## System Overview

AI Dev Workspace is a production-ready, mobile-first development platform that combines AI-powered autonomous agents with traditional development tools. The system is built entirely for the browser using modern web technologies.

### Key Features
- **Multi-AI Provider Integration**: Supports Gemini, OpenAI, Anthropic with intelligent load balancing
- **Autonomous AI Agents**: 6 specialized agents (Planner, Coder, Designer, Debugger, Reviewer, Deployer)
- **Per-Project Isolation**: Complete state isolation for concurrent multi-project workflows
- **Real-time Git Operations**: Full isomorphic-git integration with visual diff editor
- **Browser-Based Development**: OPFS filesystem, Web Workers, Service Workers for offline capability
- **Semantic Memory**: TensorFlow-powered vector search for intelligent context retrieval

## Core Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand + React Context API
- **Database**: Dexie (IndexedDB wrapper)
- **AI Integration**: Direct REST API calls to Gemini/OpenAI
- **Git**: isomorphic-git for browser-based git operations
- **Terminal**: xterm.js for terminal emulation
- **Build System**: Vite with PWA support
- **Mobile**: Capacitor for native app wrapper

### Directory Structure
```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── Terminal.tsx    # Terminal emulator
│   ├── DiffViewer.tsx  # Git diff visualization
│   └── ...
├── contexts/           # React contexts
│   └── ProjectContext.tsx  # Per-project state
├── database/           # Database schemas
│   └── schema.ts       # Dexie schema definitions
├── services/           # Business logic services
│   ├── enhancedAIProvider.ts      # Multi-AI provider system
│   ├── agentOrchestra.ts          # Agent orchestration
│   ├── gitCore.ts                 # Git operations
│   ├── githubAuth.ts              # GitHub OAuth
│   ├── githubSync.ts              # GitHub synchronization
│   ├── devContainer.ts            # Development container
│   ├── enhancedVectorDatabase.ts  # Vector search
│   └── deploymentAutomation.ts    # Deployment workflows
├── stores/             # Zustand stores
│   ├── chatStore.ts    # Chat state management
│   └── workspaceStore.ts  # Workspace state
├── types/              # TypeScript type definitions
└── workers/            # Web Workers
    └── buildWorker.ts  # Build pipeline worker
```

## Data Layer

### Database Schema (Dexie/IndexedDB)

#### Core Tables
- **projects**: Project metadata, git config, settings
- **files**: File contents, paths, staging status
- **chats**: Chat messages with AI agents
- **accounts**: AI provider accounts with encrypted tokens
- **todos**: Per-project todo items
- **terminals**: Terminal sessions and history
- **memories**: Long-term memory for AI context
- **vectors**: Embeddings for semantic search
- **commits**: Git commit history
- **settings**: Application settings
- **performance**: Performance metrics
- **errors**: Error logs

#### Key Relationships
```
Project (1) -----> (N) Files
Project (1) -----> (N) Chats
Project (1) -----> (N) Todos
Project (1) -----> (N) Terminals
Project (1) -----> (N) Memories
Project (1) -----> (N) Commits
```

### Data Flow
1. User interaction → Component
2. Component → Zustand Store / Context API
3. Store → Service Layer
4. Service → Database (Dexie)
5. Database → IndexedDB (Browser)

## Service Layer

### AI Provider Service (`enhancedAIProvider.ts`)
Manages multiple AI provider accounts with:
- **Circuit Breakers**: Automatic failover on provider failures
- **Rate Limiting**: Per-account request/token rate limits
- **Weighted Round-Robin**: Load balancing across accounts
- **Token Refresh**: Automatic OAuth token refresh
- **Streaming**: Token-by-token response streaming
- **Cost Tracking**: Per-request cost calculation

```typescript
// Example: Circuit breaker prevents repeated failures
if (isCircuitBreakerOpen(accountId)) {
  throw new Error('Circuit breaker open for this account');
}
```

### Agent Orchestration (`agentOrchestra.ts`)
Coordinates 6 specialized AI agents:

1. **Planner Agent**: Breaks down tasks into subtasks
2. **Coder Agent**: Implements features and writes code
3. **Designer Agent**: Creates UI/UX designs
4. **Debugger Agent**: Identifies and fixes bugs
5. **Reviewer Agent**: Reviews code quality
6. **Deployer Agent**: Handles deployment workflows

Each agent:
- Has a specialized system prompt
- Can execute specific tools
- Generates artifacts (code, docs, configs)
- Builds context from project memory

### Git Core Service (`gitCore.ts`)
Full git implementation in the browser:
- Initialize repositories
- Stage/unstage files
- Create commits
- Branch management
- Diff generation with hunk-level details
- Patch application

### GitHub Sync Service (`githubSync.ts`)
Bidirectional GitHub synchronization:
- Device flow OAuth authentication
- Repository CRUD operations
- Pull Request creation/management
- Conflict detection and resolution
- Automatic sync polling
- Webhook integration

### Development Container (`devContainer.ts`)
Browser-based development environment:
- **OPFS**: Origin Private File System for fast file I/O
- **Build Pipeline**: Vite/Webpack/esbuild support
- **Terminal Execution**: Command execution in browser
- **Live Preview**: Service Worker-based preview server

### Vector Database (`enhancedVectorDatabase.ts`)
Semantic memory system:
- TensorFlow Universal Sentence Encoder
- Cosine similarity search
- Memory importance scoring
- Automatic pruning of low-value memories
- Knowledge graph construction

## Component Architecture

### Component Hierarchy
```
App
├── ErrorBoundary
│   ├── ProjectProvider (Context)
│   │   ├── MobileBottomNav
│   │   ├── ProjectSwitcher
│   │   ├── ChatInterface
│   │   ├── Terminal
│   │   ├── DiffViewer
│   │   └── SettingsManager
│   └── OnboardingFlow
```

### Project Context Pattern
Per-project state isolation using React Context:
```typescript
const { 
  currentProject,
  projectChats,
  projectTodos,
  projectTerminals,
  projectFiles 
} = useProject();
```

### Mobile-First Components
- **MobileBottomNav**: Sticky bottom navigation
- **SwipeableList**: Touch gesture support
- **PullToRefresh**: Pull-down refresh
- **BottomSheet**: Modal bottom sheets

## AI Agent System

### Task Lifecycle
```
User Request
    ↓
Planner Agent (Task Decomposition)
    ↓
Task Assignment (to appropriate agent)
    ↓
Agent Execution (with context from memory)
    ↓
Artifact Generation (code, docs, tests)
    ↓
Task Completion
```

### Context Building
Agents receive rich context:
- Project files and structure
- Recent chat history
- Relevant memories (semantic search)
- Git history and status
- Related task dependencies

### Web Worker Isolation
Each agent runs in a Web Worker for:
- Non-blocking execution
- Resource isolation
- Parallel processing

## State Management

### Zustand Stores
- **chatStore**: Chat messages, streaming state
- **workspaceStore**: Projects, providers, global state

### React Context
- **ProjectContext**: Project-scoped state (chats, todos, terminals)

### State Persistence
- Zustand persist middleware for settings
- Database persistence for all data
- Local storage for error reports

## Security & Encryption

### Encryption Service
- PBKDF2 key derivation (100,000 iterations)
- AES encryption for API keys and tokens
- Salt storage in localStorage
- Vault lock/unlock mechanism

### OAuth Security
- Device flow for GitHub (no secrets in browser)
- Server-side OAuth for Gemini (callback handling)
- Secure token storage with encryption
- Automatic token refresh

### Data Privacy
- All data stored locally in browser
- No telemetry by default
- Optional data export for portability

## Performance & Optimization

### Performance Monitoring
Tracks:
- Web Vitals (FCP, LCP, FID, CLS)
- AI response times
- Git operation durations
- Memory usage
- Battery status

### Optimization Strategies
- **Code Splitting**: Lazy loading for routes
- **Virtual Scrolling**: For large file lists
- **Debouncing**: For search and input
- **Caching**: Build results, API responses
- **OPFS**: Fast file operations
- **Web Workers**: CPU-intensive tasks

### Bundle Optimization
```javascript
manualChunks: {
  vendor: ['react', 'react-dom'],
  ai: ['@tensorflow/tfjs'],
  editor: ['@monaco-editor/react'],
  terminal: ['xterm']
}
```

## Mobile-First Design

### Responsive Breakpoints
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

### Touch Optimizations
- Large touch targets (min 44px)
- Swipe gestures for navigation
- Pull-to-refresh support
- Long-press context menus

### PWA Features
- Offline support via Service Worker
- App-like experience
- Install prompt
- Push notifications (future)

### Safe Area Insets
```css
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## Deployment Architecture

### Build Process
1. TypeScript compilation (`tsc`)
2. Vite bundling
3. PWA manifest generation
4. Service Worker precaching
5. Asset optimization

### Deployment Targets
- **Vercel**: Zero-config deployment
- **Netlify**: Git-based deployments
- **GitHub Pages**: Static hosting
- **Self-hosted**: Docker container

### Environment Variables
```
VITE_GITHUB_CLIENT_ID
VITE_GOOGLE_CLIENT_ID
VITE_GOOGLE_CLIENT_SECRET
```

## Future Enhancements

### Planned Features
- WebRTC for real-time collaboration
- WebGPU for ML acceleration
- WebAssembly for performance-critical code
- IndexedDB full-text search
- Offline-first sync with CRDTs

### Scalability Considerations
- SharedArrayBuffer for worker communication
- CompressionStream for data optimization
- Incremental static regeneration
- Edge computing for AI inference

## Troubleshooting

### Common Issues
1. **OPFS not available**: Fallback to IndexedDB
2. **AI rate limits**: Circuit breaker activates
3. **Memory leaks**: Check worker cleanup
4. **Build errors**: Clear cache, reinstall deps

### Debug Tools
- Dexie Cloud Inspector
- React DevTools
- Chrome DevTools Performance tab
- Network waterfall analysis

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Development setup
- Code standards
- Testing guidelines
- Pull request process
