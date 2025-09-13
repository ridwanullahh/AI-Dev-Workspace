import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  lastModified: Date;
  status: 'active' | 'completed' | 'archived';
  progress: number;
}

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'E-Commerce App',
      description: 'React Native shopping app with AI recommendations',
      type: 'Mobile App',
      lastModified: new Date(),
      status: 'active',
      progress: 75,
    },
    {
      id: '2',
      name: 'Task Manager',
      description: 'Productivity app with smart scheduling',
      type: 'Web App',
      lastModified: new Date(Date.now() - 86400000),
      status: 'active',
      progress: 45,
    },
    {
      id: '3',
      name: 'Chat Bot',
      description: 'Customer service bot with multi-agent support',
      type: 'AI Service',
      lastModified: new Date(Date.now() - 172800000),
      status: 'completed',
      progress: 100,
    },
  ]);

  const showCreateProject = () => {
    if (Platform.OS === 'web') {
      // Web alert implementation would go here
      alert('Create new project feature coming soon!');
    } else {
      Alert.alert(
        'Create Project',
        'New project creation feature coming soon!',
        [{ text: 'OK' }]
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#00D4FF';
      case 'completed': return '#10B981';
      case 'archived': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Mobile App': return 'phone-android';
      case 'Web App': return 'web';
      case 'AI Service': return 'psychology';
      default: return 'code';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#111827' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 20,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#374151',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: '#F9FAFB', fontSize: 24, fontWeight: 'bold' }}>
              Projects
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 2 }}>
              {projects.length} projects • AI-powered development
            </Text>
          </View>
          <TouchableOpacity
            onPress={showCreateProject}
            style={{
              backgroundColor: '#00D4FF',
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="add" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Row */}
      <View style={{ 
        flexDirection: 'row', 
        paddingHorizontal: 20, 
        paddingVertical: 16,
        backgroundColor: '#1F2937' 
      }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#00D4FF', fontSize: 20, fontWeight: 'bold' }}>
            {projects.filter(p => p.status === 'active').length}
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>Active</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#10B981', fontSize: 20, fontWeight: 'bold' }}>
            {projects.filter(p => p.status === 'completed').length}
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>Completed</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#F59E0B', fontSize: 20, fontWeight: 'bold' }}>
            {Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)}%
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>Avg Progress</Text>
        </View>
      </View>

      {/* Projects List */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
      >
        {projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={{
              backgroundColor: '#1F2937',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#374151',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialIcons 
                    name={getTypeIcon(project.type)} 
                    size={20} 
                    color="#00D4FF" 
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
                    {project.name}
                  </Text>
                </View>
                
                <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
                  {project.description}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View 
                      style={{
                        backgroundColor: getStatusColor(project.status),
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ color: '#111827', fontSize: 11, fontWeight: '600' }}>
                        {project.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>
                      {project.type}
                    </Text>
                  </View>
                  
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                    {project.lastModified.toLocaleDateString()}
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Progress</Text>
                    <Text style={{ color: '#00D4FF', fontSize: 12, fontWeight: '600' }}>
                      {project.progress}%
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#374151', height: 4, borderRadius: 2 }}>
                    <View 
                      style={{
                        backgroundColor: '#00D4FF',
                        height: 4,
                        borderRadius: 2,
                        width: `${project.progress}%`,
                      }}
                    />
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {projects.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <MaterialIcons name="folder-open" size={64} color="#4B5563" />
            <Text style={{ color: '#9CA3AF', fontSize: 16, marginTop: 16, textAlign: 'center' }}>
              No projects yet
            </Text>
            <Text style={{ color: '#6B7280', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
              Create your first AI-powered project
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}