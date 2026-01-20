import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, AlertCircle, Check, Loader2, Camera, Mic, MicOff } from 'lucide-react';
import { speechService } from '../services/speech';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { useFinance } from '../store/FinanceContext';
import { processAICommand, AIProcessedAction, learnFromCorrection } from '../services/gemini';
import { useFeedback } from '../store/FeedbackContext';
import { MasterCategoryType } from '../types';

interface AIAssistantModalProps {
    onClose: () => void;
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ onClose }) => {
    const { wallets, categories, addTransaction, addPlan, syncStatus } = useFinance();
    const { showFeedback } = useFeedback();
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const isProcessingRef = useRef(false); // Synchronous track to prevent floods
    const [suggestion, setSuggestion] = useState<AIProcessedAction | null>(null);
    const [executing, setExecuting] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [manualAmount, setManualAmount] = useState<string>('');
    const [lastQuery, setLastQuery] = useState<string>('');
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const transcriptRef = useRef('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync ref with state
    useEffect(() => {
        isProcessingRef.current = isProcessing;
    }, [isProcessing]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [suggestion, isProcessing, lastQuery]);

    const startListening = () => {
        if (!speechService.isSupported()) {
            showFeedback("Voice recognition is not supported in this browser.", 'error');
            return;
        }

        setIsListening(true);
        setTranscript('');

        speechService.start({
            language: 'bn-BD', // Default to Bangla, AI handles translation
            onResult: (text, isFinal) => {
                if (isProcessingRef.current) return;

                // 1. Accumulate transcript silently (No state update to prevent noise/jitter)
                transcriptRef.current = text;

                // If the user wants a hint that it's working:
                if (!transcript) setTranscript('Listening...');

                // 2. Clear old timer using REF (Guaranteed synchronous)
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                // 3. Set new 3s silence trigger
                silenceTimerRef.current = setTimeout(() => {
                    if (transcriptRef.current.trim() && !isProcessingRef.current) {
                        speechService.stop();

                        // Final UI Update (At once)
                        setTranscript(transcriptRef.current);
                        setInput(transcriptRef.current);

                        // Process with AI
                        handleSendWithText(transcriptRef.current);
                    }
                }, 3000);
            },
            onEnd: () => setIsListening(false),
            onError: (err) => {
                console.error("Speech Error:", err);
                setIsListening(false);
            }
        });
    };

    const stopListening = () => {
        speechService.stop();
        setIsListening(false);
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    };

    const handleSendWithText = async (customInput?: string) => {
        const query = customInput || input;
        if (!query.trim() && !attachedImage) return;

        // Clear any pending voice triggers immediately
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
        setTranscript('');
        transcriptRef.current = '';

        setLastQuery(query);
        setIsProcessing(true);
        setSuggestion(null);
        setSelectedWalletId(null);
        setSelectedChannel(null);
        setSelectedCategoryId(null);
        setManualAmount('');
        setInput('');
        setAttachedImage(null);

        try {
            const result = await processAICommand(query, {
                wallets,
                categories,
                userId: syncStatus.userId || undefined,
                imageBase64: attachedImage || undefined
            });
            setSuggestion(result);
            if (result.payload?.walletId) setSelectedWalletId(result.payload.walletId);
            if (result.payload?.channelType) setSelectedChannel(result.payload.channelType);
            if (result.payload?.categoryId) setSelectedCategoryId(result.payload.categoryId);
        } catch (error) {
            console.error("AI Assistant Error:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSend = () => handleSendWithText(input);

    const handleCameraCapture = async () => {
        try {
            const image = await CapacitorCamera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Base64
            });

            if (image.base64String) {
                setAttachedImage(image.base64String);
            }
        } catch (error) {
            console.error('Camera Error:', error);
        }
    };

    const handleExecute = async () => {
        if (!suggestion || !suggestion.payload) return;

        setExecuting(true);
        try {
            console.log("🤖 [DEBUG] Executing AI Command:", suggestion);

            // Validate Category ID to prevent DB Foreign Key errors
            let validCategoryId = selectedCategoryId;
            if (!validCategoryId && suggestion.payload.categoryId) {
                const exists = categories.find(c => c.id === suggestion.payload.categoryId);
                if (exists) validCategoryId = exists.id;
            }

            // Critical Fix: Block 'cat_gen' which causes Sync FK Errors
            if (validCategoryId === 'cat_gen') validCategoryId = undefined;

            // Fallback to first category if still invalid
            if (!validCategoryId) validCategoryId = categories[0]?.id;

            console.log("✅ [DEBUG] Resolved CategoryID:", validCategoryId);

            const finalPayload = {
                ...suggestion.payload,
                amount: manualAmount ? parseFloat(manualAmount) : (suggestion.payload.amount || 0),
                walletId: selectedWalletId || suggestion.payload.walletId,
                channelType: selectedChannel || suggestion.payload.channelType,
                categoryId: validCategoryId,
                date: suggestion.payload.date || new Date().toISOString().split('T')[0]
            };

            if (suggestion.type === 'ADD_TRANSACTION' || suggestion.type === 'REQUEST_INFO') {
                if ((!finalPayload.amount && finalPayload.amount !== 0) || !finalPayload.walletId || !finalPayload.channelType || !finalPayload.categoryId) {
                    showFeedback("Please complete all fields (Amount, Wallet, Channel, and Category).", 'error');
                    setExecuting(false);
                    return;
                }
                await addTransaction(finalPayload);
                showFeedback('AI transaction executed successfully.', 'success');
            } else if (suggestion.type === 'ADD_PLAN') {
                await addPlan(finalPayload);
                showFeedback('Financial plan created from AI suggestion.', 'success');
            }

            // Learning Loop: Non-blocking
            if (syncStatus.userId) {
                learnFromCorrection(syncStatus.userId, lastQuery, suggestion, finalPayload);
            }

            onClose();
        } catch (error) {
            console.error("Execution Error:", error);
            showFeedback('Failed to execute AI command.', 'error');
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm transition-all duration-500 animate-in fade-in">
            <div
                className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-5"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">FinOS AI</h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Powered by Gemini Flash</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-900/30"
                >
                    {!suggestion && !isProcessing && !lastQuery && (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center text-zinc-500">
                                <Sparkles size={32} className="opacity-20" />
                            </div>
                            <div>
                                <p className="font-bold text-white mb-1">What's on your mind?</p>
                                <p className="text-xs text-zinc-500 max-w-[240px]">"I spent 500 for lunch today using my cash wallet"</p>
                            </div>
                        </div>
                    )}

                    {/* User Query Bubble */}
                    {(lastQuery || transcript) && (
                        <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
                            <div className={`px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm font-medium shadow-sm transition-all duration-300 ${isListening ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/30' : 'bg-zinc-800 text-white'}`}>
                                {isListening ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                                        <span className="opacity-90">{transcript || "Listening..."}</span>
                                    </div>
                                ) : (
                                    lastQuery
                                )}
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="flex gap-3 animate-pulse">
                            <div className="w-8 h-8 bg-zinc-800 rounded-full flex-shrink-0" />
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-zinc-800 rounded-full w-2/3" />
                                <div className="h-4 bg-zinc-800 rounded-full w-1/2" />
                            </div>
                        </div>
                    )}

                    {suggestion && (
                        <div className="flex gap-4 animate-in slide-in-from-bottom-2 duration-500">
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                <Sparkles size={18} className="text-white" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="bg-zinc-800/80 rounded-2xl p-4 border border-white/5 text-zinc-200 text-sm leading-relaxed">
                                    {suggestion.explanation}
                                </div>

                                {((suggestion.type === 'REQUEST_INFO' || suggestion.type === 'ADD_TRANSACTION')) && (
                                    <div className="space-y-4 animate-in fade-in transition-all">
                                        {(suggestion.missingFields?.includes('amount') || !suggestion.payload?.amount) && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Enter Amount</p>
                                                <input
                                                    type="number"
                                                    value={manualAmount}
                                                    onChange={(e) => setManualAmount(e.target.value)}
                                                    placeholder="Enter amount here..."
                                                    className="w-full h-12 bg-zinc-800/50 border border-white/5 rounded-xl px-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 outline-none transition-all"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Select Wallet</p>
                                                {suggestion.payload?.walletId && !selectedWalletId && (
                                                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">AI Suggested</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {wallets.map(w => (
                                                    <button
                                                        key={w.id}
                                                        onClick={() => {
                                                            setSelectedWalletId(w.id);
                                                            setSelectedChannel(null); // Reset channel when wallet changes
                                                        }}
                                                        className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${selectedWalletId === w.id || (!selectedWalletId && suggestion.payload?.walletId === w.id) ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:bg-zinc-800'}`}
                                                    >
                                                        {w.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {(selectedWalletId || suggestion.payload?.walletId) && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center px-1">
                                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Select Channel</p>
                                                    {suggestion.payload?.channelType && !selectedChannel && (
                                                        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-tighter">AI Suggested</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {wallets.find(w => w.id === (selectedWalletId || suggestion.payload?.walletId))?.channels.map(ch => (
                                                        <button
                                                            key={ch.type}
                                                            onClick={() => setSelectedChannel(ch.type)}
                                                            className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${selectedChannel === ch.type || (!selectedChannel && suggestion.payload?.channelType === ch.type) ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:bg-zinc-800'}`}
                                                        >
                                                            {ch.type}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {suggestion.type === 'UNCERTAIN' ? (
                                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs font-bold">
                                        <AlertCircle size={14} />
                                        I wasn't quite sure about that request.
                                    </div>
                                ) : (
                                    <div className="bg-zinc-800/40 rounded-3xl p-4 border border-indigo-500/20 space-y-3">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Proposed Action</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-zinc-400">{(suggestion.type === 'ADD_TRANSACTION' || suggestion.type === 'REQUEST_INFO') ? 'Transaction' : 'Financial Plan'}</span>
                                                <span className="text-xl font-black text-white italic tracking-tighter">
                                                    {(suggestion.type === 'ADD_TRANSACTION' || suggestion.type === 'REQUEST_INFO')
                                                        ? `${manualAmount || suggestion.payload?.amount || 0} BDT`
                                                        : suggestion.payload?.title}
                                                </span>
                                                {suggestion.payload?.note && (
                                                    <span className="text-[10px] font-bold text-zinc-500 italic mt-0.5">
                                                        "{suggestion.payload.note}"
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleExecute}
                                                disabled={executing || (suggestion.type !== 'ADD_PLAN' && (!selectedWalletId || !selectedChannel || (!suggestion.payload?.amount && !manualAmount)))}
                                                className="h-14 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {executing ? (
                                                    <Loader2 className="animate-spin" size={16} />
                                                ) : (
                                                    <>
                                                        Confirm <Check size={16} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Image Preview */}
                {attachedImage && (
                    <div className="absolute bottom-24 left-6 z-10 animate-in slide-in-from-bottom-2">
                        <div className="relative group">
                            <img src={`data:image/jpeg;base64,${attachedImage}`} alt="Receipt" className="w-20 h-20 object-cover rounded-xl border-2 border-indigo-500 shadow-lg" />
                            <button
                                onClick={() => setAttachedImage(null)}
                                className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-md hover:bg-rose-600 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-6 bg-zinc-900 border-t border-white/5 relative">
                    {/* Liquid Orb Overlays when listening */}
                    {isListening && (
                        <div className="absolute inset-0 z-20 bg-zinc-900/40 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
                            <div className="relative flex items-center justify-center">
                                {/* Multiple glow layers */}
                                <div className="absolute w-24 h-24 bg-indigo-500/20 rounded-full animate-voice-pulse blur-xl" />
                                <div className="absolute w-20 h-20 bg-purple-500/30 rounded-full animate-voice-pulse delay-700 blur-lg" />

                                <button
                                    onClick={stopListening}
                                    className="relative w-16 h-16 vibrant-gradient rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(99,102,241,0.5)] animate-liquid-orb group active:scale-90 transition-transform"
                                >
                                    <Mic size={28} className="animate-pulse" />
                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">Speak Now</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative group flex items-center gap-3">
                        <button
                            onClick={handleCameraCapture}
                            className={`p-3 rounded-2xl border border-white/10 transition-all ${attachedImage ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                        >
                            <Camera size={20} />
                        </button>

                        <div className="flex-1 relative flex items-center gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder={attachedImage ? "Add a note or send to analyze..." : "Ask AI or type a command..."}
                                    className="w-full h-16 bg-zinc-800/50 border border-white/5 rounded-2xl px-6 pr-14 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all font-medium"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!input.trim() && !attachedImage) || isProcessing}
                                    className="absolute right-3 top-3 w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 disabled:scale-90 disabled:opacity-50 active:scale-90 transition-all"
                                >
                                    <Send size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            <button
                                onClick={startListening}
                                className="w-16 h-16 bg-zinc-800/50 border border-white/10 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 transition-all group"
                            >
                                <Mic size={22} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAssistantModal;
