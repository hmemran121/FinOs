
import React, { useState } from 'react';
import { supabase } from "../../services/supabase";
import { useFinance } from '../../store/FinanceContext';
import { useFeedback } from '../../store/FeedbackContext';
import { GlassCard } from '../ui/GlassCard';
import { X, Send, AlertTriangle, CheckCircle, Radio } from 'lucide-react';

interface UpdateSignalModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UpdateSignalModal: React.FC<UpdateSignalModalProps> = ({ isOpen, onClose }) => {
    const { user } = useFinance();
    const { showFeedback } = useFeedback();
    const [updateType, setUpdateType] = useState<'global_data' | 'ai' | 'system'>('global_data');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handlePushSignal = async () => {
        if (!message.trim()) return;
        setLoading(true);
        try {
            // Deactivate all previous signals to avoid clutter
            await supabase.from('system_update_signals').update({ is_active: false }).eq('is_active', true);

            // Insert new signal
            const { error } = await supabase.from('system_update_signals').insert({
                triggered_by: user?.id,
                update_type: updateType,
                message: message,
                is_active: true
            });

            if (error) throw error;
            setSuccess(true);
            showFeedback('Update signal pushed successfully.', 'success');
            setTimeout(() => {
                setSuccess(false);
                onClose();
                setMessage('');
            }, 1500);
        } catch (err) {
            console.error('Failed to push signal:', err);
            showFeedback('Failed to push update signal.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md">
                <GlassCard className="p-6 relative overflow-hidden">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>

                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <Radio className="text-emerald-400" /> Push Update Signal
                    </h2>
                    <p className="text-sm text-white/50 mb-6">
                        Notify all users of a new update. This does not force a sync, but shows a banner.
                    </p>

                    <div className="space-y-4">
                        {/* Type Selection */}
                        <div className="grid grid-cols-3 gap-2">
                            {['global_data', 'ai', 'system'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setUpdateType(type as any)}
                                    className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${updateType === type
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                        }`}
                                >
                                    {type.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {/* Message Input */}
                        <div>
                            <label className="text-xs font-bold text-white/60 uppercase mb-2 block">Notification Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="e.g. New AI Models Available! Refresh to see changes."
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 min-h-[100px]"
                            />
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handlePushSignal}
                            disabled={loading || !message.trim()}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${success
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white text-black hover:bg-white/90'
                                }`}
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> :
                                success ? <><CheckCircle size={20} /> Signal Sent</> :
                                    <><Send size={18} /> Push Notification</>}
                        </button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};
