
export interface SpeechServiceOptions {
    onResult: (text: string, isFinal: boolean) => void;
    onEnd: () => void;
    onError: (error: any) => void;
    language?: string;
}

class SpeechService {
    private recognition: any | null = null;
    private isListening: boolean = false;

    constructor() {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
        }
    }

    public isSupported(): boolean {
        return !!this.recognition;
    }

    public start(options: SpeechServiceOptions) {
        if (!this.recognition || this.isListening) return;

        this.recognition.lang = options.language || 'bn-BD'; // Default to Bangla

        this.recognition.onresult = (event: any) => {
            let combinedTranscript = '';

            for (let i = 0; i < event.results.length; ++i) {
                combinedTranscript += event.results[i][0].transcript;
            }

            options.onResult(combinedTranscript, event.results[event.results.length - 1].isFinal);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            options.onEnd();
        };

        this.recognition.onerror = (event: any) => {
            this.isListening = false;
            options.onError(event.error);
        };

        try {
            this.recognition.start();
            this.isListening = true;
        } catch (e) {
            console.error('Speech recognition start failed:', e);
        }
    }

    public stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }
}

export const speechService = new SpeechService();
