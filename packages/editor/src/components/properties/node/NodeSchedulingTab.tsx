import { Clock, RefreshCw, AlertTriangle } from 'lucide-react';

interface NodeSchedulingTabProps {
    parameters: Record<string, unknown>;
    updateParameter: (key: string, value: unknown) => void;
}

export function NodeSchedulingTab({
    parameters,
    updateParameter,
}: NodeSchedulingTabProps) {
    return (
        <div className="space-y-4">
            {/* Timeout Settings */}
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Timeouts
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Start-to-Close Timeout (sec)
                    </label>
                    <input
                        type="number"
                        value={(parameters.startToCloseTimeout as number) || 300}
                        onChange={(e) => updateParameter('startToCloseTimeout', parseInt(e.target.value) || 300)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                        min={1}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                        Max time per execution attempt
                    </p>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Schedule-to-Close Timeout (sec)
                    </label>
                    <input
                        type="number"
                        value={(parameters.scheduleToCloseTimeout as number) || 0}
                        onChange={(e) => updateParameter('scheduleToCloseTimeout', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                        min={0}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                        Total time including retries (0 = unlimited)
                    </p>
                </div>
            </div>

            {/* Retry Settings */}
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    Retry Policy
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <input
                        type="checkbox"
                        id="retryOnFail"
                        checked={(parameters.retryOnFail as boolean) ?? true}
                        onChange={(e) => updateParameter('retryOnFail', e.target.checked)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="retryOnFail" className="text-[13px] font-medium text-slate-700">
                        Retry on failure
                    </label>
                </div>

                {(parameters.retryOnFail ?? true) && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Max Attempts</label>
                            <input
                                type="number"
                                value={(parameters.maxRetries as number) || 3}
                                onChange={(e) => updateParameter('maxRetries', parseInt(e.target.value) || 3)}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                                min={1} max={100}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Interval (s)</label>
                            <input
                                type="number"
                                value={(parameters.retryInterval as number) || 1}
                                onChange={(e) => updateParameter('retryInterval', parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                                min={1}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Backoff Coefficient</label>
                            <input
                                type="number"
                                value={(parameters.backoffCoefficient as number) || 2}
                                onChange={(e) => updateParameter('backoffCoefficient', parseFloat(e.target.value) || 2)}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                                min={1} step={0.1}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                    <AlertTriangle className="w-4 h-4 text-slate-500" />
                    Error Handling
                </div>
                <div className="flex items-start gap-2 mt-2">
                    <input
                        type="checkbox"
                        id="continueOnFail"
                        checked={(parameters.continueOnFail as boolean) ?? false}
                        onChange={(e) => updateParameter('continueOnFail', e.target.checked)}
                        className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                        <label htmlFor="continueOnFail" className="text-[13px] font-medium text-slate-700 block">
                            Continue workflow on failure
                        </label>
                        <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                            If enabled, the workflow will continue to the next step even if this job fails after all retries exhaust.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
