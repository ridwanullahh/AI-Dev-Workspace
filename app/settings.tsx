import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface AIProvider {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  accounts: number;
  usageToday: number;
  rateLimit: number;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [aiProviders, setAIProviders] = useState<AIProvider[]>([
    { id: '1', name: 'Gemini', status: 'connected', accounts: 3, usageToday: 45, rateLimit: 100 },
    { id: '2', name: 'GPT-4', status: 'disconnected', accounts: 0, usageToday: 0, rateLimit: 50 },
    { id: '3', name: 'Claude', status: 'connected', accounts: 2, usageToday: 12, rateLimit: 25 },
    { id: '4', name: 'Cohere', status: 'error', accounts: 1, usageToday: 3, rateLimit: 30 },
  ]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message, [{ text: 'OK' }]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#10B981';
      case 'disconnected': return '#6B7280';
      case 'error': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return 'check-circle';
      case 'disconnected': return 'circle';
      case 'error': return 'error';
      default: return 'circle';
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
        <Text style={{ color: '#F9FAFB', fontSize: 24, fontWeight: 'bold' }}>
          Settings
        </Text>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 2 }}>
          AI providers, preferences, and workspace configuration
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* AI Providers Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: '#F9FAFB', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            AI Provider Management
          </Text>
          
          {aiProviders.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              onPress={() => showAlert('Provider Settings', `Configure ${provider.name} accounts and API keys`)}
              style={{
                backgroundColor: '#1F2937',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#374151',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <MaterialIcons
                      name={getStatusIcon(provider.status)}
                      size={20}
                      color={getStatusColor(provider.status)}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
                      {provider.name}
                    </Text>
                    <View style={{
                      backgroundColor: getStatusColor(provider.status),
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 8,
                      marginLeft: 8,
                    }}>
                      <Text style={{ color: '#111827', fontSize: 10, fontWeight: '600' }}>
                        {provider.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                      {provider.accounts} accounts
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                      {provider.usageToday}/{provider.rateLimit} requests today
                    </Text>
                  </View>
                  
                  {provider.status === 'connected' && (
                    <View style={{ marginTop: 8 }}>
                      <View style={{ backgroundColor: '#374151', height: 3, borderRadius: 2 }}>
                        <View
                          style={{
                            backgroundColor: '#00D4FF',
                            height: 3,
                            borderRadius: 2,
                            width: `${(provider.usageToday / provider.rateLimit) * 100}%`,
                          }}
                        />
                      </View>
                    </View>
                  )}
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            onPress={() => showAlert('Add Provider', 'Add new AI provider or additional accounts')}
            style={{
              backgroundColor: '#374151',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#4B5563',
              borderStyle: 'dashed',
              alignItems: 'center',
            }}
          >
            <MaterialIcons name="add" size={24} color="#00D4FF" />
            <Text style={{ color: '#00D4FF', fontSize: 14, fontWeight: '600', marginTop: 4 }}>
              Add AI Provider
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Preferences */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: '#F9FAFB', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            Preferences
          </Text>
          
          <View style={{ backgroundColor: '#1F2937', borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
                  Dark Mode
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                  Use dark theme for better coding experience
                </Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#374151', true: '#00D4FF' }}
                thumbColor={darkMode ? '#F9FAFB' : '#9CA3AF'}
              />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
                  Notifications
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                  Get notified about AI agent completions
                </Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#374151', true: '#00D4FF' }}
                thumbColor={notifications ? '#F9FAFB' : '#9CA3AF'}
              />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
                  Auto-save
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                  Automatically save project changes
                </Text>
              </View>
              <Switch
                value={autoSave}
                onValueChange={setAutoSave}
                trackColor={{ false: '#374151', true: '#00D4FF' }}
                thumbColor={autoSave ? '#F9FAFB' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: '#F9FAFB', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            Workspace
          </Text>
          
          {[
            { icon: 'storage', title: 'Storage Management', subtitle: 'Manage local projects and cache' },
            { icon: 'backup', title: 'Backup & Sync', subtitle: 'Cloud backup and synchronization' },
            { icon: 'security', title: 'Security Settings', subtitle: 'API keys and authentication' },
            { icon: 'help', title: 'Help & Support', subtitle: 'Documentation and support' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => showAlert(item.title, `${item.title} feature coming soon!`)}
              style={{
                backgroundColor: '#1F2937',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#374151',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <MaterialIcons name={item.icon} size={24} color="#00D4FF" style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
                  {item.title}
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                  {item.subtitle}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>

        {/* About */}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>
            AI Dev Workspace v1.0.0
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
            Built with React Native & AI Agents
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}