import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import FeedbackOverlay, { FeedbackType } from '../components/ui/FeedbackOverlay';

interface FeedbackOptions {
    persistent?: boolean;
    position?: 'top' | 'center' | 'bottom';
}

interface FeedbackContextType {
    showFeedback: (message: string, type: FeedbackType, options?: FeedbackOptions) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback must be used within a FeedbackProvider');
    }
    return context;
};

interface FeedbackProviderProps {
    children: ReactNode;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<FeedbackType>('success');
    const [options, setOptions] = useState<FeedbackOptions>({});

    const showFeedback = useCallback((msg: string, t: FeedbackType, opts: FeedbackOptions = {}) => {
        console.log('[FeedbackContext] showFeedback called:', msg, t, opts);
        setMessage(msg);
        setType(t);
        setOptions(opts);
        setIsVisible(true);
    }, []);

    const hideFeedback = useCallback(() => {
        setIsVisible(false);
    }, []);

    return (
        <FeedbackContext.Provider value={{ showFeedback }}>
            {children}
            <FeedbackOverlay
                isVisible={isVisible}
                message={message}
                type={type}
                onClose={hideFeedback}
                persistent={options.persistent}
                position={options.position}
            />
        </FeedbackContext.Provider>
    );
};
