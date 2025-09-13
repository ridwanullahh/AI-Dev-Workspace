import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import BottomSheet from './BottomSheet';

interface ProjectSelectorProps {
  visible: boolean;
  onClose: () => void;
  onProjectSelect: (projectId: string) => void;
}

export default function ProjectSelector({
  visible,
  onClose,
  onProjectSelect,
}: ProjectSelectorProps) {
  const { projects, currentProject, createProject } = useWorkspace();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedType, setSelectedType] = useState<'react-native' | 'web' | 'node'>('react-native');

  const projectTypes = [
    { id: 'react-native', name: 'React Native App', icon: 'phone-android', description: 'Mobile application' },
    { id: 'web', name: 'Web App', icon: 'web', description: 'Web application' },
    { id: 'node', name: 'Node.js API', icon: 'dns', description: 'Backend service' },
  ];

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter a project name');
      } else {
        Alert.alert('Error', 'Please enter a project name');
      }
      return;
    }

    try {
      const project = await createProject({
        name: newProjectName,
        description: newProjectDescription || `A new ${selectedType} project`,
        type: selectedType as any,
      });
      
      onProjectSelect(project.id);
      setShowCreateForm(false);
      setNewProjectName('');
      setNewProjectDescription('');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project';
      if (Platform.OS === 'web') {
        alert(`Error: ${message}`);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'react-native': return 'phone-android';
      case 'web': return 'web';
      case 'node': return 'dns';
      default: return 'folder';
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={showCreateForm ? 'Create New Project' : 'Select Project'}
    >
      {showCreateForm ? (
        <View>
          {/* Project Name */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
              Project Name *
            </Text>
            <TextInput
              style={{
                backgroundColor: '#374151',
                color: '#F9FAFB',
                padding: 16,
                borderRadius: 8,
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#4B5563',
              }}
              placeholder="Enter project name"
              placeholderTextColor="#9CA3AF"
              value={newProjectName}
              onChangeText={setNewProjectName}
            />
          </View>

          {/* Project Description */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
              Description (Optional)
            </Text>
            <TextInput
              style={{
                backgroundColor: '#374151',
                color: '#F9FAFB',
                padding: 16,
                borderRadius: 8,
                fontSize: 16,
                borderWidth: 1,
                borderColor: '#4B5563',
                height: 80,
                textAlignVertical: 'top',
              }}
              placeholder="Describe your project"
              placeholderTextColor="#9CA3AF"
              value={newProjectDescription}
              onChangeText={setNewProjectDescription}
              multiline
            />
          </View>

          {/* Project Type */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
              Project Type
            </Text>
            {projectTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => setSelectedType(type.id as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: selectedType === type.id ? '#00D4FF' : '#374151',
                  borderRadius: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: selectedType === type.id ? '#00D4FF' : '#4B5563',
                }}
              >
                <MaterialIcons
                  name={type.icon as any}
                  size={24}
                  color={selectedType === type.id ? '#111827' : '#00D4FF'}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: selectedType === type.id ? '#111827' : '#F9FAFB',
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                    {type.name}
                  </Text>
                  <Text style={{
                    color: selectedType === type.id ? '#374151' : '#9CA3AF',
                    fontSize: 14,
                    marginTop: 2,
                  }}>
                    {type.description}
                  </Text>
                </View>
                {selectedType === type.id && (
                  <MaterialIcons name="check-circle" size={20} color="#111827" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => setShowCreateForm(false)}
              style={{
                flex: 1,
                backgroundColor: '#374151',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 16, fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreateProject}
              style={{
                flex: 1,
                backgroundColor: '#00D4FF',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#111827', fontSize: 16, fontWeight: '600' }}>
                Create Project
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          {/* Current Project */}
          {currentProject && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                CURRENT PROJECT
              </Text>
              <View style={{
                backgroundColor: '#374151',
                padding: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: '#00D4FF',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialIcons
                    name={getProjectIcon(currentProject.type)}
                    size={20}
                    color="#00D4FF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600', flex: 1 }}>
                    {currentProject.name}
                  </Text>
                  <MaterialIcons name="check-circle" size={20} color="#00D4FF" />
                </View>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                  {currentProject.description}
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                  Modified {formatDate(currentProject.updatedAt)}
                </Text>
              </View>
            </View>
          )}

          {/* All Projects */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              ALL PROJECTS ({projects.length})
            </Text>
            {projects.length === 0 ? (
              <View style={{
                backgroundColor: '#374151',
                padding: 32,
                borderRadius: 8,
                alignItems: 'center',
              }}>
                <MaterialIcons name="folder-open" size={48} color="#6B7280" style={{ marginBottom: 12 }} />
                <Text style={{ color: '#9CA3AF', fontSize: 16, textAlign: 'center' }}>
                  No projects yet
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
                  Create your first project to get started
                </Text>
              </View>
            ) : (
              projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  onPress={() => {
                    onProjectSelect(project.id);
                    onClose();
                  }}
                  style={{
                    backgroundColor: project.id === currentProject?.id ? '#374151' : '#1F2937',
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: project.id === currentProject?.id ? '#00D4FF' : '#374151',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <MaterialIcons
                      name={getProjectIcon(project.type)}
                      size={20}
                      color="#00D4FF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600', flex: 1 }}>
                      {project.name}
                    </Text>
                    <View style={{
                      backgroundColor: project.status === 'active' ? '#10B981' : '#6B7280',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}>
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
                        {project.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 4 }}>
                    {project.description}
                  </Text>
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>
                    {project.files.length} files • Modified {formatDate(project.updatedAt)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Create New Project Button */}
          <TouchableOpacity
            onPress={() => setShowCreateForm(true)}
            style={{
              backgroundColor: '#00D4FF',
              padding: 16,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <MaterialIcons name="add" size={20} color="#111827" style={{ marginRight: 8 }} />
            <Text style={{ color: '#111827', fontSize: 16, fontWeight: '600' }}>
              Create New Project
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </BottomSheet>
  );
}