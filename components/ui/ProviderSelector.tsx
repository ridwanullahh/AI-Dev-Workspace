import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import BottomSheet from './BottomSheet';

interface ProviderSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProviderSelector({ visible, onClose }: ProviderSelectorProps) {
  const { providers, currentProvider, setCurrentProvider, addProviderAccount } = useWorkspace();
  const [showAddAccount, setShowAddAccount] = useState<string | null>(null);
  const [accountName, setAccountName] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleAddAccount = async (providerId: string) => {
    if (!accountName.trim() || !apiKey.trim()) {
      const message = 'Please enter both account name and API key';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    try {
      await addProviderAccount(providerId, {
        name: accountName,
        apiKey: apiKey,
        isActive: true,
      });
      
      setShowAddAccount(null);
      setAccountName('');
      setApiKey('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add account';
      if (Platform.OS === 'web') {
        alert(`Error: ${message}`);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'google': return 'psychology';
      case 'openai': return 'smart-toy';
      case 'anthropic': return 'auto-awesome';
      case 'cohere': return 'memory';
      default: return 'computer';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#10B981';
      case 'disconnected': return '#6B7280';
      case 'error': return '#EF4444';
      case 'rate_limited': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="AI Providers">
      <View>
        {/* Current Provider */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
            CURRENT PROVIDER
          </Text>
          <View style={{
            backgroundColor: '#374151',
            padding: 16,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#00D4FF',
          }}>
            <Text style={{ color: '#00D4FF', fontSize: 16, fontWeight: '600' }}>
              {providers.find(p => p.id === currentProvider)?.name || 'None Selected'}
            </Text>
          </View>
        </View>

        {/* All Providers */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
            AVAILABLE PROVIDERS
          </Text>
          
          {providers.map((provider) => (
            <View key={provider.id} style={{ marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setCurrentProvider(provider.id)}
                style={{
                  backgroundColor: currentProvider === provider.id ? '#374151' : '#1F2937',
                  padding: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: currentProvider === provider.id ? '#00D4FF' : '#374151',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialIcons
                    name={getProviderIcon(provider.type)}
                    size={24}
                    color="#00D4FF"
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '600' }}>
                      {provider.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: getStatusColor(provider.status),
                        marginRight: 6,
                      }} />
                      <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                        {provider.status.replace('_', ' ').toUpperCase()}
                      </Text>
                      <Text style={{ color: '#6B7280', fontSize: 12, marginLeft: 8 }}>
                        {provider.accounts.length} account{provider.accounts.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  {currentProvider === provider.id && (
                    <MaterialIcons name="check-circle" size={20} color="#00D4FF" />
                  )}
                </View>

                {/* Accounts */}
                {provider.accounts.length > 0 && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#4B5563' }}>
                    {provider.accounts.map((account, index) => (
                      <View key={account.id} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 4,
                      }}>
                        <View style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: account.isActive ? '#10B981' : '#6B7280',
                          marginRight: 8,
                        }} />
                        <Text style={{ color: '#9CA3AF', fontSize: 12, flex: 1 }}>
                          {account.name}
                        </Text>
                        <Text style={{ color: '#6B7280', fontSize: 10 }}>
                          {account.usage.requestsToday} requests today
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>

              {/* Add Account Button */}
              {showAddAccount === provider.id ? (
                <View style={{
                  backgroundColor: '#374151',
                  padding: 16,
                  borderRadius: 8,
                  marginTop: 8,
                }}>
                  <Text style={{ color: '#F9FAFB', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
                    Add New Account
                  </Text>
                  
                  <TextInput
                    style={{
                      backgroundColor: '#1F2937',
                      color: '#F9FAFB',
                      padding: 12,
                      borderRadius: 6,
                      fontSize: 14,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: '#4B5563',
                    }}
                    placeholder="Account name"
                    placeholderTextColor="#6B7280"
                    value={accountName}
                    onChangeText={setAccountName}
                  />
                  
                  <TextInput
                    style={{
                      backgroundColor: '#1F2937',
                      color: '#F9FAFB',
                      padding: 12,
                      borderRadius: 6,
                      fontSize: 14,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: '#4B5563',
                    }}
                    placeholder="API Key"
                    placeholderTextColor="#6B7280"
                    value={apiKey}
                    onChangeText={setApiKey}
                    secureTextEntry
                  />
                  
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowAddAccount(null);
                        setAccountName('');
                        setApiKey('');
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#4B5563',
                        padding: 10,
                        borderRadius: 6,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '600' }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleAddAccount(provider.id)}
                      style={{
                        flex: 1,
                        backgroundColor: '#00D4FF',
                        padding: 10,
                        borderRadius: 6,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#111827', fontSize: 14, fontWeight: '600' }}>
                        Add Account
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowAddAccount(provider.id)}
                  style={{
                    backgroundColor: '#4B5563',
                    padding: 12,
                    borderRadius: 6,
                    marginTop: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="add" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600' }}>
                    Add Account
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Usage Stats */}
        <View style={{
          backgroundColor: '#374151',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <Text style={{ color: '#F9FAFB', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
            Usage Today
          </Text>
          {providers.map((provider) => {
            const totalRequests = provider.accounts.reduce((sum, acc) => sum + acc.usage.requestsToday, 0);
            const totalTokens = provider.accounts.reduce((sum, acc) => sum + acc.usage.tokensToday, 0);
            
            if (totalRequests === 0 && totalTokens === 0) return null;
            
            return (
              <View key={provider.id} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                  {provider.name}
                </Text>
                <Text style={{ color: '#00D4FF', fontSize: 12 }}>
                  {totalRequests} requests • {totalTokens.toLocaleString()} tokens
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}