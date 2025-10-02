import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../database/schema';
import type { Project, ChatMessage, Todo, Terminal, FileEntry } from '../database/schema';

interface ProjectContextValue {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  projectChats: ChatMessage[];
  projectTodos: Todo[];
  projectTerminals: Terminal[];
  projectFiles: FileEntry[];
  isLoading: boolean;
  error: string | null;
  refreshProjectData: () => Promise<void>;
  addChat: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<ChatMessage>;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Todo>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  addTerminal: (terminal: Omit<Terminal, 'id' | 'createdAt'>) => Promise<Terminal>;
  closeTerminal: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [projectChats, setProjectChats] = useState<ChatMessage[]>([]);
  const [projectTodos, setProjectTodos] = useState<Todo[]>([]);
  const [projectTerminals, setProjectTerminals] = useState<Terminal[]>([]);
  const [projectFiles, setProjectFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjectData = async (projectId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const [chats, todos, terminals, files] = await Promise.all([
        db.chats.where('projectId').equals(projectId).sortBy('timestamp'),
        db.todos.where('projectId').equals(projectId).sortBy('createdAt'),
        db.terminals.where('projectId').equals(projectId).toArray(),
        db.files.where('projectId').equals(projectId).toArray()
      ]);

      setProjectChats(chats);
      setProjectTodos(todos);
      setProjectTerminals(terminals);
      setProjectFiles(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentProject = (project: Project | null) => {
    setCurrentProjectState(project);
    if (project) {
      loadProjectData(project.id);
    } else {
      setProjectChats([]);
      setProjectTodos([]);
      setProjectTerminals([]);
      setProjectFiles([]);
    }
  };

  const refreshProjectData = async () => {
    if (currentProject) {
      await loadProjectData(currentProject.id);
    }
  };

  const addChat = async (messageData: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> => {
    if (!currentProject) throw new Error('No project selected');

    const message: ChatMessage = {
      ...messageData,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: currentProject.id,
      timestamp: new Date()
    };

    await db.chats.add(message);
    setProjectChats(prev => [...prev, message]);
    return message;
  };

  const addTodo = async (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo> => {
    if (!currentProject) throw new Error('No project selected');

    const todo: Todo = {
      ...todoData,
      id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: currentProject.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.todos.add(todo);
    setProjectTodos(prev => [...prev, todo]);
    return todo;
  };

  const updateTodo = async (id: string, updates: Partial<Todo>): Promise<void> => {
    await db.todos.update(id, { ...updates, updatedAt: new Date() });
    setProjectTodos(prev =>
      prev.map(todo => (todo.id === id ? { ...todo, ...updates, updatedAt: new Date() } : todo))
    );
  };

  const addTerminal = async (terminalData: Omit<Terminal, 'id' | 'createdAt'>): Promise<Terminal> => {
    if (!currentProject) throw new Error('No project selected');

    const terminal: Terminal = {
      ...terminalData,
      id: `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: currentProject.id,
      createdAt: new Date()
    };

    await db.terminals.add(terminal);
    setProjectTerminals(prev => [...prev, terminal]);
    return terminal;
  };

  const closeTerminal = async (id: string): Promise<void> => {
    await db.terminals.update(id, { isActive: false });
    setProjectTerminals(prev => prev.filter(term => term.id !== id));
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        projectChats,
        projectTodos,
        projectTerminals,
        projectFiles,
        isLoading,
        error,
        refreshProjectData,
        addChat,
        addTodo,
        updateTodo,
        addTerminal,
        closeTerminal
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
