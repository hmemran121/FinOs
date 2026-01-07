import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.finos.premium.app',
    appName: 'FinOS',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
