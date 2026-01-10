
import React, { useState } from 'react';
import {
    format, isSameDay, startOfMonth, endOfMonth,
    parseISO, eachDayOfInterval, startOfWeek,
    endOfWeek, isToday, isSameMonth, addMonths, subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PremiumCalendarPickerProps {
    selectedDate: Date;
    onChange: (date: Date) => void;
    className?: string;
}

export const PremiumCalendarPicker: React.FC<PremiumCalendarPickerProps> = ({
    selectedDate,
    onChange,
    className = ""
}) => {
    const [viewDate, setViewDate] = useState(selectedDate || new Date());
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd
    });

    return (
        <div className={`bg-[var(--bg-color)] border border-[var(--border-glass)] rounded-[24px] p-4 shadow-2xl animate-in zoom-in-95 duration-300 ${className}`}>
            <div className="flex items-center justify-between mb-4 px-1">
                <button
                    type="button"
                    onClick={() => setViewDate(subMonths(viewDate, 1))}
                    className="p-1.5 hover:bg-[var(--surface-deep)] rounded-lg text-[var(--text-muted)] transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-main)] italic">
                    {format(viewDate, 'MMMM yyyy')}
                </span>
                <button
                    type="button"
                    onClick={() => setViewDate(addMonths(viewDate, 1))}
                    className="p-1.5 hover:bg-[var(--surface-deep)] rounded-lg text-[var(--text-muted)] transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[7px] font-black text-blue-500/50 uppercase py-1">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const currentMonth = isSameMonth(day, monthStart);
                    const isTxtToday = isToday(day);

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                onChange(day);
                                if (!currentMonth) setViewDate(day);
                            }}
                            className={`
                                aspect-square rounded-xl text-[9px] font-bold flex items-center justify-center transition-all relative
                                ${!currentMonth ? 'text-[var(--text-dim)]/30 scale-95' : 'text-[var(--text-main)]'}
                                ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110 z-10' : 'hover:bg-[var(--surface-deep)]'}
                            `}
                        >
                            {format(day, 'd')}
                            {isTxtToday && !isSelected && (
                                <div className="absolute bottom-1 w-1 h-1 bg-amber-500 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
