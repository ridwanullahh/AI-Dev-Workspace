import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import BottomSheet from './BottomSheet';

interface AgentSelectorProps {
  visible: boolean;
  onClose: () => void;
  onAgentSelect?: (agentId: string) => void;
}

export default function AgentSelector({ visible, onClose, onAgentSelect }: AgentSelectorProps) {
  const { agents, toggleAgent } = useWorkspace();

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return '#10B981';
      case 'working': return '#00D4FF';
      case 'error': return '#EF4444';
      case 'paused': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="AI Agents">
      <View>
        {/* Active Agents Summary */}
        <View style={{
          backgroundColor: '#374151',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialIcons name="psychology" size={20} color="#00D4FF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
              Agent Orchestra Status
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#00D4FF', fontSize: 18, fontWeight: 'bold' }}>
                {agents.filter(a => a.isActive).length}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Active</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#10B981', fontSize: 18, fontWeight: 'bold' }}>
                {agents.filter(a => a.status === 'working').length}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Working</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#F59E0B', fontSize: 18, fontWeight: 'bold' }}>
                {agents.reduce((acc, agent) => acc + agent.performance.tasksCompleted, 0)}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Tasks Done</Text>
            </View>
          </View>
        </View>

        {/* Agents List */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
            AVAILABLE AGENTS
          </Text>
          
          {agents.map((agent) => (
            <View key={agent.id} style={{
              backgroundColor: agent.isActive ? '#1F2937' : '#374151',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: agent.isActive ? '#00D4FF' : '#4B5563',
              opacity: agent.isActive ? 1 : 0.7,
            }}>
              {/* Agent Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <MaterialIcons
                  name={getRoleIcon(agent.role)}
                  size={24}
                  color={agent.isActive ? '#00D4FF' : '#6B7280'}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={{
                      color: agent.isActive ? '#F9FAFB' : '#9CA3AF',
                      fontSize: 16,
                      fontWeight: 'bold',
                      flex: 1,
                    }}>
                      {agent.name}
                    </Text>
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: getStatusColor(agent.status),
                      marginLeft: 8,
                    }} />
                  </View>
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                    {agent.role}
                  </Text>
                </View>
                <Switch
                  value={agent.isActive}
                  onValueChange={(value) => toggleAgent(agent.id, value)}
                  trackColor={{ false: '#374151', true: '#00D4FF' }}
                  thumbColor={agent.isActive ? '#F9FAFB' : '#9CA3AF'}
                />
              </View>

              {/* Agent Description */}
              <Text style={{
                color: '#9CA3AF',
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 12,
              }}>
                {agent.description}
              </Text>

              {/* Performance Stats */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6B7280', fontSize: 11 }}>Tasks</Text>
                  <Text style={{ color: '#F9FAFB', fontSize: 14, fontWeight: '600' }}>
                    {agent.performance.tasksCompleted}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6B7280', fontSize: 11 }}>Efficiency</Text>
                  <Text style={{
                    color: getEfficiencyColor(agent.performance.successRate * 100),
                    fontSize: 14,
                    fontWeight: '600',
                  }}>
                    {Math.round(agent.performance.successRate * 100)}%
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6B7280', fontSize: 11 }}>Avg Time</Text>
                  <Text style={{ color: '#F9FAFB', fontSize: 14, fontWeight: '600' }}>
                    {Math.round(agent.performance.averageTime / 60)}m
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6B7280', fontSize: 11 }}>Rating</Text>
                  <Text style={{ color: '#F9FAFB', fontSize: 14, fontWeight: '600' }}>
                    {agent.performance.userRating.toFixed(1)}
                  </Text>
                </View>
              </View>

              {/* Capabilities */}
              <View>
                <Text style={{ color: '#6B7280', fontSize: 11, marginBottom: 6 }}>
                  Capabilities
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {agent.capabilities.slice(0, 3).map((capability, index) => (
                    <View key={index} style={{
                      backgroundColor: agent.isActive ? '#374151' : '#4B5563',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      marginRight: 6,
                      marginBottom: 4,
                    }}>
                      <Text style={{
                        color: agent.isActive ? '#00D4FF' : '#6B7280',
                        fontSize: 10,
                        fontWeight: '500',
                      }}>
                        {capability.replace('-', ' ')}
                      </Text>
                    </View>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <View style={{
                      backgroundColor: agent.isActive ? '#374151' : '#4B5563',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      marginRight: 6,
                      marginBottom: 4,
                    }}>
                      <Text style={{
                        color: agent.isActive ? '#00D4FF' : '#6B7280',
                        fontSize: 10,
                        fontWeight: '500',
                      }}>
                        +{agent.capabilities.length - 3}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Select Agent Button */}
              {onAgentSelect && agent.isActive && (
                <TouchableOpacity
                  onPress={() => {
                    onAgentSelect(agent.id);
                    onClose();
                  }}
                  style={{
                    backgroundColor: '#00D4FF',
                    padding: 10,
                    borderRadius: 6,
                    alignItems: 'center',
                    marginTop: 12,
                  }}
                >
                  <Text style={{ color: '#111827', fontSize: 12, fontWeight: '600' }}>
                    Chat with {agent.name}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Current Task */}
              {agent.currentTask && (
                <View style={{
                  backgroundColor: '#0F172A',
                  padding: 10,
                  borderRadius: 6,
                  marginTop: 8,
                }}>
                  <Text style={{ color: '#00D4FF', fontSize: 11, fontWeight: '600', marginBottom: 2 }}>
                    CURRENT TASK
                  </Text>
                  <Text style={{ color: '#E2E8F0', fontSize: 12 }}>
                    {agent.currentTask.title}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}