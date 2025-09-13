import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  isActive: boolean;
  tasksCompleted: number;
  efficiency: number;
  specialties: string[];
}

export default function AgentsScreen() {
  const insets = useSafeAreaInsets();
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Planner',
      role: 'Architecture & Planning',
      description: 'Designs system architecture and creates development roadmaps',
      isActive: true,
      tasksCompleted: 147,
      efficiency: 94,
      specialties: ['Architecture', 'Planning', 'System Design'],
    },
    {
      id: '2',
      name: 'Coder',
      role: 'Code Generation',
      description: 'Generates, refactors, and optimizes code across multiple languages',
      isActive: true,
      tasksCompleted: 312,
      efficiency: 89,
      specialties: ['React Native', 'TypeScript', 'Node.js'],
    },
    {
      id: '3',
      name: 'Designer',
      role: 'UI/UX Design',
      description: 'Creates beautiful interfaces and user experience flows',
      isActive: true,
      tasksCompleted: 89,
      efficiency: 96,
      specialties: ['UI Design', 'UX Research', 'Prototyping'],
    },
    {
      id: '4',
      name: 'Debugger',
      role: 'Quality Assurance',
      description: 'Identifies bugs, performance issues, and code quality problems',
      isActive: false,
      tasksCompleted: 203,
      efficiency: 87,
      specialties: ['Bug Detection', 'Performance', 'Testing'],
    },
    {
      id: '5',
      name: 'DevOps',
      role: 'Deployment & CI/CD',
      description: 'Handles deployment, infrastructure, and continuous integration',
      isActive: true,
      tasksCompleted: 76,
      efficiency: 91,
      specialties: ['Deployment', 'CI/CD', 'Infrastructure'],
    },
  ]);

  const toggleAgent = (agentId: string) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, isActive: !agent.isActive }
        : agent
    ));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Architecture & Planning': return 'architecture';
      case 'Code Generation': return 'code';
      case 'UI/UX Design': return 'design-services';
      case 'Quality Assurance': return 'bug-report';
      case 'Deployment & CI/CD': return 'cloud-upload';
      default: return 'psychology';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return '#10B981';
    if (efficiency >= 75) return '#F59E0B';
    return '#EF4444';
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
        <View>
          <Text style={{ color: '#F9FAFB', fontSize: 24, fontWeight: 'bold' }}>
            AI Agents
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 2 }}>
            {agents.filter(a => a.isActive).length} of {agents.length} agents active • Multi-agent orchestration
          </Text>
        </View>
      </LinearGradient>

      {/* Orchestra Status */}
      <LinearGradient
        colors={['#1F2937', '#374151']}
        style={{ paddingHorizontal: 20, paddingVertical: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View 
              style={{
                backgroundColor: '#10B981',
                width: 12,
                height: 12,
                borderRadius: 6,
                marginRight: 8,
              }}
            />
            <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
              Orchestra Status: Active
            </Text>
          </View>
          <Text style={{ color: '#00D4FF', fontSize: 14, fontWeight: '600' }}>
            {agents.reduce((acc, agent) => acc + agent.tasksCompleted, 0)} tasks completed
          </Text>
        </View>
      </LinearGradient>

      {/* Agents List */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
      >
        {agents.map((agent) => (
          <View
            key={agent.id}
            style={{
              backgroundColor: '#1F2937',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: agent.isActive ? '#00D4FF' : '#374151',
              opacity: agent.isActive ? 1 : 0.7,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                {/* Agent Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialIcons 
                    name={getRoleIcon(agent.role)} 
                    size={24} 
                    color={agent.isActive ? '#00D4FF' : '#6B7280'} 
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      color: agent.isActive ? '#F9FAFB' : '#9CA3AF', 
                      fontSize: 18, 
                      fontWeight: 'bold' 
                    }}>
                      {agent.name}
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                      {agent.role}
                    </Text>
                  </View>
                  <Switch
                    value={agent.isActive}
                    onValueChange={() => toggleAgent(agent.id)}
                    trackColor={{ false: '#374151', true: '#00D4FF' }}
                    thumbColor={agent.isActive ? '#F9FAFB' : '#9CA3AF'}
                  />
                </View>

                {/* Description */}
                <Text style={{ 
                  color: '#9CA3AF', 
                  fontSize: 14, 
                  lineHeight: 20, 
                  marginBottom: 16 
                }}>
                  {agent.description}
                </Text>

                {/* Stats */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>Tasks Completed</Text>
                    <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
                      {agent.tasksCompleted}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>Efficiency</Text>
                    <Text style={{ 
                      color: getEfficiencyColor(agent.efficiency), 
                      fontSize: 16, 
                      fontWeight: '600' 
                    }}>
                      {agent.efficiency}%
                    </Text>
                  </View>
                </View>

                {/* Specialties */}
                <View>
                  <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>
                    Specialties
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {agent.specialties.map((specialty, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: agent.isActive ? '#374151' : '#2D3748',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          marginRight: 8,
                          marginBottom: 4,
                        }}
                      >
                        <Text style={{ 
                          color: agent.isActive ? '#00D4FF' : '#6B7280', 
                          fontSize: 11, 
                          fontWeight: '500' 
                        }}>
                          {specialty}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Orchestra Info */}
        <View style={{
          backgroundColor: '#1F2937',
          borderRadius: 12,
          padding: 16,
          marginTop: 8,
          borderWidth: 1,
          borderColor: '#374151',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <MaterialIcons name="info" size={20} color="#00D4FF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
              Multi-Agent Orchestra
            </Text>
          </View>
          <Text style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 20 }}>
            AI agents work together to handle complex development tasks. Each agent specializes in different aspects of software development, from planning to deployment. Enable agents based on your project needs.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}