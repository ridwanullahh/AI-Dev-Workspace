import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  theme?: 'vs-dark' | 'vs-light' | 'hc-black';
  readOnly?: boolean;
  height?: number;
  options?: any;
}

interface MonacoInstance {
  editor: {
    create: (container: HTMLElement, options: any) => any;
    defineTheme: (name: string, theme: any) => void;
  };
  languages: {
    register: (language: { id: string }) => void;
    setMonarchTokensProvider: (id: string, provider: any) => void;
    setLanguageConfiguration: (id: string, config: any) => void;
  };
}

declare global {
  interface Window {
    monaco: MonacoInstance;
    require: any;
  }
}

export default function MonacoEditor({
  value,
  language,
  onChange,
  theme = 'vs-dark',
  readOnly = false,
  height = 400,
  options = {}
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width } = Dimensions.get('window');

  // Load Monaco Editor
  useEffect(() => {
    const loadMonaco = async () => {
      try {
        // Check if Monaco is already loaded
        if (window.monaco) {
          initializeEditor();
          return;
        }

        // Load Monaco from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js';
        script.onload = () => {
          window.require.config({ 
            paths: { 
              vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' 
            } 
          });
          
          window.require(['vs/editor/editor.main'], () => {
            initializeEditor();
          });
        };
        script.onerror = () => {
          setError('Failed to load Monaco Editor');
          setIsLoading(false);
        };
        
        document.head.appendChild(script);
      } catch (err) {
        setError('Failed to initialize Monaco Editor');
        setIsLoading(false);
      }
    };

    const initializeEditor = () => {
      if (!containerRef.current || !window.monaco) return;

      try {
        // Define custom dark theme
        window.monaco.editor.defineTheme('ai-workspace-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
            { token: 'keyword', foreground: '00D4FF', fontStyle: 'bold' },
            { token: 'string', foreground: '10B981' },
            { token: 'number', foreground: 'F59E0B' },
            { token: 'type', foreground: 'EF4444' },
            { token: 'function', foreground: 'A78BFA' },
          ],
          colors: {
            'editor.background': '#111827',
            'editor.foreground': '#F9FAFB',
            'editor.lineHighlightBackground': '#1F2937',
            'editor.selectionBackground': '#374151',
            'editorCursor.foreground': '#00D4FF',
            'editorLineNumber.foreground': '#6B7280',
            'editorLineNumber.activeForeground': '#00D4FF',
          }
        });

        // Create editor instance
        editorRef.current = window.monaco.editor.create(containerRef.current, {
          value: value,
          language: language,
          theme: theme === 'vs-dark' ? 'ai-workspace-dark' : theme,
          readOnly: readOnly,
          fontSize: 14,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          minimap: { enabled: width > 768 },
          automaticLayout: true,
          wordWrap: 'on',
          contextmenu: true,
          selectOnLineNumbers: true,
          lineDecorationsWidth: 20,
          folding: true,
          foldingHighlight: true,
          showFoldingControls: 'always',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
            highlightActiveIndentation: true,
          },
          ...options
        });

        // Listen for content changes
        editorRef.current.onDidChangeModelContent(() => {
          const newValue = editorRef.current.getValue();
          onChange(newValue);
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error creating Monaco editor:', err);
        setError('Failed to create editor');
        setIsLoading(false);
      }
    };

    loadMonaco();

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  // Update language when prop changes
  useEffect(() => {
    if (editorRef.current && window.monaco) {
      const model = editorRef.current.getModel();
      if (model) {
        window.monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  if (error) {
    return (
      <View style={{ 
        height, 
        backgroundColor: '#1F2937', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#374151'
      }}>
        <Text style={{ color: '#EF4444', fontSize: 16, textAlign: 'center' }}>
          {error}
        </Text>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
          Please check your internet connection and try refreshing the page.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ 
        height, 
        backgroundColor: '#1F2937', 
        justifyContent: 'center', 
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#374151'
      }}>
        <ActivityIndicator size="large" color="#00D4FF" />
        <Text style={{ color: '#9CA3AF', marginTop: 16 }}>Loading Monaco Editor...</Text>
      </View>
    );
  }

  return (
    <View style={{ height, borderRadius: 8, overflow: 'hidden' }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '8px',
        }} 
      />
    </View>
  );
}

// Monaco Editor utilities
export const monacoLanguages = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  csharp: 'csharp',
  cpp: 'cpp',
  html: 'html',
  css: 'css',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  markdown: 'markdown',
  sql: 'sql',
  php: 'php',
  go: 'go',
  rust: 'rust',
  swift: 'swift',
  kotlin: 'kotlin',
  dart: 'dart',
  shell: 'shell',
  dockerfile: 'dockerfile',
};

export const getLanguageFromFile = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mapping: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cs: 'csharp',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    php: 'php',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    kts: 'kotlin',
    dart: 'dart',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',
    dockerfile: 'dockerfile',
  };

  return mapping[ext || ''] || 'plaintext';
};