import React from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import { useLanguage } from '../context/LanguageContext';

interface HistoryHeatmapProps {
    data: {
        date: string;
        count: number;
        level: number;
        total?: number;
    }[];
}

const HistoryHeatmap: React.FC<HistoryHeatmapProps> = ({ data }) => {
    const { t } = useLanguage();
    const [hoveredStat, setHoveredStat] = React.useState<string | null>(null);
    const [selectedStat, setSelectedStat] = React.useState<string | null>(null);

    const minimalTheme = {
        light: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
        dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    };

    // Custom color scale for "Premium" look - using primary color from globals if possible, 
    // or just a nice green gradient.
    // Let's use a nice Indigo/Blue gradient to match the likely theme (AdminLTE usually blue/primary)
    // Or stick to green for "Habits" which is classic. Let's stick to a vibrant Green/Teal.
    const customTheme = {
        light: ['#f0fdf4', '#dcfce7', '#86efac', '#22c55e', '#15803d'],
        dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    };

    const [endDate, setEndDate] = React.useState<Date>(new Date());

    const handlePrevMonth = () => {
        const newDate = new Date(endDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setEndDate(newDate);
        setSelectedStat(null); // Clear selection on navigate
    };

    const handleNextMonth = () => {
        const newDate = new Date(endDate);
        newDate.setMonth(newDate.getMonth() + 1);
        const today = new Date();
        if (newDate > today) {
            setEndDate(today);
        } else {
            setEndDate(newDate);
        }
        setSelectedStat(null); // Clear selection on navigate
    };

    // Calculate start date (1 year before end date)
    // Calculate start date (6 months before end date to reduce scrolling)
    // Calculate start date (6 months before end date to reduce scrolling)
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 5); // 5 months back + current month ~= 6 months view
    startDate.setDate(1); // Force start to 1st of month to ensure full month rendered

    // Force end date to end of current month to ensure "Jan" label appears even if partial data
    // (ActivityCalendar needs range to cover enough of the month)
    const displayEndDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

    // Format for ActivityCalendar (YYYY-MM-DD or Date object?)
    // ActivityCalendar usually handles Date objects for blockStart/End if supported, or strings.
    // Let's use strings to be safe with timezone issues, matching the data format.
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const isToday = (d: Date) => {
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    // Filter and pad data to ensure valid range rendering since blockStart/blockEnd might be unreliable
    const calendarData = React.useMemo(() => {
        const startStr = formatDate(startDate);
        const endStr = formatDate(displayEndDate);

        // Filter data within range
        let filtered = data.filter(d => d.date >= startStr && d.date <= endStr);

        // Ensure start and end dates exist to force the range
        // Check if start exists
        if (!filtered.find(d => d.date === startStr)) {
            filtered.unshift({ date: startStr, count: 0, level: 0, total: 0 });
        }
        // Check if end exists
        if (!filtered.find(d => d.date === endStr)) {
            filtered.push({ date: endStr, count: 0, level: 0, total: 0 });
        }

        // Sort just in case
        filtered.sort((a, b) => a.date.localeCompare(b.date));

        return filtered;
    }, [data, startDate, endDate]);

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    React.useLayoutEffect(() => {
        // Immediate scroll attempt after DOM mutation
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
        // Backup timeout
        const timeoutId = setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
            }
        }, 50);
        return () => clearTimeout(timeoutId);
    }, [calendarData, displayEndDate]);

    return (
        <div className="card border-0 shadow-sm rounded-lg overflow-hidden">
            <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex align-items-center">
                <h5 className="font-weight-bold mb-0 text-dark flex-grow-1" style={{ minHeight: '1.5em' }}>
                    {hoveredStat || selectedStat || t('dashboard.habitHistory') || 'Habit History'}
                </h5>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-sm btn-light border-0 rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '32px', height: '32px' }}
                        onClick={handlePrevMonth}
                        title={t('dashboard.heatmap.less') || 'Previous'} // Fallback label
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                        </svg>
                    </button>
                    <button
                        className="btn btn-sm btn-light border-0 rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '32px', height: '32px' }}
                        onClick={handleNextMonth}
                        disabled={isToday(endDate)}
                        title={t('dashboard.heatmap.more') || 'Next'} // Fallback label
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="card-body p-4 d-flex justify-content-center">
                <div
                    ref={scrollContainerRef}
                    style={{ width: '100%', overflowX: 'auto' }}
                >
                    <ActivityCalendar
                        data={calendarData}
                        theme={customTheme}
                        labels={{
                            legend: {
                                less: t('dashboard.heatmap.less') || 'Less',
                                more: t('dashboard.heatmap.more') || 'More',
                            },
                            months: [
                                t('common.months.short.jan'),
                                t('common.months.short.feb'),
                                t('common.months.short.mar'),
                                t('common.months.short.apr'),
                                t('common.months.short.may'),
                                t('common.months.short.jun'),
                                t('common.months.short.jul'),
                                t('common.months.short.aug'),
                                t('common.months.short.sep'),
                                t('common.months.short.oct'),
                                t('common.months.short.nov'),
                                t('common.months.short.dec'),
                            ],
                            weekdays: [
                                t('kanban.days.sun'),
                                t('kanban.days.mon'),
                                t('kanban.days.tue'),
                                t('kanban.days.wed'),
                                t('kanban.days.thu'),
                                t('kanban.days.fri'),
                                t('kanban.days.sat'),
                            ],
                            totalCount: t('dashboard.victoriesInYear'),
                        }}
                        showWeekdayLabels

                        renderBlock={(block, activity) => {
                            const count = activity.count || 0;
                            // Cast to any to access the extra 'total' prop we passed
                            const total = (activity as any).total;

                            let countText = count.toString();
                            if (total !== undefined && total > 0) {
                                countText = `${count}/${total}`;
                            }

                            const tooltipText = (t('dashboard.heatmap.tooltip') || '{{count}} habits on {{date}}')
                                .replace('{{count}}', countText)
                                .replace('{{date}}', activity.date);

                            return React.cloneElement(block, {
                                title: tooltipText,
                                tabIndex: 0,
                                style: { ...block.props.style, cursor: 'pointer', outline: 'none' },
                                onMouseEnter: () => setHoveredStat(tooltipText),
                                onMouseLeave: () => setHoveredStat(null),
                                onFocus: () => setHoveredStat(tooltipText),
                                onBlur: () => setHoveredStat(null),
                                onClick: () => setSelectedStat(prev => prev === tooltipText ? null : tooltipText) // Toggle on click
                            });
                        }}
                        blockSize={14}
                        blockMargin={4}
                        fontSize={12}
                    />
                </div>
            </div>
        </div>
    );
};

export default HistoryHeatmap;
