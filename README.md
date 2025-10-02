# AI Dev Workspace 🚀

> **A production-ready, mobile-first AI development platform powered by autonomous agents**

Transform your development workflow with AI agents that understand your codebase, manage your tasks, and help you build faster—all from your browser or mobile device.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## ✨ Features

### 🤖 AI-Powered Agents
- **6 Specialized Agents**: Planner, Coder, Designer, Debugger, Reviewer, Deployer
- **Real AI Integration**: Supports Gemini, OpenAI, Anthropic with intelligent load balancing
- **Autonomous Execution**: Agents work independently with Web Workers
- **Context-Aware**: Semantic memory powered by TensorFlow

### 📱 Mobile-First Design
- **Works Anywhere**: Desktop, tablet, or mobile—same great experience
- **Touch-Optimized**: Swipe gestures, pull-to-refresh, touch-friendly UI
- **Offline Capable**: PWA with Service Worker caching
- **Native Apps**: iOS and Android via Capacitor

### 🔄 GitHub Integration
- **Device Flow Auth**: Secure GitHub authentication without secrets
- **Bidirectional Sync**: Auto-sync between local and remote repositories
- **Conflict Resolution**: Visual diff editor with merge conflict handling
- **PR Management**: Create and manage pull requests from the app

### 💻 Development Tools
- **In-Browser Terminal**: Full xterm.js terminal with command execution
- **Git Operations**: Stage, commit, branch, merge—all in browser
- **Live Preview**: Service Worker-based preview with hot reload
- **Build Pipeline**: Vite, Webpack, esbuild support

### 🧠 Smart Memory
- **Semantic Search**: Find relevant code and conversations instantly
- **Knowledge Graph**: Visualize relationships between code and decisions
- **Context Retention**: AI remembers your project's history
- **Memory Management**: Automatic pruning of low-value memories

### 🚀 Deployment
- **One-Click Deploy**: Vercel, Netlify, GitHub Pages support
- **Error Detection**: AI-powered build error analysis and fixing
- **Rollback**: Instant rollback to previous deployments
- **Environment Management**: Per-environment configuration

## 🎯 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- A GitHub account
- (Optional) Google Cloud account for Gemini AI
- (Optional) OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-dev-workspace.git
cd ai-dev-workspace

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
# At minimum, add VITE_GITHUB_CLIENT_ID

# Start development server
npm run dev
```

Visit `http://localhost:3000` and complete the onboarding flow!

## 📚 Documentation

- **[Architecture Overview](ARCHITECTURE.md)** - System design and technical details
- **[Deployment Guide](DEPLOYMENT.md)** - Step-by-step deployment instructions
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run type checking
npm run build -- --noEmit

# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Project Structure

```
ai-dev-workspace/
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # Reusable UI components
│   │   ├── Terminal.tsx   # Terminal emulator
│   │   ├── DiffViewer.tsx # Git diff visualization
│   │   └── ...
│   ├── contexts/          # React contexts
│   ├── database/          # Dexie database schemas
│   ├── services/          # Business logic services
│   ├── stores/            # Zustand state stores
│   ├── types/             # TypeScript definitions
│   └── workers/           # Web Workers
├── public/                # Static assets
├── ARCHITECTURE.md        # Architecture documentation
├── DEPLOYMENT.md          # Deployment guide
└── CONTRIBUTING.md        # Contribution guidelines
```

## 🤝 Contributing

We love contributions! Whether it's:
- 🐛 Bug reports
- 💡 Feature suggestions  
- 📝 Documentation improvements
- 🔧 Code contributions

Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 🔒 Security

- **Encrypted Storage**: API keys encrypted with AES using PBKDF2-derived keys
- **No Backend Required**: All processing happens in browser
- **OAuth Security**: Device flow prevents secret exposure
- **HTTPS Only**: Service Workers require secure context

## 🌟 Use Cases

### For Solo Developers
- Build full-stack apps on your phone during commute
- AI agents help you code faster and catch bugs
- Git integration keeps code synced across devices

### For Teams
- Real-time collaboration (coming soon)
- Shared knowledge graphs
- Consistent code review from AI

### For Learners
- AI explains your code
- Learn best practices from agent suggestions
- Hands-on practice without local setup

## 🚧 Roadmap

- [x] Multi-AI provider support
- [x] GitHub integration
- [x] Vector search and memory
- [x] Mobile-first UI
- [x] Deployment automation
- [ ] Real-time collaboration
- [ ] Local AI models (WebLLM)
- [ ] Advanced git operations
- [ ] Plugin system
- [ ] Team workspaces

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

Built with amazing open-source technologies:
- [React](https://reactjs.org/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
- [isomorphic-git](https://isomorphic-git.org/) - Git in browser
- [xterm.js](https://xtermjs.org/) - Terminal emulator
- [TensorFlow.js](https://www.tensorflow.org/js) - ML in browser
- [Vite](https://vitejs.dev/) - Build tool
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

## 💬 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/ai-dev-workspace/issues)
- **Discussions**: [Ask questions](https://github.com/yourusername/ai-dev-workspace/discussions)

---

**Made with ❤️ by developers, for developers**
