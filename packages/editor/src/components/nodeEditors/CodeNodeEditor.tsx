import { Code } from 'lucide-react';
import type { ParameterEditorProps } from './types';

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
