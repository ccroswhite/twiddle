/**
 * CodeViewerModal
 * 
 * Modal for viewing generated code in Temporal or Airflow format.
 * Extracted from WorkflowEditor.tsx for better modularity.
 */

import { Code, X } from 'lucide-react';

export type CodeViewerFormat = 'temporal' | 'airflow';

export interface CodeViewerModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** The format of code to display */
    format: CodeViewerFormat;
    /** Temporal Python code (workflow.py and activities.py) */
    pythonCode: { workflow: string; activities: string } | null;
    /** Airflow code (map of filename to content) */
    airflowCode: Record<string, string> | null;
    /** Whether Airflow code is loading */
    loadingAirflowCode: boolean;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Callback when export button is clicked */
    onExport: (format: CodeViewerFormat) => void;
}

export function CodeViewerModal({
    isOpen,
    format,
    pythonCode,
    airflowCode,
    loadingAirflowCode,
    onClose,
    onExport,
}: CodeViewerModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900">
                        {format === 'temporal' ? 'Temporal Python Code' : 'Airflow DAG Code'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {format === 'temporal' && pythonCode ? (
                        <>
                            <CodeBlock filename="workflow.py" content={pythonCode.workflow} />
                            <CodeBlock filename="activities.py" content={pythonCode.activities} />
                        </>
                    ) : format === 'airflow' ? (
                        loadingAirflowCode ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-slate-500">Loading Airflow code...</div>
                            </div>
                        ) : airflowCode ? (
                            Object.entries(airflowCode).map(([filename, content]) => (
                                <CodeBlock key={filename} filename={filename} content={content} />
                            ))
                        ) : (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-slate-500">Failed to load Airflow code</div>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-slate-500">No code available</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => onExport(format)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Download All Files
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Internal Components
// =============================================================================

interface CodeBlockProps {
    filename: string;
    content: string;
}

function CodeBlock({ filename, content }: CodeBlockProps) {
    return (
        <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Code className="w-4 h-4" />
                {filename}
            </h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{content}</code>
            </pre>
        </div>
    );
}
