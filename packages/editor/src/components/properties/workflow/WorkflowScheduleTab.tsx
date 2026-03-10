import type { WorkflowSchedule } from '@/lib/api';

interface WorkflowScheduleTabProps {
    schedule: WorkflowSchedule;
    onUpdateSchedule: (updates: Partial<WorkflowSchedule>) => void;
}

export function WorkflowScheduleTab({
    schedule,
    onUpdateSchedule,
}: WorkflowScheduleTabProps) {
    return (
        <div className="border-b border-slate-200">
            <div className="px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={schedule.enabled}
                        onChange={(e) => onUpdateSchedule({ enabled: e.target.checked })}
                        className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {schedule.enabled && (
                <div className="px-4 pb-3 space-y-3">
                    {/* Mode Selector */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onUpdateSchedule({ mode: 'simple' })}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${schedule.mode === 'simple'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            Simple
                        </button>
                        <button
                            onClick={() => onUpdateSchedule({ mode: 'cron' })}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${schedule.mode === 'cron'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            Advanced
                        </button>
                    </div>

                    {/* Simple Mode */}
                    {schedule.mode === 'simple' && (
                        <div className="space-y-2">
                            {/* Frequency Selector */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Frequency
                                </label>
                                <select
                                    value={schedule.simple?.frequency || 'daily'}
                                    onChange={(e) =>
                                        onUpdateSchedule({
                                            simple: {
                                                ...schedule.simple,
                                                frequency: e.target.value as any,
                                            },
                                        })
                                    }
                                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="minutes">Every N Minutes</option>
                                    <option value="hours">Every N Hours</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            {/* Interval for Minutes/Hours */}
                            {(schedule.simple?.frequency === 'minutes' || schedule.simple?.frequency === 'hours') && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Every
                                    </label>
                                    <select
                                        value={schedule.simple?.interval || (schedule.simple?.frequency === 'minutes' ? 15 : 1)}
                                        onChange={(e) =>
                                            onUpdateSchedule({
                                                simple: {
                                                    frequency: schedule.simple?.frequency || 'daily',
                                                    ...schedule.simple,
                                                    interval: parseInt(e.target.value),
                                                },
                                            })
                                        }
                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {schedule.simple?.frequency === 'minutes' ? (
                                            <>
                                                <option value="5">5 minutes</option>
                                                <option value="10">10 minutes</option>
                                                <option value="15">15 minutes</option>
                                                <option value="30">30 minutes</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="1">1 hour</option>
                                                <option value="2">2 hours</option>
                                                <option value="4">4 hours</option>
                                                <option value="6">6 hours</option>
                                                <option value="12">12 hours</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            )}

                            {/* Time Picker for Daily/Weekly/Monthly */}
                            {schedule.simple?.frequency && ['daily', 'weekly', 'monthly'].includes(schedule.simple.frequency) && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Time
                                    </label>
                                    <input
                                        type="time"
                                        value={schedule.simple?.time || '09:00'}
                                        onChange={(e) =>
                                            onUpdateSchedule({
                                                simple: {
                                                    frequency: schedule.simple?.frequency || 'daily',
                                                    ...schedule.simple,
                                                    time: e.target.value,
                                                },
                                            })
                                        }
                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {/* Days of Week for Weekly */}
                            {schedule.simple?.frequency === 'weekly' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Days of Week
                                    </label>
                                    <div className="flex gap-1">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                                            const isSelected = schedule.simple?.daysOfWeek?.includes(index) || false;
                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        const current = schedule.simple?.daysOfWeek || [];
                                                        const updated = isSelected
                                                            ? current.filter((d: number) => d !== index)
                                                            : [...current, index].sort();
                                                        onUpdateSchedule({
                                                            simple: {
                                                                frequency: schedule.simple?.frequency || 'daily',
                                                                ...schedule.simple,
                                                                daysOfWeek: updated,
                                                            },
                                                        });
                                                    }}
                                                    className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${isSelected
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Day of Month for Monthly */}
                            {schedule.simple?.frequency === 'monthly' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Day of Month
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={schedule.simple?.dayOfMonth || 1}
                                        onChange={(e) =>
                                            onUpdateSchedule({
                                                simple: {
                                                    frequency: schedule.simple?.frequency || 'daily',
                                                    ...schedule.simple,
                                                    dayOfMonth: parseInt(e.target.value),
                                                },
                                            })
                                        }
                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {/* Timezone */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Timezone
                                </label>
                                <select
                                    value={schedule.simple?.timezone || 'UTC'}
                                    onChange={(e) =>
                                        onUpdateSchedule({
                                            simple: {
                                                frequency: schedule.simple?.frequency || 'daily',
                                                ...schedule.simple,
                                                timezone: e.target.value,
                                            },
                                        })
                                    }
                                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">US Eastern</option>
                                    <option value="America/Chicago">US Central</option>
                                    <option value="America/Denver">US Mountain</option>
                                    <option value="America/Los_Angeles">US Pacific</option>
                                    <option value="Europe/London">London</option>
                                    <option value="Europe/Paris">Paris</option>
                                    <option value="Asia/Tokyo">Tokyo</option>
                                    <option value="Asia/Shanghai">Shanghai</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Advanced Mode (Cron) */}
                    {schedule.mode === 'cron' && (
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Cron Expression
                                </label>
                                <input
                                    type="text"
                                    value={schedule.cron || ''}
                                    onChange={(e) => onUpdateSchedule({ cron: e.target.value })}
                                    placeholder="*/15 * * * *"
                                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Format: minute hour day month weekday
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
