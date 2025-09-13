import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { ProjectFile } from '../../services/types';

interface EditorTab {
  id: string;
  file: ProjectFile;
  isModified: boolean;
}

export default function CodeScreen() {
  const insets = useSafeAreaInsets();
  const { 
    currentProject, 
    projects, 
    setCurrentProject,
    addFile,
    updateFile,
    deleteFile,
    searchContent,
    showAlert
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [fileTree, setFileTree] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    '🚀 AI Development Workspace Terminal',
    '💡 Type "help" for available commands',
    ''
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  // File tree management
  useEffect(() => {
    if (currentProject) {
      buildFileTree();
    }
  }, [currentProject]);

  const buildFileTree = () => {
    if (!currentProject) return;

    const tree = [];
    const folders = new Map();

    for (const file of currentProject.files) {
      const pathParts = file.path.split('/');
      let currentLevel = tree;
      let currentPath = '';

      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + pathParts[i];
        
        if (!folders.has(currentPath)) {
          const folder = {
            id: `folder_${currentPath}`,
            name: pathParts[i],
            type: 'folder',
            path: currentPath,
            children: [],
            isExpanded: true
          };
          folders.set(currentPath, folder);
          currentLevel.push(folder);
          currentLevel = folder.children;
        } else {
          currentLevel = folders.get(currentPath).children;
        }
      }

      currentLevel.push({
        id: file.id,
        name: file.name,
        type: 'file',
        path: file.path,
        file: file,
        language: file.language
      });
    }

    setFileTree(tree);
  };

  // Tab management
  const openFile = (file: ProjectFile) => {
    const existingTab = tabs.find(tab => tab.file.id === file.id);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }

    const newTab: EditorTab = {
      id: `tab_${file.id}`,
      file: file,
      isModified: false
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTab(newTab.id);
  };

  const closeTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isModified) {
      showAlert('Unsaved Changes', 'Save your changes before closing this file.');
      return;
    }

    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTab === tabId) {
      const remainingTabs = tabs.filter(t => t.id !== tabId);
      setActiveTab(remainingTabs.length > 0 ? remainingTabs[0].id : null);
    }
  };

  const saveFile = async (tabId: string, content: string) => {
    if (!currentProject) return;

    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      await updateFile(currentProject.id, tab.file.id, { content });
      
      // Update tab state
      setTabs(prev => prev.map(t => 
        t.id === tabId 
          ? { ...t, isModified: false, file: { ...t.file, content } }
          : t
      ));

      addTerminalOutput(`💾 Saved: ${tab.file.path}`);
    } catch (error) {
      addTerminalOutput(`❌ Failed to save: ${tab.file.path}`);
    }
  };

  // File operations
  const createNewFile = async () => {
    if (!currentProject || !newFileName.trim()) return;

    try {
      const language = getLanguageFromPath(newFileName);
      const newFile = await addFile(currentProject.id, {
        path: newFileName,
        name: newFileName.split('/').pop() || newFileName,
        content: newFileContent,
        language,
        size: newFileContent.length,
        isGenerated: false
      });

      buildFileTree();
      openFile(newFile);
      setShowNewFileModal(false);
      setNewFileName('');
      setNewFileContent('');
      addTerminalOutput(`✅ Created: ${newFileName}`);
    } catch (error) {
      addTerminalOutput(`❌ Failed to create: ${newFileName}`);
    }
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml'
    };
    return langMap[ext || ''] || 'text';
  };

  // Search functionality
  const performSearch = async () => {
    if (!searchQuery.trim() || !currentProject) return;

    try {
      const results = await searchContent(searchQuery, currentProject.id);
      setSearchResults(results);
      addTerminalOutput(`🔍 Found ${results.length} results for "${searchQuery}"`);
    } catch (error) {
      addTerminalOutput(`❌ Search failed: ${searchQuery}`);
    }
  };

  // Terminal functionality
  const addTerminalOutput = (output: string) => {
    setTerminalOutput(prev => [...prev, output]);
  };

  const executeCommand = () => {
    if (!terminalInput.trim()) return;

    const command = terminalInput.trim().toLowerCase();
    addTerminalOutput(`> ${terminalInput}`);

    switch (command) {
      case 'help':
        addTerminalOutput('Available commands:');
        addTerminalOutput('  help    - Show this help');
        addTerminalOutput('  clear   - Clear terminal');
        addTerminalOutput('  ls      - List files');
        addTerminalOutput('  build   - Build project');
        addTerminalOutput('  deploy  - Deploy project');
        break;
      
      case 'clear':
        setTerminalOutput(['🚀 AI Development Workspace Terminal']);
        break;
      
      case 'ls':
        if (currentProject) {
          addTerminalOutput(`Files in ${currentProject.name}:`);
          currentProject.files.forEach(file => {
            addTerminalOutput(`  ${file.path}`);
          });
        }
        break;
      
      case 'build':
        addTerminalOutput('🔨 Building project...');
        setTimeout(() => addTerminalOutput('✅ Build completed successfully!'), 1000);
        break;
      
      case 'deploy':
        addTerminalOutput('🚀 Deploying to production...');
        setTimeout(() => addTerminalOutput('✅ Deployment successful!'), 2000);
        break;
      
      default:
        addTerminalOutput(`Command not found: ${command}`);
    }

    setTerminalInput('');
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <View style={{ flex: 1, backgroundColor: '#111827' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 15,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#374151',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: '#F9FAFB', fontSize: 20, fontWeight: 'bold' }}>
              Code Editor
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 2 }}>
              {currentProject ? currentProject.name : 'No project selected'}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setShowNewFileModal(true)}
              style={{
                backgroundColor: '#00D4FF',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                marginRight: 10,
              }}
              disabled={!currentProject}
            >
              <MaterialIcons name="add" size={20} color="#111827" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setIsTerminalOpen(!isTerminalOpen)}
              style={{
                backgroundColor: isTerminalOpen ? '#00D4FF' : '#374151',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <MaterialIcons 
                name="terminal" 
                size={20} 
                color={isTerminalOpen ? '#111827' : '#9CA3AF'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginTop: 15,
          backgroundColor: '#374151',
          borderRadius: 8,
          paddingHorizontal: 12
        }}>
          <MaterialIcons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={{
              flex: 1,
              color: '#F9FAFB',
              paddingVertical: 8,
              paddingHorizontal: 12,
              fontSize: 14
            }}
            placeholder="Search in code..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={performSearch}
          />
        </View>
      </LinearGradient>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* File Tree Sidebar */}
        <View style={{ 
          width: 250, 
          backgroundColor: '#1F2937', 
          borderRightWidth: 1, 
          borderRightColor: '#374151' 
        }}>
          <View style={{ padding: 16 }}>
            <TouchableOpacity
              onPress={() => {
                // Project selector would go here
                showAlert('Project Selector', 'Select a different project to work on.');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#374151',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16
              }}
            >
              <Text style={{ color: '#F9FAFB', fontWeight: '600' }}>
                {currentProject?.name || 'Select Project'}
              </Text>
              <MaterialIcons name="expand-more" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 400 }}>
              {renderFileTree(fileTree)}
            </ScrollView>
          </View>
        </View>

        {/* Editor Area */}
        <View style={{ flex: 1 }}>
          {/* Tabs */}
          {tabs.length > 0 && (
            <ScrollView 
              horizontal 
              style={{ 
                backgroundColor: '#374151', 
                borderBottomWidth: 1, 
                borderBottomColor: '#4B5563' 
              }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {tabs.map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: activeTab === tab.id ? '#1F2937' : 'transparent',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    marginRight: 4,
                    marginTop: 4
                  }}
                >
                  <Text style={{ 
                    color: activeTab === tab.id ? '#F9FAFB' : '#9CA3AF',
                    fontSize: 13,
                    marginRight: 8
                  }}>
                    {tab.file.name}
                  </Text>
                  {tab.isModified && (
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#00D4FF',
                      marginRight: 8
                    }} />
                  )}
                  <TouchableOpacity onPress={() => closeTab(tab.id)}>
                    <MaterialIcons name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Editor Content */}
          <View style={{ flex: 1, backgroundColor: '#111827' }}>
            {activeTabData ? (
              <CodeEditor
                file={activeTabData.file}
                onContentChange={(content) => {
                  setTabs(prev => prev.map(t => 
                    t.id === activeTab 
                      ? { ...t, isModified: t.file.content !== content }
                      : t
                  ));
                }}
                onSave={(content) => saveFile(activeTab!, content)}
              />
            ) : (
              <View style={{ 
                flex: 1, 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: 40
              }}>
                <MaterialIcons name="code" size={64} color="#4B5563" />
                <Text style={{ 
                  color: '#9CA3AF', 
                  fontSize: 18, 
                  marginTop: 16,
                  textAlign: 'center'
                }}>
                  {currentProject ? 'Open a file to start coding' : 'Select a project to begin'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Terminal */}
      {isTerminalOpen && (
        <View style={{ 
          height: 200, 
          backgroundColor: '#000000', 
          borderTopWidth: 1, 
          borderTopColor: '#374151' 
        }}>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {terminalOutput.map((line, index) => (
              <Text key={index} style={{ 
                color: '#00FF00', 
                fontFamily: 'monospace', 
                fontSize: 12,
                marginBottom: 2
              }}>
                {line}
              </Text>
            ))}
          </ScrollView>
          
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: '#374151'
          }}>
            <Text style={{ color: '#00FF00', fontFamily: 'monospace', marginRight: 8 }}>
              $
            </Text>
            <TextInput
              style={{
                flex: 1,
                color: '#00FF00',
                fontFamily: 'monospace',
                fontSize: 14
              }}
              value={terminalInput}
              onChangeText={setTerminalInput}
              onSubmitEditing={executeCommand}
              placeholder="Enter command..."
              placeholderTextColor="#4B5563"
            />
          </View>
        </View>
      )}

      {/* New File Modal */}
      <Modal visible={showNewFileModal} transparent animationType="slide">
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.8)', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <View style={{ 
            backgroundColor: '#1F2937', 
            padding: 24, 
            borderRadius: 12, 
            width: '80%',
            maxWidth: 400
          }}>
            <Text style={{ 
              color: '#F9FAFB', 
              fontSize: 18, 
              fontWeight: 'bold', 
              marginBottom: 16 
            }}>
              Create New File
            </Text>
            
            <TextInput
              style={{
                backgroundColor: '#374151',
                color: '#F9FAFB',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 16
              }}
              placeholder="File path (e.g., src/components/Button.tsx)"
              placeholderTextColor="#6B7280"
              value={newFileName}
              onChangeText={setNewFileName}
            />
            
            <TextInput
              style={{
                backgroundColor: '#374151',
                color: '#F9FAFB',
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 14,
                height: 120,
                textAlignVertical: 'top'
              }}
              placeholder="Initial content (optional)"
              placeholderTextColor="#6B7280"
              value={newFileContent}
              onChangeText={setNewFileContent}
              multiline
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => setShowNewFileModal(false)}
                style={{
                  backgroundColor: '#374151',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  flex: 1,
                  marginRight: 8
                }}
              >
                <Text style={{ color: '#9CA3AF', textAlign: 'center', fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={createNewFile}
                style={{
                  backgroundColor: '#00D4FF',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  flex: 1,
                  marginLeft: 8
                }}
                disabled={!newFileName.trim()}
              >
                <Text style={{ color: '#111827', textAlign: 'center', fontWeight: '600' }}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  // Render file tree recursively
  function renderFileTree(nodes: any[], depth = 0): React.ReactNode {
    return nodes.map(node => (
      <View key={node.id} style={{ marginLeft: depth * 16 }}>
        <TouchableOpacity
          onPress={() => {
            if (node.type === 'file') {
              openFile(node.file);
            }
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 4,
            marginBottom: 2
          }}
        >
          <MaterialIcons 
            name={node.type === 'folder' ? 'folder' : 'description'} 
            size={16} 
            color={node.type === 'folder' ? '#F59E0B' : '#9CA3AF'}
            style={{ marginRight: 8 }}
          />
          <Text style={{ 
            color: '#F9FAFB', 
            fontSize: 13,
            flex: 1
          }}>
            {node.name}
          </Text>
        </TouchableOpacity>
        
        {node.children && node.isExpanded && renderFileTree(node.children, depth + 1)}
      </View>
    ));
  }
}

// Simple code editor component
function CodeEditor({ 
  file, 
  onContentChange, 
  onSave 
}: { 
  file: any;
  onContentChange: (content: string) => void;
  onSave: (content: string) => void;
}) {
  const [content, setContent] = useState(file.content);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);

  useEffect(() => {
    const lines = content.split('\n');
    setLineNumbers(Array.from({ length: lines.length }, (_, i) => i + 1));
  }, [content]);

  useEffect(() => {
    setContent(file.content);
  }, [file.id]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onContentChange(newContent);
  };

  const handleSave = () => {
    onSave(content);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Editor Toolbar */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: '#374151',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#4B5563'
      }}>
        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
          {file.language} • {file.path}
        </Text>
        
        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: '#00D4FF',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 4
          }}
        >
          <Text style={{ color: '#111827', fontSize: 12, fontWeight: '600' }}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      {/* Editor Content */}
      <ScrollView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row' }}>
          {/* Line Numbers */}
          <View style={{ 
            backgroundColor: '#1F2937', 
            paddingVertical: 16,
            paddingHorizontal: 8,
            borderRightWidth: 1,
            borderRightColor: '#374151',
            minWidth: 50
          }}>
            {lineNumbers.map(lineNum => (
              <Text key={lineNum} style={{ 
                color: '#6B7280', 
                fontSize: 12, 
                fontFamily: 'monospace',
                lineHeight: 20,
                textAlign: 'right'
              }}>
                {lineNum}
              </Text>
            ))}
          </View>

          {/* Code Content */}
          <View style={{ flex: 1 }}>
            <TextInput
              style={{
                color: '#F9FAFB',
                fontSize: 14,
                fontFamily: 'monospace',
                padding: 16,
                lineHeight: 20,
                textAlignVertical: 'top'
              }}
              value={content}
              onChangeText={handleContentChange}
              multiline
              scrollEnabled={false}
              placeholder="Start coding..."
              placeholderTextColor="#6B7280"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}