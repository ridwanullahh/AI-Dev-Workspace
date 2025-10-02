# Contributing to AI Dev Workspace

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Code Standards](#code-standards)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Issue Reporting](#issue-reporting)

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Git
- A code editor (VS Code recommended)
- Basic knowledge of React, TypeScript, and modern web APIs

### First Steps
1. Fork the repository on GitHub
2. Clone your fork locally
3. Add upstream remote
4. Create a feature branch

```bash
git clone https://github.com/YOUR_USERNAME/ai-dev-workspace.git
cd ai-dev-workspace
git remote add upstream https://github.com/ORIGINAL_OWNER/ai-dev-workspace.git
git checkout -b feature/your-feature-name
```

## Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Create `.env` file:
```env
VITE_GITHUB_CLIENT_ID=your_test_github_client_id
VITE_GOOGLE_CLIENT_ID=your_test_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_test_google_client_secret
```

### 3. Start Development Server
```bash
npm run dev
```
Open http://localhost:3000

### 4. Run TypeScript Compiler (Watch Mode)
```bash
npm run build -- --watch
```

## Project Structure

```
ai-dev-workspace/
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # Reusable UI components
│   │   └── ...         # Feature-specific components
│   ├── contexts/       # React contexts for state management
│   ├── database/       # Dexie database schemas
│   ├── services/       # Business logic services
│   ├── stores/         # Zustand state stores
│   ├── types/          # TypeScript type definitions
│   ├── workers/        # Web Workers
│   └── main.tsx        # Application entry point
├── public/             # Static assets
├── services/           # Legacy service layer (to be migrated)
└── tests/              # Test files
```

### Key Directories

**`src/components/`**: React components
- Place reusable components in `ui/`
- Feature-specific components in root
- Each component should have a single responsibility

**`src/services/`**: Business logic
- Pure functions, no UI logic
- Handle API calls, data transformations
- Export singleton instances where appropriate

**`src/database/`**: Data persistence
- Dexie schema definitions
- Type-safe database interfaces
- Migration scripts

## Code Standards

### TypeScript

**Use strict typing**
```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// Bad
function getUser(id: any): any {
  // ...
}
```

**Avoid `any` type**
```typescript
// Good
type UnknownObject = Record<string, unknown>;

// Bad
let data: any;
```

**Use type guards**
```typescript
function isError(error: unknown): error is Error {
  return error instanceof Error;
}
```

### React Components

**Use functional components with hooks**
```typescript
// Good
export function MyComponent({ prop }: { prop: string }) {
  const [state, setState] = useState<string>('');
  
  useEffect(() => {
    // Effect logic
  }, []);
  
  return <div>{prop}</div>;
}

// Avoid class components
```

**Destructure props**
```typescript
// Good
function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// Bad
function Button(props: ButtonProps) {
  return <button onClick={props.onClick}>{props.children}</button>;
}
```

**Use semantic HTML**
```tsx
// Good
<button onClick={handleClick}>Click me</button>

// Bad
<div onClick={handleClick}>Click me</div>
```

### Naming Conventions

**Components**: PascalCase
```typescript
function UserProfile() { }
function ChatMessage() { }
```

**Files**: Match component name
```
UserProfile.tsx
ChatMessage.tsx
```

**Hooks**: Start with "use"
```typescript
function useAuth() { }
function useProject() { }
```

**Services**: camelCase singleton
```typescript
export const githubAuth = new GitHubAuthService();
export const enhancedAIProvider = new EnhancedAIProviderService();
```

**Constants**: UPPER_SNAKE_CASE
```typescript
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';
```

### Code Style

**Use ES6+ features**
```typescript
// Destructuring
const { id, name } = user;

// Arrow functions
const handleClick = () => { };

// Template literals
const message = `Hello, ${name}!`;

// Optional chaining
const email = user?.contact?.email;

// Nullish coalescing
const port = config.port ?? 3000;
```

**Avoid mutations**
```typescript
// Good
const newArray = [...oldArray, newItem];
const newObject = { ...oldObject, newProp: value };

// Bad
oldArray.push(newItem);
oldObject.newProp = value;
```

**Use async/await**
```typescript
// Good
async function fetchData() {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

// Avoid promises chains
```

### Comments

**Write self-documenting code**
```typescript
// Good: Clear function name and types
async function getUserByEmail(email: string): Promise<User> {
  return await db.users.where('email').equals(email).first();
}

// Bad: Unclear, needs comment
async function get(e: string) {
  // Gets user by email
  return await db.users.where('email').equals(e).first();
}
```

**Use comments for complex logic**
```typescript
// Circuit breaker: Prevent repeated failures by opening circuit
// after threshold failures, allowing cooldown period
if (this.isCircuitBreakerOpen(accountId)) {
  throw new Error('Circuit breaker is open for this account');
}
```

**Use JSDoc for public APIs**
```typescript
/**
 * Searches for similar content using semantic search
 * @param query - The search query text
 * @param filter - Optional filters (namespace, projectId)
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of search results with similarity scores
 */
async searchSimilar(
  query: string,
  filter: { namespace?: string; projectId?: string } = {},
  limit: number = 10
): Promise<SearchResult[]> {
  // Implementation
}
```

## Testing

### Unit Tests

**Write tests for services**
```typescript
// services/__tests__/githubAuth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { githubAuth } from '../githubAuth';

describe('GitHubAuthService', () => {
  it('should initiate device flow', async () => {
    const result = await githubAuth.initiateDeviceFlow();
    
    expect(result).toHaveProperty('device_code');
    expect(result).toHaveProperty('user_code');
    expect(result).toHaveProperty('verification_uri');
  });
});
```

**Test component behavior**
```typescript
// components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

### Integration Tests

**Test complete workflows**
```typescript
// tests/integration/project-creation.test.ts
describe('Project Creation Flow', () => {
  it('should create project and initialize git', async () => {
    // Create project
    const project = await createProject({
      name: 'Test Project',
      type: 'web'
    });
    
    // Verify project created
    expect(project.id).toBeDefined();
    
    // Verify git initialized
    const gitConfig = project.gitConfig;
    expect(gitConfig.branch).toBe('main');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test githubAuth
```

## Pull Request Process

### 1. Sync with Upstream
```bash
git fetch upstream
git rebase upstream/main
```

### 2. Make Your Changes
- Follow code standards
- Write tests for new features
- Update documentation if needed
- Keep commits atomic and focused

### 3. Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add GitHub PR creation support
fix: resolve circuit breaker reset issue
docs: update deployment guide
test: add tests for vector search
refactor: simplify error handling logic
perf: optimize file loading performance
```

### 4. Push Your Branch
```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request
- Use descriptive title following commit convention
- Provide detailed description of changes
- Reference related issues (`Fixes #123`)
- Add screenshots for UI changes
- Check all CI checks pass

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### 6. Code Review
- Address reviewer feedback
- Push additional commits as needed
- Keep discussion professional and constructive

### 7. Merge
Once approved:
- Maintainer will merge using squash and merge
- Your branch will be deleted
- Celebrate! 🎉

## Issue Reporting

### Before Creating an Issue
1. Search existing issues
2. Check documentation
3. Try latest version
4. Prepare minimal reproduction

### Issue Template

**Bug Report**
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: Chrome 120
- OS: Windows 11
- Version: 1.0.0

## Additional Context
Screenshots, error logs, etc.
```

**Feature Request**
```markdown
## Feature Description
Clear description of proposed feature

## Problem It Solves
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives Considered
Other solutions you've considered

## Additional Context
Mockups, examples, etc.
```

## Development Tips

### Debugging

**React DevTools**
```bash
npm install -g react-devtools
react-devtools
```

**Dexie Inspector**
```typescript
import Dexie from 'dexie';
Dexie.debug = true; // Enable query logging
```

**Performance Profiling**
```typescript
// Use React Profiler
import { Profiler } from 'react';

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

### Useful Commands

```bash
# Type checking
npm run build -- --noEmit

# Lint
npm run lint

# Fix lint issues
npm run lint -- --fix

# Bundle analysis
npm run build -- --analyze

# Clean build
rm -rf dist node_modules
npm install
npm run build
```

## Getting Help

- **Discord**: [Join our community](https://discord.gg/aidevworkspace)
- **GitHub Discussions**: Ask questions
- **Stack Overflow**: Tag with `ai-dev-workspace`
- **Email**: support@aidevworkspace.com

## License

By contributing, you agree that your contributions will be licensed under the project's license (MIT).

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website (if applicable)

Thank you for contributing! 🚀
