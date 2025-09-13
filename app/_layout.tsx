import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';

export default function RootLayout() {
  const insets = useSafeAreaInsets();

  return (
    <WorkspaceProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#00D4FF',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            backgroundColor: '#1F2937',
            borderTopWidth: 1,
            borderTopColor: '#374151',
            height: Platform.select({
              ios: insets.bottom + 70,
              android: insets.bottom + 70,
              default: 80
            }),
            paddingTop: 12,
            paddingBottom: Platform.select({
              ios: insets.bottom + 12,
              android: insets.bottom + 12,
              default: 12
            }),
            paddingHorizontal: 16
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 6
          },
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Workspace',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="workspaces" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Projects',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="folder" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="agents"
          options={{
            title: 'Agents',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="psychology" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="code"
          options={{
            title: 'Code',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="code" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </WorkspaceProvider>
  );
}