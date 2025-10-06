import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, ProjectFile, Task, AIContext } from './types';
import { localVectorSearch } from './localVectorSearch';
import { aiProviderManager } from './aiProviderManager';
import { gitManager } from './gitManager';
import { agentOrchestrator } from './agentOrchestrator';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: Project['type'];
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  dependencies: string[];
  scripts: Record<string, string>;
}

interface ProjectStats {
  totalFiles: number;
  linesOfCode: number;
  lastActivity: Date;
  tasksCompleted: number;
  activeTasks: number;
  gitCommits: number;
  aiInteractions: number;
}

class ProjectManager {
  private projects: Map<string, Project> = new Map();
  private templates: Map<string, ProjectTemplate> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      await this.loadProjects();
      this.initializeTemplates();
      
      // Initialize indexes for existing projects
      for (const project of this.projects.values()) {
        await this.initializeProjectIndex(project.id);
      }
      
      this.isInitialized = true;
      console.log('Project manager initialized');
    } catch (error) {
      console.error('Failed to initialize project manager:', error);
      throw error;
    }
  }

  private async loadProjects(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('projects');
      if (stored) {
        const projects = JSON.parse(stored);
        for (const project of projects) {
          // Convert date strings back to Date objects
          project.createdAt = new Date(project.createdAt);
          project.updatedAt = new Date(project.updatedAt);
          
          if (project.files) {
            for (const file of project.files) {
              file.lastModified = new Date(file.lastModified);
            }
          }
          
          this.projects.set(project.id, project);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  private async saveProjects(): Promise<void> {
    try {
      const projects = Array.from(this.projects.values());
      await AsyncStorage.setItem('projects', JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  }

  private initializeTemplates(): void {
    const templates: ProjectTemplate[] = [
      {
        id: 'react-native-basic',
        name: 'React Native App',
        description: 'Basic React Native mobile application with navigation',
        type: 'react-native',
        files: [
          {
            path: 'App.tsx',
            content: `import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome to Your App</Text>
      <Text style={styles.subtitle}>Built with AI Workspace</Text>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Configure your app here</Text>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});`,
            language: 'typescript'
          },
          {
            path: 'package.json',
            content: JSON.stringify({
              name: 'my-react-native-app',
              version: '1.0.0',
              main: 'App.tsx',
              scripts: {
                start: 'expo start',
                android: 'expo start --android',
                ios: 'expo start --ios',
                web: 'expo start --web'
              },
              dependencies: {
                expo: '~49.0.0',
                react: '18.2.0',
                'react-native': '0.72.6',
                '@react-navigation/native': '^6.1.7',
                '@react-navigation/bottom-tabs': '^6.5.8',
                '@expo/vector-icons': '^13.0.0'
              },
              devDependencies: {
                '@babel/core': '^7.20.0',
                '@types/react': '~18.2.14',
                typescript: '^5.1.3'
              }
            }, null, 2),
            language: 'json'
          },
          {
            path: 'README.md',
            content: `# My React Native App

This is a React Native application created with AI Workspace.

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`
   npm start
   \`\`\`

3. Follow the instructions in the terminal to open the app on your device or simulator.

## Features

- React Native with Expo
- Navigation setup
- TypeScript support
- Icon integration

## Development

This project was created using AI Workspace's intelligent development environment.
`,
            language: 'markdown'
          }
        ],
        dependencies: ['expo', 'react', 'react-native', '@react-navigation/native'],
        scripts: {
          start: 'expo start',
          build: 'expo build',
          test: 'jest'
        }
      },
      {
        id: 'web-app-react',
        name: 'React Web App',
        description: 'Modern React web application with routing and state management',
        type: 'web',
        files: [
          {
            path: 'src/App.tsx',
            content: `import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';

const Home: React.FC = () => (
  <div className="page">
    <h1>Welcome to Your Web App</h1>
    <p>Built with React and AI Workspace</p>
  </div>
);

const About: React.FC = () => (
  <div className="page">
    <h1>About</h1>
    <p>This is a modern React web application created with AI assistance.</p>
  </div>
);

const Dashboard: React.FC = () => (
  <div className="page">
    <h1>Dashboard</h1>
    <p>Your application dashboard goes here.</p>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-brand">
            <h2>My Web App</h2>
          </div>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Home
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              About
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Dashboard
            </NavLink>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;`,
            language: 'typescript'
          },
          {
            path: 'src/App.css',
            content: `.App {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background-color: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-brand h2 {
  margin: 0;
  color: white;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: #bdc3c7;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: white;
}

.nav-link.active {
  color: #3498db;
  border-bottom: 2px solid #3498db;
  padding-bottom: 2px;
}

.main-content {
  flex: 1;
  padding: 2rem;
  background-color: #f8f9fa;
}

.page {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.page h1 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.page p {
  color: #7f8c8d;
  line-height: 1.6;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    padding: 1rem;
  }
  
  .nav-links {
    margin-top: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .main-content {
    padding: 1rem;
  }
}`,
            language: 'css'
          },
          {
            path: 'package.json',
            content: JSON.stringify({
              name: 'my-web-app',
              version: '0.1.0',
              private: true,
              dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0',
                'react-router-dom': '^6.14.2',
                'react-scripts': '5.0.1',
                typescript: '^4.9.5',
                '@types/react': '^18.2.15',
                '@types/react-dom': '^18.2.7'
              },
              scripts: {
                start: 'react-scripts start',
                build: 'react-scripts build',
                test: 'react-scripts test',
                eject: 'react-scripts eject'
              },
              eslintConfig: {
                extends: ['react-app', 'react-app/jest']
              },
              browserslist: {
                production: ['>0.2%', 'not dead', 'not op_mini all'],
                development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
              }
            }, null, 2),
            language: 'json'
          }
        ],
        dependencies: ['react', 'react-dom', 'react-router-dom'],
        scripts: {
          start: 'react-scripts start',
          build: 'react-scripts build',
          test: 'react-scripts test'
        }
      },
      {
        id: 'nodejs-api',
        name: 'Node.js API',
        description: 'RESTful API with Express, TypeScript, and database integration',
        type: 'node',
        files: [
          {
            path: 'src/server.ts',
            content: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: \`Route \${req.method} \${req.originalUrl} not found\`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
  console.log(\`📊 Health check: http://localhost:\${PORT}/health\`);
  console.log(\`📡 API endpoint: http://localhost:\${PORT}/api\`);
});

export default app;`,
            language: 'typescript'
          },
          {
            path: 'src/routes/index.ts',
            content: `import { Router } from 'express';
import { userRoutes } from './users';
import { authRoutes } from './auth';

export const apiRoutes = Router();

// Mount route modules
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);

// API info endpoint
apiRoutes.get('/', (req, res) => {
  res.json({
    name: 'My API',
    version: '1.0.0',
    description: 'RESTful API built with AI Workspace',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      health: '/health'
    },
    timestamp: new Date().toISOString()
  });
});`,
            language: 'typescript'
          },
          {
            path: 'package.json',
            content: JSON.stringify({
              name: 'my-nodejs-api',
              version: '1.0.0',
              description: 'RESTful API built with Express and TypeScript',
              main: 'dist/server.js',
              scripts: {
                start: 'node dist/server.js',
                dev: 'ts-node-dev --respawn --transpile-only src/server.ts',
                build: 'tsc',
                clean: 'rm -rf dist',
                test: 'jest',
                lint: 'eslint src/**/*.ts'
              },
              dependencies: {
                express: '^4.18.2',
                cors: '^2.8.5',
                helmet: '^7.0.0',
                morgan: '^1.10.0',
                dotenv: '^16.3.1'
              },
              devDependencies: {
                '@types/express': '^4.17.17',
                '@types/cors': '^2.8.13',
                '@types/morgan': '^1.9.4',
                '@types/node': '^20.4.5',
                'ts-node-dev': '^2.0.0',
                typescript: '^5.1.6',
                jest: '^29.6.2',
                '@types/jest': '^29.5.3'
              }
            }, null, 2),
            language: 'json'
          }
        ],
        dependencies: ['express', 'cors', 'helmet', 'morgan'],
        scripts: {
          start: 'node dist/server.js',
          dev: 'ts-node-dev src/server.ts',
          build: 'tsc'
        }
      }
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  private async initializeProjectIndex(projectId: string): Promise<void> {
    try {
      await localVectorSearch.createIndex(`project_${projectId}`, 'hybrid');
    } catch (error) {
      console.error(`Failed to initialize index for project ${projectId}:`, error);
    }
  }

  async createProject(options: {
    name: string;
    description: string;
    type: Project['type'];
    templateId?: string;
    initializeGit?: boolean;
  }): Promise<Project> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const project: Project = {
      id: projectId,
      name: options.name,
      description: options.description,
      type: options.type,
      status: 'active',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      files: [],
      aiContext: {
        projectSummary: options.description,
        codebaseEmbeddings: new Map(),
        conversationHistory: [],
        knowledgeGraph: [],
        activeMemory: []
      },
      agents: []
    };

    // Apply template if specified
    if (options.templateId) {
      await this.applyTemplate(project, options.templateId);
    }

    // Initialize Git repository if requested
    if (options.initializeGit) {
      try {
        const repoId = await gitManager.initRepository(
          project.name,
          project.files.map(f => ({ path: f.path, content: f.content }))
        );
        
        project.gitRepository = {
          id: repoId,
          url: '',
          branch: 'main',
          lastCommit: '',
          isClean: true,
          remoteStatus: 'synced'
        };
      } catch (error) {
        console.error('Failed to initialize Git repository:', error);
      }
    }

    // Save project
    this.projects.set(projectId, project);
    await this.saveProjects();

    // Initialize vector search index
    await this.initializeProjectIndex(projectId);

    // Index initial content
    if (project.files.length > 0) {
      await this.indexProjectContent(projectId);
    }

    // Create initial planning tasks
    await this.createInitialTasks(project);

    return project;
  }

  private async applyTemplate(project: Project, templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Create files from template
    for (const templateFile of template.files) {
      const file: ProjectFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        path: templateFile.path,
        name: templateFile.path.split('/').pop() || templateFile.path,
        content: templateFile.content,
        language: templateFile.language,
        size: templateFile.content.length,
        lastModified: new Date(),
        isGenerated: true
      };

      project.files.push(file);
    }

    project.progress = 15; // Template applied
  }

  private async createInitialTasks(project: Project): Promise<void> {
    const initialTasks: Array<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        title: 'Project Architecture Review',
        description: `Review and optimize the architecture for ${project.name}. Analyze the current structure and suggest improvements for scalability and maintainability.`,
        type: 'analyze',
        priority: 'high',
        status: 'pending',
        projectId: project.id,
        dependencies: [],
        estimatedTime: 30
      }
    ];

    // Add type-specific tasks
    switch (project.type) {
      case 'react-native':
        initialTasks.push({
          title: 'Mobile UI Components Setup',
          description: 'Create reusable UI components optimized for mobile devices with proper navigation and state management.',
          type: 'design',
          priority: 'medium',
          status: 'pending',
          projectId: project.id,
          dependencies: [],
          estimatedTime: 45
        });
        break;

      case 'web':
        initialTasks.push({
          title: 'Responsive Web Design',
          description: 'Implement responsive design patterns and optimize for different screen sizes and browsers.',
          type: 'design',
          priority: 'medium',
          status: 'pending',
          projectId: project.id,
          dependencies: [],
          estimatedTime: 40
        });
        break;

      case 'node':
        initialTasks.push({
          title: 'API Security Implementation',
          description: 'Implement authentication, authorization, and security best practices for the API endpoints.',
          type: 'code',
          priority: 'high',
          status: 'pending',
          projectId: project.id,
          dependencies: [],
          estimatedTime: 60
        });
        break;
    }

    // Assign tasks to agent orchestrator
    for (const taskData of initialTasks) {
      const task: Task = {
        ...taskData,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        await agentOrchestrator.assignTask(task);
      } catch (error) {
        console.error('Failed to assign initial task:', error);
      }
    }
  }

  private async indexProjectContent(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) return;

    const indexEntries = [];

    // Index project description
    indexEntries.push({
      id: `project_${projectId}`,
      content: `${project.name}: ${project.description}`,
      metadata: { 
        type: 'text' as const, 
        projectId,
        category: 'project_info'
      }
    });

    // Index all files
    for (const file of project.files) {
      indexEntries.push({
        id: `file_${file.id}`,
        content: `${file.path}: ${file.content}`,
        metadata: { 
          type: 'code' as const, 
          projectId, 
          language: file.language, 
          path: file.path,
          category: 'project_file'
        }
      });
    }

    try {
      await localVectorSearch.addToIndex(`project_${projectId}`, indexEntries);
    } catch (error) {
      console.error('Failed to index project content:', error);
    }
  }

  async getProject(projectId: string): Promise<Project | undefined> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.projects.get(projectId);
  }

  async getAllProjects(): Promise<Project[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return Array.from(this.projects.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const updatedProject = { 
      ...project, 
      ...updates, 
      updatedAt: new Date() 
    };
    
    this.projects.set(projectId, updatedProject);
    await this.saveProjects();

    // Re-index if description or name changed
    if (updates.name || updates.description) {
      await this.indexProjectContent(projectId);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Delete Git repository if exists
    if (project.gitRepository?.id) {
      try {
        await gitManager.deleteRepository(project.gitRepository.id);
      } catch (error) {
        console.error('Failed to delete Git repository:', error);
      }
    }

    // Clear vector search index
    try {
      await localVectorSearch.clearIndex(`project_${projectId}`);
    } catch (error) {
      console.error('Failed to clear search index:', error);
    }

    // Remove project
    this.projects.delete(projectId);
    await this.saveProjects();
  }

  async addFile(projectId: string, file: Omit<ProjectFile, 'id' | 'lastModified'>): Promise<ProjectFile> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const newFile: ProjectFile = {
      ...file,
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastModified: new Date()
    };

    project.files.push(newFile);
    project.updatedAt = new Date();
    
    this.projects.set(projectId, project);
    await this.saveProjects();

    // Add to Git repository if exists
    if (project.gitRepository?.id) {
      try {
        await gitManager.writeFile(project.gitRepository.id, newFile.path, newFile.content);
      } catch (error) {
        console.error('Failed to add file to Git:', error);
      }
    }

    // Index file content
    await this.indexFileContent(projectId, newFile);

    return newFile;
  }

  async updateFile(projectId: string, fileId: string, updates: Partial<ProjectFile>): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const fileIndex = project.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      throw new Error('File not found');
    }

    const updatedFile = {
      ...project.files[fileIndex],
      ...updates,
      lastModified: new Date()
    };

    project.files[fileIndex] = updatedFile;
    project.updatedAt = new Date();
    
    this.projects.set(projectId, project);
    await this.saveProjects();

    // Update in Git repository if exists
    if (project.gitRepository?.id && updates.content !== undefined) {
      try {
        await gitManager.writeFile(project.gitRepository.id, updatedFile.path, updatedFile.content);
      } catch (error) {
        console.error('Failed to update file in Git:', error);
      }
    }

    // Re-index file content if content changed
    if (updates.content !== undefined) {
      await this.indexFileContent(projectId, updatedFile);
    }
  }

  async deleteFile(projectId: string, fileId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const fileIndex = project.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
      throw new Error('File not found');
    }

    const file = project.files[fileIndex];
    project.files.splice(fileIndex, 1);
    project.updatedAt = new Date();
    
    this.projects.set(projectId, project);
    await this.saveProjects();

    // Remove from vector search
    try {
      await localVectorSearch.removeFromIndex(`project_${projectId}`, `file_${fileId}`);
    } catch (error) {
      console.error('Failed to remove file from search index:', error);
    }
  }

  private async indexFileContent(projectId: string, file: ProjectFile): Promise<void> {
    try {
      await localVectorSearch.addToIndex(`project_${projectId}`, [{
        id: `file_${file.id}`,
        content: `${file.path}: ${file.content}`,
        metadata: { 
          type: 'code' as const, 
          projectId, 
          language: file.language, 
          path: file.path,
          category: 'project_file'
        }
      }]);
    } catch (error) {
      console.error('Failed to index file content:', error);
    }
  }

  async searchProjectContent(projectId: string, query: string, options: {
    type?: 'code' | 'text' | 'all';
    limit?: number;
  } = {}): Promise<Array<{
    fileId: string;
    path: string;
    content: string;
    score: number;
  }>> {
    try {
      const results = await localVectorSearch.search(query, {
        indexId: `project_${projectId}`,
        ...options
      });

      return results
        .filter(r => r.metadata.category === 'project_file')
        .map(r => ({
          fileId: r.id.replace('file_', ''),
          path: r.metadata.path || '',
          content: r.content,
          score: r.score
        }));
    } catch (error) {
      console.error('Failed to search project content:', error);
      return [];
    }
  }

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Calculate lines of code
    const linesOfCode = project.files.reduce((total, file) => {
      return total + (file.content.split('\n').length || 0);
    }, 0);

    // Get task statistics (this would integrate with task management)
    const tasksCompleted = 0; // Placeholder
    const activeTasks = 0; // Placeholder

    // Get Git statistics
    let gitCommits = 0;
    if (project.gitRepository?.id) {
      try {
        const commits = await gitManager.getCommitHistory(project.gitRepository.id, { depth: 100 });
        gitCommits = commits.length;
      } catch (error) {
        console.error('Failed to get Git stats:', error);
      }
    }

    // Get AI interaction count from context
    const aiInteractions = project.aiContext.conversationHistory.length;

    return {
      totalFiles: project.files.length,
      linesOfCode,
      lastActivity: project.updatedAt,
      tasksCompleted,
      activeTasks,
      gitCommits,
      aiInteractions
    };
  }

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return Array.from(this.templates.values());
  }

  async cloneProject(sourceProjectId: string, newName: string, options: {
    includeGitHistory?: boolean;
  } = {}): Promise<Project> {
    const sourceProject = this.projects.get(sourceProjectId);
    if (!sourceProject) {
      throw new Error('Source project not found');
    }

    return await this.createProject({
      name: newName,
      description: `Cloned from ${sourceProject.name}`,
      type: sourceProject.type,
      initializeGit: !!sourceProject.gitRepository
    });
  }

  async exportProject(projectId: string): Promise<{
    project: Project;
    files: ProjectFile[];
    metadata: {
      exportedAt: Date;
      version: string;
    };
  }> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    return {
      project,
      files: project.files,
      metadata: {
        exportedAt: new Date(),
        version: '1.0.0'
      }
    };
  }

  async importProject(projectData: {
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
    files: Omit<ProjectFile, 'id' | 'lastModified'>[];
  }): Promise<Project> {
    const project = await this.createProject({
      name: projectData.project.name,
      description: projectData.project.description,
      type: projectData.project.type
    });

    // Add files
    for (const fileData of projectData.files) {
      await this.addFile(project.id, fileData);
    }

    return project;
  }

  getActiveProjectsCount(): number {
    return Array.from(this.projects.values()).filter(p => p.status === 'active').length;
  }

  async getRecentProjects(limit: number = 5): Promise<Project[]> {
    const allProjects = await this.getAllProjects();
    return allProjects.slice(0, limit);
  }

  async updateAIContext(projectId: string, context: Partial<AIContext>): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    project.aiContext = { ...project.aiContext, ...context };
    project.updatedAt = new Date();
    
    this.projects.set(projectId, project);
    await this.saveProjects();
  }

  async addConversationToContext(projectId: string, message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: any;
  }): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    project.aiContext.conversationHistory.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...message
    });

    // Keep only recent 100 messages to manage memory
    if (project.aiContext.conversationHistory.length > 100) {
      project.aiContext.conversationHistory = project.aiContext.conversationHistory.slice(-100);
    }

    project.updatedAt = new Date();
    this.projects.set(projectId, project);
    await this.saveProjects();
  }
}

export const projectManager = new ProjectManager();