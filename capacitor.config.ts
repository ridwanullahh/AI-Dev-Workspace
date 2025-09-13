import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aiworkspace.app',
  appName: 'AI Dev Workspace',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // In development, point to the Vite dev server
    // In production, this will be served statically
    url: 'http://localhost:3000',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    allowMixedContent: true
  },
  ios: {
    contentInset: 'automatic'
  },
  cordova: {
    preferences: {
      'ScrollEnabled': 'false',
      'BackgroundColor': '0xffffffff',
      'DisallowOverscroll': 'true',
      'LoadTimeout': '60000',
      'GapBetweenPages': '0',
      'PageLength': '0',
      'HeaderColor': '#00000000'
    }
  }
};

export default config;