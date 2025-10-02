# AI Dev Agentic Workspace – Smart Audit & Production TODOs

Bismillah Ar-Rahman Ar-Roheem

Audit Snapshot (high-level)
- Present (good foundation)
  - PWA scaffold (manifest, Workbox SW), Capacitor config
  - Zustand stores (chat, project, workspace), multi-project scaffolding
  - Local vector + embeddings via TFJS/USE, semantic search engine, memory worker
  - isomorphic-git integration (local Git ops), Buffer polyfill
  - Basic AI provider manager (Gemini/OpenAI placeholders), rate-limit structure
  - UI primitives for chat and providers (components present), xterm deps
- Partial / Prototype
  - OAuth (Google/Gemini) uses placeholders; no real token exchange/refresh
  - Key aggregation/rotation across multiple accounts; basic structure, lacks robust scheduler
  - Streaming, usage accounting, cost tracking inconsistent across providers
  - Git flows beyond basics, regex/diff-first editing not fully implemented in UI
  - Two-way GitHub sync (OAuth + PR flows) missing
  - Agent orchestra stubs; no robust Planner/Coder/Designer/Debugger pipelines
  - Persistence strategy for all services (Dexie schemas/migrations) incomplete
  - Offline fallback page (offline.html) not present; SW routes expect it
- Missing / Needs Productionization
  - Mobile-first UI polish (bottom sheets, gestures, FAB, A11y), offline indicators
  - Dev container emulation (browser-based runtime, builder, terminal pipelines)
  - Deployment automation (GH Pages/Netlify/Vercel), auto-fix deploy errors
  - Security: key vault encryption, CSP hardening, permissioned tool access
  - Observability: telemetry, performance budgets, error reporting, local analytics
  - Tests: unit, e2e, performance; CI/CD

---

Master TODO (phased, with tasks → sub-tasks → sub-sub-tasks)

Phase 1 – Core Foundation (Month 1–3)
1) Real OAuth Multi-Account (Gemini first)
   - Implement Google OAuth code exchange (no placeholders)
     - Create /api/oauth/google/token exchange endpoint (serverless or proxy)
     - Store access_token, refresh_token, expires_in securely
     - Refresh token flow; scheduled refresh in background
   - Account management UI
     - Link/unlink multiple Google accounts; set priority/weight
     - Provider/account health status, rate-limit indicators
   - Storage
     - Dexie-based accounts table (schema + migrations)
     - Encrypt at-rest with PBKDF2 + AES (user passphrase)

2) AI Key Aggregation & Rate Limit Avoidance
   - Scheduler/rotator
     - Round-robin with weighted priority, backoff on 429/5xx
     - Per-account quotas (RPM, RPH, TPM) tracking
   - Usage metering
     - Token counting per request/response per provider
     - Cost estimation (configurable per-model pricing)
   - Failover & retries
     - Retry policy (exponential backoff, jitter)
     - Circuit breaker per account/provider

3) Chat Engine (Provider-agnostic, Streaming)
   - Unify request model for Gemini/OpenAI-like APIs
     - Normalization layer (role mapping, system prompt handling)
   - SSE/streaming handler for all providers
     - Append tokens to stream; graceful cancel; timeouts
   - Message persistence
     - Dexie chat tables by project; prune policy; export/import

4) Git-First Core
   - Repository lifecycle
     - Init/clone/open existing repos (local)
     - Branching/merge/rebase support, conflict markers
   - Diff/patch engine
     - Generate unified diffs; apply patches with safety checks
     - Regex-edit plan preview; dry-run, rollback
   - UI hooks
     - File explorer with dirty state; staged/unstaged view

5) Local Persistence Base
   - Dexie database design
     - Schemas: accounts, projects, files, commits, chats, memories, vectors, settings
     - Versioned migrations; data integrity checks
   - Storage service
     - Backup/restore, export/import; quota handling

Phase 2 – Advanced Features (Month 4–6)
6) Two-Way GitHub Sync
   - OAuth App (GitHub) – device/code flow
   - Pull/push, PR creation, branch protection awareness
   - Conflict resolution UX; selective sync; secrets safety

7) Agentic Orchestra (Mobile-Optimized)
   - Roles: Planner, Coder, Designer, Debugger, Reviewer, Deployer
     - Task graph builder, dependency resolution
     - Tool-use policies and guardrails per role
   - Execution runtime
     - Web Workers per agent; cooperative scheduling
     - Interrupt/resume, checkpointing to Dexie
   - Long-term memory
     - Memory injection strategy (RAG via local vectors)
     - Session summarization, topic threading

8) Vector DB & Semantic Search Productionization
   - Embedding pipeline
     - Multi-model ensemble fallback (USE, TFJS small model)
     - Batch enqueue in worker; cache; dedupe
   - Indexing
     - HNSW-like approximations (client-friendly) or shards
     - Namespaces per project; TTL policies
   - Search UX
     - Vector heatmap, memory inspector, pin/unpin memories

9) Mobile-First UI System
   - Components
     - BottomSheet, Floating Action Button/Menu, gesture-driven panels
     - Virtualized lists, skeleton loaders, A11y labels, dark mode polish
   - Offline indicators & sync banners
   - Settings pages (providers, agents, performance)

Phase 3 – Enhanced Capabilities (Month 7–9)
10) Dev Container (Browser-Based)
    - Filesystem sandbox (OPFS/IndexedDB); project mount
    - Builder pipeline
      - esbuild/rollup in worker; incremental builds; diagnostics parsing
    - Terminal
      - xterm integration with command router (git, fs, mock npm)
    - Preview server
      - Service worker proxy to serve built artifacts

11) Deployment Automation
    - Targets: GitHub Pages, Netlify, Vercel
    - One-click deploy from current branch
    - Auto fix routine for common build/deploy errors

12) Web Search Integration (Cost-free)
    - Pluggable providers (MDN, Wikipedia, StackOverflow RSS)
    - Caching, citation tracking, rate limiting

Phase 4 – AI Enhancements (Month 10–12)
13) Local Model Integration
    - WebLLM/WebGPU model loader; model selector UI
    - Resource budgeting; quantized models; fallbacks

14) Advanced Semantic Systems
    - Query planning, toolformer-like API selection
    - Self-correction loops; hallucination checks

15) Performance, Battery, Offline
    - Budgets: <3s FCP on 3G; <5%/hr battery
    - Preload strategies; worker offloading; code splitting audits



Concrete Next Steps (Week 1 Sprint)
- Replace OAuth placeholders with real Google token exchange (serverless proxy)
- Implement Dexie schemas + encryption for accounts and chats
- Add offline.html and SW messaging UI for updates
- Provider rotation with per-account quotas + basic circuit breaker
- Streaming unification across providers with cancel support
- File explorer MVP with diff viewer and patch apply
- Basic bottom sheet + FAB for mobile chat actions

Success Metrics Wiring
- Collect local metrics to meet: <3s load on 3G, <2s AI first token (with rotation), 90% offline coverage, <100MB storage, <5%/hr battery

Dependencies to Validate (No paid services)
- Ensure all AI usage relies on user-provided keys/accounts; provide clear UI for adding accounts
- Prefer local vector pipelines; no external vector DBs
