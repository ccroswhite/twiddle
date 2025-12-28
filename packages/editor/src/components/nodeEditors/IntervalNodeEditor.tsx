import type { ParameterEditorProps } from './types';

export function IntervalNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Interval
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={(parameters.intervalValue as number) || 1}
                        onChange={(e) => updateParameter('intervalValue', parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min={1}
                    />
                    <select
                        value={(parameters.intervalUnit as string) || 'minutes'}
                        onChange={(e) => updateParameter('intervalUnit', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Time
                </label>
                <input
                    type="datetime-local"
                    value={(parameters.startTime as string) || ''}
                    onChange={(e) => updateParameter('startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Leave empty to start immediately
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Time (optional)
                </label>
                <input
                    type="datetime-local"
                    value={(parameters.endTime as string) || ''}
                    onChange={(e) => updateParameter('endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Leave empty to run indefinitely
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Timezone
                </label>
                <select
                    value={(parameters.timezone as string) || 'UTC'}
                    onChange={(e) => updateParameter('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (Eastern)</option>
                    <option value="America/Chicago">America/Chicago (Central)</option>
                    <option value="America/Denver">America/Denver (Mountain)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="Asia/Shanghai">Asia/Shanghai</option>
                    <option value="Australia/Sydney">Australia/Sydney</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="skipMissed"
                    checked={(parameters.skipMissed as boolean) ?? true}
                    onChange={(e) => updateParameter('skipMissed', e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="skipMissed" className="text-sm text-slate-700">
                    Skip missed executions (catch up disabled)
                </label>
            </div>
        </div>
    );
}
