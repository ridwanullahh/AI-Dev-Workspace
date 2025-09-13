import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachFile?: () => void;
  onVoiceInput?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function ChatInput({
  value,
  onChangeText,
  onSend,
  onAttachFile,
  onVoiceInput,
  placeholder = "Ask your AI assistant...",
  disabled = false,
  isLoading = false,
}: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const [isFocused, setIsFocused] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { width } = Dimensions.get('window');

  const handleSend = () => {
    if (value.trim() && !disabled && !isLoading) {
      // Animate send button
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      onSend();
    }
  };

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    setIsMultiline(height > 40);
  };

  const canSend = value.trim().length > 0 && !disabled && !isLoading;

  return (
    <View style={{
      backgroundColor: '#1F2937',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: insets.bottom + 12,
      borderTopWidth: 1,
      borderTopColor: '#374151',
      minHeight: Platform.select({
        ios: insets.bottom + 68,
        android: insets.bottom + 68,
        default: 68
      }),
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#374151',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: isFocused ? 2 : 1,
        borderColor: isFocused ? '#00D4FF' : '#4B5563',
        maxHeight: 120,
      }}>
        {/* Attach File Button */}
        {onAttachFile && (
          <TouchableOpacity
            onPress={onAttachFile}
            style={{
              padding: 8,
              marginRight: 8,
              borderRadius: 20,
              backgroundColor: '#4B5563',
            }}
            disabled={disabled}
          >
            <MaterialIcons 
              name="attach-file" 
              size={20} 
              color={disabled ? '#6B7280' : '#9CA3AF'} 
            />
          </TouchableOpacity>
        )}

        {/* Text Input */}
        <TextInput
          style={{
            flex: 1,
            color: '#F9FAFB',
            fontSize: 16,
            lineHeight: 22,
            paddingVertical: Platform.OS === 'ios' ? 8 : 6,
            paddingHorizontal: 0,
            textAlignVertical: 'center',
            maxHeight: 100,
          }}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          value={value}
          onChangeText={onChangeText}
          multiline
          textAlignVertical={isMultiline ? 'top' : 'center'}
          onContentSizeChange={handleContentSizeChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          maxLength={4000}
          returnKeyType="send"
          onSubmitEditing={Platform.OS === 'ios' ? handleSend : undefined}
          blurOnSubmit={false}
        />

        {/* Voice Input Button */}
        {onVoiceInput && !value.trim() && (
          <TouchableOpacity
            onPress={onVoiceInput}
            style={{
              padding: 8,
              marginLeft: 8,
              borderRadius: 20,
              backgroundColor: '#4B5563',
            }}
            disabled={disabled}
          >
            <MaterialIcons 
              name="mic" 
              size={20} 
              color={disabled ? '#6B7280' : '#9CA3AF'} 
            />
          </TouchableOpacity>
        )}

        {/* Send Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={handleSend}
            style={{
              backgroundColor: canSend ? '#00D4FF' : '#4B5563',
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
            disabled={!canSend}
          >
            {isLoading ? (
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: '#111827',
                borderTopColor: 'transparent',
              }}>
                <Animated.View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    transform: [{
                      rotate: scaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      })
                    }]
                  }}
                />
              </View>
            ) : (
              <MaterialIcons 
                name="send" 
                size={18} 
                color={canSend ? '#111827' : '#6B7280'} 
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Character Counter */}
      {value.length > 3500 && (
        <View style={{
          alignItems: 'flex-end',
          marginTop: 4,
        }}>
          <Text style={{
            color: value.length > 3800 ? '#EF4444' : '#9CA3AF',
            fontSize: 11,
          }}>
            {value.length}/4000
          </Text>
        </View>
      )}
    </View>
  );
}