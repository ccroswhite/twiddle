/**
 * Node Parameter Editor Components
 * 
 * Each node type has a corresponding parameter editor component.
 * This file exports a registry mapping node types to their editors.
 */

import { Code } from 'lucide-react';

// =============================================================================
// Common Types
// =============================================================================

export interface ParameterEditorProps {
    parameters: Record<string, unknown>;
    updateParameter: (key: string, value: unknown) => void;
}

// =============================================================================
// Code Node Editor
// =============================================================================

const DEFAULT_PYTHON_CODE = `# Python code for this activity
# Available variables:
#   - input_data: dict containing input from previous nodes
#   - context: workflow context with helper methods
#
# Return a dict with output data for next nodes

def execute(input_data: dict, context) -> dict:
    """
    Execute custom Python code.
    
    Args:
        input_data: Data from previous nodes
        context: Workflow context
        
    Returns:
        dict: Output data for next nodes
    """
    result = {}
    
    # Your code here
    
    return result
`;

export function CodeNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Python Code
                </label>
                <div className="relative">
                    <textarea
                        value={(parameters.code as string) || DEFAULT_PYTHON_CODE}
                        onChange={(e) => updateParameter('code', e.target.value)}
                        className="w-full h-96 px-4 py-3 font-mono text-sm bg-slate-900 text-green-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        placeholder="# Enter your Python code here..."
                        spellCheck={false}
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                        <Code className="w-3 h-3" />
                        Python
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Write Python code that will be executed as a Temporal activity.
                    The function should accept input_data and context parameters.
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Timeout (seconds)
                </label>
                <input
                    type="number"
                    value={(parameters.timeout as number) || 300}
                    onChange={(e) => updateParameter('timeout', parseInt(e.target.value) || 300)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>
        </div>
    );
}

// =============================================================================
// HTTP Request Node Editor
// =============================================================================

export function HttpRequestNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    URL
                </label>
                <input
                    type="text"
                    value={(parameters.url as string) || ''}
                    onChange={(e) => updateParameter('url', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://api.example.com/endpoint"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Method
                </label>
                <select
                    value={(parameters.method as string) || 'GET'}
                    onChange={(e) => updateParameter('method', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Headers (JSON)
                </label>
                <textarea
                    value={(parameters.headers as string) || '{}'}
                    onChange={(e) => updateParameter('headers', e.target.value)}
                    className="w-full h-20 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder='{"Content-Type": "application/json"}'
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Body
                </label>
                <textarea
                    value={(parameters.body as string) || ''}
                    onChange={(e) => updateParameter('body', e.target.value)}
                    className="w-full h-24 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Request body (JSON for POST/PUT/PATCH)"
                />
            </div>
        </div>
    );
}

// =============================================================================
// If Node Editor
// =============================================================================

export function IfNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Condition Expression
                </label>
                <textarea
                    value={(parameters.condition as string) || ''}
                    onChange={(e) => updateParameter('condition', e.target.value)}
                    className="w-full h-20 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="input['value'] > 100"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Python expression that evaluates to True or False.
                    Use 'input' to access data from the previous node.
                </p>
            </div>
        </div>
    );
}

// =============================================================================
// SetData Node Editor
// =============================================================================

export function SetDataNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data (JSON)
                </label>
                <textarea
                    value={(parameters.data as string) || '{}'}
                    onChange={(e) => updateParameter('data', e.target.value)}
                    className="w-full h-32 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder='{"key": "value"}'
                />
                <p className="text-xs text-slate-500 mt-1">
                    Static data to output from this node in JSON format.
                </p>
            </div>
        </div>
    );
}

// =============================================================================
// Default Editor (fallback)
// =============================================================================

export function DefaultNodeEditor() {
    return (
        <div className="text-sm text-slate-500 py-4">
            No additional parameters for this node type.
        </div>
    );
}

// =============================================================================
// Editor Registry
// =============================================================================

/**
 * Registry mapping node types to their parameter editor components.
 * Each editor receives parameters and updateParameter callback.
 */
export const nodeParameterEditors: Record<string, React.FC<ParameterEditorProps>> = {
    'twiddle.code': CodeNodeEditor,
    'twiddle.httpRequest': HttpRequestNodeEditor,
    'twiddle.if': IfNodeEditor,
    'twiddle.setData': SetDataNodeEditor,
};

/**
 * Get the parameter editor for a given node type.
 * Returns DefaultNodeEditor if no specific editor is registered.
 */
export function getParameterEditor(nodeType: string): React.FC<ParameterEditorProps> {
    return nodeParameterEditors[nodeType] || DefaultNodeEditor;
}
