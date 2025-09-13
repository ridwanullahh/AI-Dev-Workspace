import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Welcome to AI Dev Workspace! I\'m your AI development assistant. I can help you with:\n\n• Multi-agent development\n• Code generation\n• Project management\n• Git operations\n\nWhat would you like to build today?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('Gemini');

  const providers = ['Gemini', 'GPT-4', 'Claude', 'Cohere'];

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `I understand you want to "${inputText}". Let me help you with that! This is a demo response from ${selectedProvider}. In the full version, I'll connect to real AI providers with intelligent key rotation to avoid rate limits.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#111827' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      
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
              AI Workspace
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 2 }}>
              {selectedProvider} • Ready to code
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={{
                backgroundColor: '#374151',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                marginRight: 10,
              }}
            >
              <Text style={{ color: '#00D4FF', fontSize: 12, fontWeight: '600' }}>
                {selectedProvider}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <MaterialIcons name="more-vert" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Provider Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: '#1F2937' }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
      >
        {providers.map((provider) => (
          <TouchableOpacity
            key={provider}
            onPress={() => setSelectedProvider(provider)}
            style={{
              backgroundColor: selectedProvider === provider ? '#00D4FF' : '#374151',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginRight: 12,
            }}
          >
            <Text 
              style={{
                color: selectedProvider === provider ? '#111827' : '#E5E7EB',
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {provider}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView 
        style={{ flex: 1, backgroundColor: '#111827' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={{
              alignSelf: message.isUser ? 'flex-end' : 'flex-start',
              backgroundColor: message.isUser ? '#00D4FF' : '#374151',
              padding: 12,
              borderRadius: 16,
              marginVertical: 4,
              maxWidth: '85%',
            }}
          >
            <Text 
              style={{
                color: message.isUser ? '#111827' : '#F9FAFB',
                fontSize: 16,
                lineHeight: 22,
              }}
            >
              {message.text}
            </Text>
            <Text 
              style={{
                color: message.isUser ? '#1F2937' : '#9CA3AF',
                fontSize: 12,
                marginTop: 4,
                opacity: 0.7,
              }}
            >
              {message.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Input Area */}
      <LinearGradient
        colors={['#1F2937', '#374151']}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 15,
          paddingBottom: insets.bottom + 15,
          borderTopWidth: 1,
          borderTopColor: '#4B5563',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: '#111827',
              color: '#F9FAFB',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 24,
              fontSize: 16,
              marginRight: 12,
              borderWidth: 1,
              borderColor: '#4B5563',
            }}
            placeholder="Ask your AI assistant..."
            placeholderTextColor="#6B7280"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={{
              backgroundColor: inputText.trim() ? '#00D4FF' : '#4B5563',
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            disabled={!inputText.trim()}
          >
            <MaterialIcons 
              name="send" 
              size={20} 
              color={inputText.trim() ? '#111827' : '#9CA3AF'} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}