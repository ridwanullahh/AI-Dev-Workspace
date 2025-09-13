import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: number | string;
}

const { height: screenHeight } = Dimensions.get('window');

export default function BottomSheet({ 
  visible, 
  onClose, 
  title, 
  children, 
  height = '70%' 
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        const progress = Math.min(gestureState.dy / 200, 1);
        slideAnim.setValue(1 - progress);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        onClose();
      } else {
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [typeof height === 'string' ? screenHeight * 0.7 : height, 0],
  });

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            opacity: backdropOpacity,
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: typeof height === 'string' ? screenHeight * 0.7 : height,
            backgroundColor: '#1F2937',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            transform: [{ translateY }],
            paddingBottom: insets.bottom,
          }}
          {...panResponder.panHandlers}
        >
          {/* Drag Handle */}
          <View style={{
            alignItems: 'center',
            paddingVertical: 12,
          }}>
            <View style={{
              width: 36,
              height: 4,
              backgroundColor: '#6B7280',
              borderRadius: 2,
            }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#374151',
          }}>
            <Text style={{
              color: '#F9FAFB',
              fontSize: 18,
              fontWeight: 'bold',
            }}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                padding: 4,
                borderRadius: 20,
                backgroundColor: '#374151',
              }}
            >
              <MaterialIcons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              {children}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}