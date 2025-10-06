import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, ProjectFile, Task, AIContext, GitRepository } from './types';
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
  gitConfig?: {
    initialize: boolean;
    remoteUrl?: string;
    branch?: string;
  };
}

interface ProjectStats {
  totalFiles: number;
  linesOfCode: number;
  lastActivity: Date;
  tasksCompleted: number;
  activeTasks: number;
  gitCommits: number;
  gitBranches: number;
  gitStatus: 'clean' | 'modified' | 'untracked' | 'conflicted';
  aiInteractions: number;
  repositorySize: number;
}

interface GitIntegration {
  repositoryId?: string;
  branch: string;
  status: 'synced' | 'ahead' | 'behind' | 'diverged' | 'disconnected';
  lastCommit?: string;
  commitCount: number;
  untrackedFiles: number;
  modifiedFiles: number;
  remoteUrl?: string;
  isCloned: boolean;
}

class EnhancedProjectManager {
  private projects: Map<string, Project> = new Map();
  private templates: Map<string, ProjectTemplate> = new Map();
  private gitIntegrations: Map<string, GitIntegration> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      await this.loadProjects();
      await this.loadGitIntegrations();
      this.initializeTemplates();
      
      // Initialize indexes for existing projects
      for (const project of this.projects.values()) {
        await this.initializeProjectIndex(project.id);
        if (this.gitIntegrations.has(project.id)) {
          await this.syncGitStatus(project.id);
        }
      }
      
