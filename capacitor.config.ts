import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trooflixtv.app',
  appName: 'Trooflix',
  webDir: 'public',
  server: {
    url: 'https://www.trooflixtv.com',
    cleartext: true,
    allowNavigation: ['www.trooflixtv.com', 'trooflixtv.com', '*.trooflixtv.com']
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
