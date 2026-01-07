
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export interface BiometricResult {
    isAvailable: boolean;
    type?: 'TOUCH_ID' | 'FACE_ID' | 'FINGERPRINT' | 'FACE_AUTHENTICATION' | 'IRIS_AUTHENTICATION' | 'MULTIPLE';
}

class BiometricServiceImpl {
    private _isAvailable: boolean = false;

    async checkAvailability(): Promise<BiometricResult> {
        try {
            const result = await NativeBiometric.isAvailable();
            this._isAvailable = result.isAvailable;
            console.log('🔐 [BiometricService] Availability Check:', result);
            // Map the string biometryType to our union type if needed, or just return as is
            return {
                isAvailable: result.isAvailable,
                type: result.biometryType as any
            };
        } catch (error) {
            console.error('🔐 [BiometricService] Availability Check Failed:', error);
            this._isAvailable = false;
            return { isAvailable: false };
        }
    }

    async verifyIdentity(): Promise<boolean> {
        // Double check availability just in case state is stale
        if (!this._isAvailable) {
            await this.checkAvailability();
        }

        if (!this._isAvailable) {
            console.warn('🔐 [BiometricService] Biometric not available, skipping verification.');
            return false;
        }

        try {
            const verified = await NativeBiometric.verifyIdentity({
                reason: "Access FinOS Secure Terminal",
                title: "FinOS Security",
                subtitle: "Biometric Authorization",
                description: "Please authenticate to access your financial operating system.",
            });
            console.log('🔐 [BiometricService] Verification Result:', verified);
            return true;
        } catch (error) {
            console.error('🔐 [BiometricService] Verification Failed/Cancelled:', error);
            return false;
        }
    }

    async setCredentials(key: string, value: string): Promise<boolean> {
        if (!this._isAvailable) return false;
        try {
            await NativeBiometric.setCredentials({
                username: key,
                password: value,
                server: "finos.system", // Unique identifier for keychain
            });
            return true;
        } catch (e) {
            console.error('🔐 [BiometricService] Failed to set credentials:', e);
            return false;
        }
    }

    async getCredentials(key: string): Promise<string | null> {
        if (!this._isAvailable) return null;
        try {
            const credentials = await NativeBiometric.getCredentials({
                server: "finos.system",
            });
            if (credentials && credentials.username === key) {
                return credentials.password;
            }
            return null;
        } catch (e) {
            // It throws if no credentials found or cancelled
            return null;
        }
    }
}

export const biometricService = new BiometricServiceImpl();