      this.isInitialized = true;
      console.log('Enhanced project manager initialized');
    } catch (error) {
      console.error('Failed to initialize enhanced project manager:', error);
      throw error;
    }
  }

  private async loadProjects(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('enhanced_projects');
      if (stored) {
        const projects = JSON.parse(stored);
        for (const project of projects) {
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

  private async loadGitIntegrations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('git_integrations');
      if (stored) {
        const integrations = JSON.parse(stored);
        for (const integration of integrations) {
          this.gitIntegrations.set(integration.projectId, integration);
        }
      }
    } catch (error) {
      console.error('Failed to load Git integrations:', error);
    }
  }

  private async saveProjects(): Promise<void> {
    try {
      const projects = Array.from(this.projects.values());
      await AsyncStorage.setItem('enhanced_projects', JSON.stringify(projects));
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  }

  private async saveGitIntegrations(): Promise<void> {
    try {
      const integrations = Array.from(this.gitIntegrations.values());
      await AsyncStorage.setItem('git_integrations', JSON.stringify(integrations));
    } catch (error) {
      console.error('Failed to save Git integrations:', error);
    }
  }

  private initializeTemplates(): void {
    const templates: ProjectTemplate[] = [
      {
        id: 'react-native-advanced',
        name: 'Advanced React Native App',
        description: 'Full-featured React Native app with navigation, state management, and Git integration',
        type: 'react-native',
        files: [
          {
            path: 'App.tsx',
            content: `import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Provider } from 'react-redux';
import { store } from './src/store';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Screens
function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Welcome to Advanced App</Text>
      <Text style={styles.subtitle}>Built with AI Workspace + Git</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('Details')}
      >
        <Text style={styles.buttonText}>View Details</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function DetailsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Project Details</Text>
      <Text style={styles.subtitle}>This project includes:</Text>
      <Text style={styles.feature}>• Redux for state management</Text>
      <Text style={styles.feature}>• Navigation stack</Text>
      <Text style={styles.feature}>• Git integration</Text>
      <Text style={styles.feature}>• TypeScript support</Text>
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

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
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
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="Main" 
            component={TabNavigator} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Details" 
            component={DetailsScreen}
            options={{ title: 'Details' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
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
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  feature: {
    fontSize: 14,
    color: '#333',
    marginVertical: 4,
  },
});`,
            language: 'typescript'
          },
          {
            path: 'src/store/index.ts',
            content: `import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;`,
            language: 'typescript'
          },
          {
            path: 'src/store/counterSlice.ts',
            content: `import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0,
};

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;`,
            language: 'typescript'
          },
          {
            path: 'package.json',
            content: JSON.stringify({
              name: 'advanced-react-native-app',
              version: '1.0.0',
              main: 'App.tsx',
              scripts: {
                start: 'expo start',
                android: 'expo start --android',
                ios: 'expo start --ios',
                web: 'expo start --web',
                test: 'jest',
                lint: 'eslint src/**/*.{js,jsx,ts,tsx}'
              },
              dependencies: {
                expo: '~49.0.0',
                react: '18.2.0',
                'react-native': '0.72.6',
                '@react-navigation/native': '^6.1.7',
                '@react-navigation/bottom-tabs': '^6.5.8',
                '@react-navigation/native-stack': '^6.9.13',
                '@expo/vector-icons': '^13.0.0',
                '@reduxjs/toolkit': '^1.9.5',
                react: '^18.2.0',
                'react-redux': '^8.1.2'
              },
              devDependencies: {
                '@babel/core': '^7.20.0',
                '@types/react': '~18.2.14',
                typescript: '^5.1.3',
                '@types/jest': '^29.5.3',
                jest: '^29.6.2',
                eslint: '^8.45.0'
              }
            }, null, 2),
            language: 'json'
          }
        ],
        dependencies: ['expo', 'react', 'react-native', '@react-navigation/native', '@reduxjs/toolkit'],
        scripts: {
          start: 'expo start',
          build: 'expo build',
          test: 'jest',
          lint: 'eslint src/**/*.{js,jsx,ts,tsx}'
        },
        gitConfig: {
          initialize: true,
          branch: 'main'
        }
      },
      {
        id: 'web-app-advanced',
        name: 'Advanced Web Application',
        description: 'Modern React web app with routing, state management, API integration, and Git',
        type: 'web',
        files: [
          {
            path: 'src/App.tsx',
            content: `import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { fetchUsers } from './features/users/userSlice';
import './App.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="page">
      <h1>Welcome to Advanced Web App</h1>
      <p>Built with React, Redux Toolkit, and Git integration</p>
      <div className="feature-grid">
        <div className="feature-card" onClick={() => navigate('/dashboard')}>
          <h3>📊 Dashboard</h3>
          <p>View analytics and metrics</p>
        </div>
        <div className="feature-card" onClick={() => navigate('/users')}>
          <h3>👥 Users</h3>
          <p>Manage user accounts</p>
        </div>
        <div className="feature-card" onClick={() => navigate('/settings')}>
          <h3>⚙️ Settings</h3>
          <p>Configure application</p>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeProjects: 0,
    gitCommits: 0,
    buildStatus: '✅ Healthy'
  });

  useEffect(() => {
    // Simulate fetching metrics
    setMetrics({
      totalUsers: 1247,
      activeProjects: 23,
      gitCommits: 156,
      buildStatus: '✅ Healthy'
    });
  }, []);

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>{metrics.totalUsers}</h3>
          <p>Total Users</p>
        </div>
        <div className="metric-card">
          <h3>{metrics.activeProjects}</h3>
          <p>Active Projects</p>
        </div>
        <div className="metric-card">
          <h3>{metrics.gitCommits}</h3>
          <p>Git Commits</p>
        </div>
        <div className="metric-card">
          <h3>{metrics.buildStatus}</h3>
          <p>Build Status</p>
        </div>
      </div>
    </div>
  );
};

const Users: React.FC = () => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Developer' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Designer' },
  ];

  return (
    <div className="page">
      <h1>Users</h1>
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button className="btn-small">Edit</button>
                  <button className="btn-small danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Settings: React.FC = () => (
  <div className="page">
    <h1>Settings</h1>
    <div className="settings-form">
      <div className="form-group">
        <label>Application Name</label>
        <input type="text" defaultValue="Advanced Web App" />
      </div>
      <div className="form-group">
        <label>API Endpoint</label>
        <input type="text" defaultValue="https://api.example.com" />
      </div>
      <div className="form-group">
        <label>Enable Notifications</label>
        <input type="checkbox" defaultChecked />
      </div>
      <button className="btn-primary">Save Settings</button>
    </div>
  </div>
);

function AppLayout() {
  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-brand">
          <h2>Advanced Web App</h2>
        </div>
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Home
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Dashboard
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Users
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Settings
          </NavLink>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppLayout />
      </Router>
    </Provider>
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.nav-brand h2 {
  margin: 0;
  color: white;
  font-weight: 700;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: rgba(255,255,255,0.8);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  padding: 0.5rem 1rem;
  border-radius: 6px;
}

.nav-link:hover {
  color: white;
  background: rgba(255,255,255,0.1);
}

.nav-link.active {
  color: white;
  background: rgba(255,255,255,0.2);
}

.main-content {
  flex: 1;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 80px);
}

.page {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.page h1 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 2rem;
  font-weight: 700;
}

.page p {
  color: #7f8c8d;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.feature-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.feature-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.feature-card p {
  margin: 0;
  opacity: 0.9;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.metric-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
}

.metric-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
}

.metric-card p {
  margin: 0;
  opacity: 0.9;
}

.users-table {
  margin-top: 2rem;
  overflow-x: auto;
}

.users-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.users-table th,
.users-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.users-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.users-table tr:hover {
  background: #f8f9fa;
}

.btn-small {
  padding: 0.25rem 0.75rem;
  margin: 0 0.25rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.3s ease;
}

.btn-small:not(.danger) {
  background: #667eea;
  color: white;
}

.btn-small.danger {
  background: #e74c3c;
  color: white;
}

.btn-small:hover {
  opacity: 0.9;
}

.settings-form {
  max-width: 600px;
  margin-top: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: #667eea;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
  }
  
  .nav-links {
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }
  
  .main-content {
    padding: 1rem;
  }
  
  .page {
    padding: 1rem;
  }
  
  .feature-grid,
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}`,
            language: 'css'
          },
          {
            path: 'src/store/index.ts',
            content: `import { configureStore } from '@reduxjs/toolkit';
import usersReducer from './features/users/userSlice';

export const store = configureStore({
  reducer: {
    users: usersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;`,
            language: 'typescript'
          },
          {
            path: 'src/features/users/userSlice.ts',
            content: `import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface UsersState {
  users: User[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  status: 'idle',
  error: null,
};

export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/users');
  return (await response.json()) as User[];
});

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUser: (state, action: PayloadAction<User>) => {
      state.users.push(action.payload);
    },
    updateUser: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    deleteUser: (state, action: PayloadAction<number>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Something went wrong';
      });
  },
});

export const { addUser, updateUser, deleteUser } = userSlice.actions;
export default userSlice.reducer;`,
            language: 'typescript'
          },
          {
            path: 'package.json',
            content: JSON.stringify({
              name: 'advanced-web-app',
              version: '1.0.0',
              private: true,
              dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0',
                'react-router-dom': '^6.14.2',
                'react-redux': '^8.1.2',
                '@reduxjs/toolkit': '^1.9.5',
                'react-scripts': '5.0.1',
                typescript: '^4.9.5',
                '@types/react': '^18.2.15',
                '@types/react-dom': '^18.2.7',
                '@types/node': '^20.4.5'
              },
              scripts: {
                start: 'react-scripts start',
                build: 'react-scripts build',
                test: 'react-scripts test',
                eject: 'react-scripts eject',
                lint: 'eslint src/**/*.{js,jsx,ts,tsx}'
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
        dependencies: ['react', 'react-dom', 'react-router-dom', '@reduxjs/toolkit'],
        scripts: {
          start: 'react-scripts start',
          build: 'react-scripts build',
          test: 'react-scripts test',
          lint: 'eslint src/**/*.{js,jsx,ts,tsx}'
        },
        gitConfig: {
          initialize: true,
          branch: 'main'
        }
      },
      {
        id: 'nodejs-api-advanced',
        name: 'Advanced Node.js API',
        description: 'Production-ready Node.js API with Express, TypeScript, database, and CI/CD',
        type: 'node',
        files: [
          {
            path: 'src/server.ts',
            content: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { apiRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(compression()); // Compress responses
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } })); // Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter); // Apply rate limiting

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(\`🚀 Server running on port \${PORT}\`);
  logger.info(\`📊 Health check: http://localhost:\${PORT}/health\`);
  logger.info(\`📡 API endpoint: http://localhost:\${PORT}/api\`);
  logger.info(\`🌍 Environment: \${process.env.NODE_ENV || 'development'}\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;`,
            language: 'typescript'
          },
          {
            path: 'src/routes/index.ts',
            content: `import { Router } from 'express';
import { userRoutes } from './users';
import { authRoutes } from './auth';
import { projectRoutes } from './projects';
import { healthRoutes } from './health';

export const apiRoutes = Router();

// Mount route modules
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/projects', projectRoutes);
apiRoutes.use('/health', healthRoutes);

// API info endpoint
apiRoutes.get('/', (req, res) => {
  res.json({
    name: 'Advanced Node.js API',
    version: '1.0.0',
    description: 'Production-ready API built with AI Workspace',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      projects: '/api/projects',
      health: '/api/health'
    },
    features: [
      'TypeScript support',
      'Express.js framework',
      'Security middleware',
      'Rate limiting',
      'Logging',
      'Error handling',
      'Health checks'
    ],
    timestamp: new Date().toISOString()
  });
});`,
            language: 'typescript'
          },
          {
            path: 'src/middleware/errorHandler.ts',
            content: `import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = err;

  // Log error
  logger.error(\`Error \${statusCode}: \${message}\`);
  logger.error(err.stack);

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = 'Database operation failed';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input data';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    timestamp: new Date().toISOString()
  });
};`,
            language: 'typescript'
          },
          {
            path: 'src/utils/logger.ts',
            content: `import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Define which format to use depending on the environment
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => \`\${info.timestamp} \${info.level}: \${info.message}\`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels,
  format,
  transports,
});`,
            language: 'typescript'
          },
          {
            path: 'package.json',
            content: JSON.stringify({
              name: 'advanced-nodejs-api',
              version: '1.0.0',
              description: 'Production-ready Node.js API with TypeScript',
              main: 'dist/server.js',
              scripts: {
                start: 'node dist/server.js',
                dev: 'nodemon src/server.ts',
                build: 'tsc',
                clean: 'rm -rf dist',
                test: 'jest',
                'test:watch': 'jest --watch',
                lint: 'eslint src/**/*.ts',
                'lint:fix': 'eslint src/**/*.ts --fix',
                format: 'prettier --write src/**/*.ts',
                'format:check': 'prettier --check src/**/*.ts'
              },
              dependencies: {
                express: '^4.18.2',
                cors: '^2.8.5',
                helmet: '^7.0.0',
                morgan: '^1.10.0',
                compression: '^1.7.4',
                'express-rate-limit': '^6.8.1',
                dotenv: '^16.3.1',
                winston: '^3.10.0'
              },
              devDependencies: {
                '@types/express': '^4.17.17',
                '@types/cors': '^2.8.13',
                '@types/morgan': '^1.9.4',
                '@types/node': '^20.4.5',
                '@types/compression': '^1.7.2',
                '@types/express-rate-limit': '^6.7.0',
                'typescript': '^5.1.6',
                'ts-node': '^10.9.1',
                'nodemon': '^3.0.1',
                'jest': '^29.6.2',
                '@types/jest': '^29.5.3',
                'eslint': '^8.45.0',
                '@typescript-eslint/eslint-plugin': '^6.2.0',
                '@typescript-eslint/parser': '^6.2.0',
                'prettier': '^3.0.0'
              },
              engines: {
                node: '>=16.0.0'
              }
            }, null, 2),
            language: 'json'
          }
        ],
        dependencies: ['express', 'cors', 'helmet', 'morgan', 'compression', 'winston'],
        scripts: {
          start: 'node dist/server.js',
          dev: 'nodemon src/server.ts',
          build: 'tsc',
          test: 'jest',
          lint: 'eslint src/**/*.ts'
        },
        gitConfig: {
          initialize: true,
          branch: 'main'
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
    gitRemoteUrl?: string;
    gitCredentials?: {
      username: string;
      token: string;
    };
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
      tasks: [],
      aiContext: {
        currentTask: null,
        conversationHistory: [],
        projectKnowledge: [],
        userPreferences: {}
      }
    };

    try {
      // Apply template if provided
      if (options.templateId && this.templates.has(options.templateId)) {
        const template = this.templates.get(options.templateId)!;
        
        // Create files from template
        for (const templateFile of template.files) {
          const file: ProjectFile = {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            path: templateFile.path,
            content: templateFile.content,
            language: templateFile.language,
            lastModified: new Date(),
            size: templateFile.content.length
          };
          project.files.push(file);
        }

        // Initialize Git if template specifies it
        if (template.gitConfig?.initialize || options.initializeGit) {
          const gitRepoId = await gitManager.initRepository(
            options.name,
            template.files.map(f => ({
              path: f.path,
              content: f.content
            }))
          );

          // Set up Git integration
          const gitIntegration: GitIntegration = {
            repositoryId: gitRepoId,
            branch: template.gitConfig?.branch || 'main',
            status: 'synced',
            commitCount: 1,
            untrackedFiles: 0,
            modifiedFiles: 0,
            isCloned: false
          };

          // Add remote URL if provided
          if (options.gitRemoteUrl) {
            try {
              await gitManager.addRemote(gitRepoId, 'origin', options.gitRemoteUrl);
              gitIntegration.remoteUrl = options.gitRemoteUrl;
              gitIntegration.status = 'disconnected';
            } catch (error) {
              console.warn('Failed to add remote URL:', error);
            }
          }

          this.gitIntegrations.set(projectId, gitIntegration);
        }
      }

      // Store project
      this.projects.set(projectId, project);
      await this.saveProjects();
      await this.saveGitIntegrations();

      // Initialize project index
      await this.initializeProjectIndex(projectId);

      return project;
    } catch (error) {
      // Clean up on failure
      this.projects.delete(projectId);
      this.gitIntegrations.delete(projectId);
      throw error;
    }
  }

  async cloneGitProject(options: {
    name: string;
    description: string;
    gitUrl: string;
    branch?: string;
    credentials?: {
      username: string;
      token: string;
    };
  }): Promise<Project> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Clone repository
      const repoId = await gitManager.cloneRepository(options.gitUrl, {
        name: options.name,
        branch: options.branch,
        credentials: options.credentials
      });

      // Get repository files
      const files = await gitManager.listFiles(repoId);
      const projectFiles: ProjectFile[] = [];

      for (const file of files) {
        if (file.type === 'file') {
          try {
            const content = await gitManager.getFileContent(repoId, file.path);
            const projectFile: ProjectFile = {
              id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              path: file.path,
              content,
              language: this.detectLanguage(file.path),
              lastModified: new Date(),
              size: file.size || content.length
            };
            projectFiles.push(projectFile);
          } catch (error) {
            console.warn(`Failed to read file ${file.path}:`, error);
          }
        }
      }

      // Create project
      const project: Project = {
        id: projectId,
        name: options.name,
        description: options.description,
        type: this.detectProjectType(projectFiles),
        status: 'active',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        files: projectFiles,
        tasks: [],
        aiContext: {
          currentTask: null,
          conversationHistory: [],
          projectKnowledge: [],
          userPreferences: {}
        }
      };

      // Set up Git integration
      const gitIntegration: GitIntegration = {
        repositoryId: repoId,
        branch: options.branch || 'main',
        status: 'synced',
        commitCount: 0,
        untrackedFiles: 0,
        modifiedFiles: 0,
        remoteUrl: options.gitUrl,
        isCloned: true
      };

      // Get commit history
      try {
        const commits = await gitManager.getCommitHistory(repoId, { depth: 50 });
        gitIntegration.commitCount = commits.length;
        if (commits.length > 0) {
          gitIntegration.lastCommit = commits[0].oid;
        }
      } catch (error) {
        console.warn('Failed to get commit history:', error);
      }

      // Store project and Git integration
      this.projects.set(projectId, project);
      this.gitIntegrations.set(projectId, gitIntegration);
      
      await this.saveProjects();
      await this.saveGitIntegrations();
      await this.initializeProjectIndex(projectId);

      return project;
    } catch (error) {
      throw new Error(\`Failed to clone Git project: \${error.message}\`);
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'dockerfile': 'dockerfile'
    };
    return languageMap[ext || ''] || 'text';
  }

  private detectProjectType(files: ProjectFile[]): Project['type'] {
    const hasPackageJson = files.some(f => f.path === 'package.json');
    const hasRequirements = files.some(f => f.path.includes('requirements.txt'));
    const hasCargo = files.some(f => f.path === 'Cargo.toml');
    const hasPom = files.some(f => f.path === 'pom.xml');
    const hasGemfile = files.some(f => f.path === 'Gemfile');

    if (hasPackageJson) {
      const packageJson = files.find(f => f.path === 'package.json');
      if (packageJson) {
        try {
          const pkg = JSON.parse(packageJson.content);
          if (pkg.dependencies?.react || pkg.dependencies?.['react-native']) {
            return 'react-native';
          }
          if (pkg.dependencies?.react || pkg.dependencies?.['react-dom']) {
            return 'web';
          }
          if (pkg.dependencies?.express || pkg.dependencies?.['@types/node']) {
            return 'node';
          }
        } catch (error) {
          // Ignore JSON parse errors
        }
      }
      return 'web';
    }

    if (hasRequirements) return 'python';
    if (hasCargo) return 'rust';
    if (hasPom) return 'java';
    if (hasGemfile) return 'ruby';

    return 'web'; // Default
  }

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const gitIntegration = this.gitIntegrations.get(projectId);
    
    let linesOfCode = 0;
    for (const file of project.files) {
      if (this.isCodeFile(file.path)) {
        linesOfCode += file.content.split('\\n').length;
      }
    }

    const completedTasks = project.tasks.filter(t => t.status === 'completed').length;
    const activeTasks = project.tasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length;

    let gitStatus: ProjectStats['gitStatus'] = 'clean';
    if (gitIntegration) {
      if (gitIntegration.modifiedFiles > 0) {
        gitStatus = 'modified';
      } else if (gitIntegration.untrackedFiles > 0) {
        gitStatus = 'untracked';
      }
    }

    const aiInteractions = project.aiContext.conversationHistory.length;

    return {
      totalFiles: project.files.length,
      linesOfCode,
      lastActivity: new Date(project.updatedAt),
      tasksCompleted: completedTasks,
      activeTasks,
      gitCommits: gitIntegration?.commitCount || 0,
      gitBranches: gitIntegration ? await this.getBranchCount(projectId) : 0,
      gitStatus,
      aiInteractions,
      repositorySize: this.calculateRepositorySize(project.files)
    };
  }

  private isCodeFile(filePath: string): boolean {
    const codeExtensions = [
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'sh', 'sql'
    ];
    const ext = filePath.split('.').pop()?.toLowerCase();
    return codeExtensions.includes(ext || '');
  }

  private async getBranchCount(projectId: string): Promise<number> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) {
      return 0;
    }

    try {
      const branches = await gitManager.listBranches(gitIntegration.repositoryId);
      return branches.length;
    } catch (error) {
      console.warn('Failed to get branch count:', error);
      return 0;
    }
  }

  private calculateRepositorySize(files: ProjectFile[]): number {
    return files.reduce((total, file) => total + (file.size || file.content.length), 0);
  }

  async syncGitStatus(projectId: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) {
      return;
    }

    try {
      const status = await gitManager.getStatus(gitIntegration.repositoryId);
      
      let untrackedFiles = 0;
      let modifiedFiles = 0;

      for (const fileStatus of status) {
        if (fileStatus.status === 'untracked') {
          untrackedFiles++;
        } else if (fileStatus.status === 'modified' || fileStatus.status === 'added') {
          modifiedFiles++;
        }
      }

      gitIntegration.untrackedFiles = untrackedFiles;
      gitIntegration.modifiedFiles = modifiedFiles;

      if (untrackedFiles === 0 && modifiedFiles === 0) {
        gitIntegration.status = 'synced';
      } else {
        gitIntegration.status = 'diverged';
      }

      await this.saveGitIntegrations();
    } catch (error) {
      console.warn('Failed to sync Git status:', error);
    }
  }

  async commitChanges(projectId: string, message: string, author?: {
    name: string;
    email: string;
  }): Promise<string> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) {
      throw new Error('No Git repository associated with this project');
    }

    try {
      // Stage all changes
      await gitManager.stageAll(gitIntegration.repositoryId);

      // Create commit
      const commitId = await gitManager.commit(gitIntegration.repositoryId, message, author);

      // Update integration
      gitIntegration.commitCount++;
      gitIntegration.lastCommit = commitId;
      gitIntegration.modifiedFiles = 0;
      gitIntegration.untrackedFiles = 0;
      gitIntegration.status = 'synced';

      await this.saveGitIntegrations();

      // Update project timestamp
      const project = this.projects.get(projectId);
      if (project) {
        project.updatedAt = new Date();
        await this.saveProjects();
      }

      return commitId;
    } catch (error) {
      throw new Error(\`Failed to commit changes: \${error.message}\`);
    }
  }

  async pushChanges(projectId: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) {
      throw new Error('No Git repository associated with this project');
    }

    try {
      await gitManager.push(gitIntegration.repositoryId);
      gitIntegration.status = 'synced';
      await this.saveGitIntegrations();
    } catch (error) {
      throw new Error(\`Failed to push changes: \${error.message}\`);
    }
  }

  async pullChanges(projectId: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) {
      throw new Error('No Git repository associated with this project');
    }

    try {
      await gitManager.pull(gitIntegration.repositoryId);
      
      // Refresh project files
      await this.refreshProjectFiles(projectId);
      
      gitIntegration.status = 'synced';
      await this.saveGitIntegrations();
    } catch (error) {
      throw new Error(\`Failed to pull changes: \${error.message}\`);
    }
  }

  private async refreshProjectFiles(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    const gitIntegration = this.gitIntegrations.get(projectId);
    
    if (!project || !gitIntegration?.repositoryId) {
      return;
    }

    try {
      const files = await gitManager.listFiles(gitIntegration.repositoryId);
      const updatedFiles: ProjectFile[] = [];

      for (const file of files) {
        if (file.type === 'file') {
          try {
            const content = await gitManager.getFileContent(gitIntegration.repositoryId, file.path);
            const existingFile = project.files.find(f => f.path === file.path);
            
            if (existingFile) {
              existingFile.content = content;
              existingFile.lastModified = new Date();
              existingFile.size = file.size || content.length;
              updatedFiles.push(existingFile);
            } else {
              const newFile: ProjectFile = {
                id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                path: file.path,
                content,
                language: this.detectLanguage(file.path),
                lastModified: new Date(),
                size: file.size || content.length
              };
              updatedFiles.push(newFile);
            }
          } catch (error) {
            console.warn(\`Failed to read file \${file.path}:\`, error);
          }
        }
      }

      project.files = updatedFiles;
      project.updatedAt = new Date();
      
      await this.saveProjects();
    } catch (error) {
      console.warn('Failed to refresh project files:', error);
    }
  }

  async createBranch(projectId: string, branchName: string, startPoint?: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) {
      throw new Error('No Git repository associated with this project');
    }

    try {
      await gitManager.createBranch(gitIntegration.repositoryId, branchName, startPoint);
    } catch (error) {
      throw new Error(\`Failed to create branch: \${error.message}\`);
    }
  }

  async switchBranch(projectId: string, branchName: string): Promise<void> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) {
      throw new Error('No Git repository associated with this project');
    }

    try {
      await gitManager.switchBranch(gitIntegration.repositoryId, branchName);
      gitIntegration.branch = branchName;
      await this.saveGitIntegrations();

      // Refresh project files after branch switch
      await this.refreshProjectFiles(projectId);
    } catch (error) {
      throw new Error(\`Failed to switch branch: \${error.message}\`);
    }
  }

  async getBranches(projectId: string): Promise<string[]> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) {
      return [];
    }

    try {
      return await gitManager.listBranches(gitIntegration.repositoryId);
    } catch (error) {
      console.warn('Failed to get branches:', error);
      return [];
    }
  }

  async getCommitHistory(projectId: string, options: {
    depth?: number;
    since?: Date;
  } = {}): Promise<Array<{
    oid: string;
    message: string;
    author: {
      name: string;
      email: string;
      timestamp: number;
    };
    date: Date;
  }>> {
    const gitIntegration = this.gitIntegrations.get(projectId);
    if (!gitIntegration?.repositoryId) {
      return [];
    }

    try {
      const commits = await gitManager.getCommitHistory(gitIntegration.repositoryId, options);
      return commits.map(commit => ({
        ...commit,
        date: new Date(commit.author.timestamp * 1000)
      }));
    } catch (error) {
      console.warn('Failed to get commit history:', error);
      return [];
    }
  }

  getGitIntegration(projectId: string): GitIntegration | undefined {
    return this.gitIntegrations.get(projectId);
  }

  getTemplates(): ProjectTemplate[] {
    return Array.from(this.templates.values());
  }

  async deleteProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    const gitIntegration = this.gitIntegrations.get(projectId);

    try {
      // Delete Git repository if it exists
      if (gitIntegration?.repositoryId) {
        await gitManager.deleteRepository(gitIntegration.repositoryId);
      }

      // Delete project
      this.projects.delete(projectId);
      this.gitIntegrations.delete(projectId);

      await this.saveProjects();
      await this.saveGitIntegrations();

      // Delete project index
      try {
        await localVectorSearch.deleteIndex(\`project_\${projectId}\`);
      } catch (error) {
        console.warn('Failed to delete project index:', error);
      }
    } catch (error) {
      throw new Error(\`Failed to delete project: \${error.message}\`);
    }
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(projectId: string): Promise<Project | undefined> {
    return this.projects.get(projectId);
  }
}

export const enhancedProjectManager = new EnhancedProjectManager();