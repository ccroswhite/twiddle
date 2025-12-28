import type { ParameterEditorProps } from './types';

export function HtmlExtractNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Input Source
                </label>
                <select
                    value={(parameters.inputSource as string) || 'input_data'}
                    onChange={(e) => updateParameter('inputSource', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="input_data">From previous node (input_data)</option>
                    <option value="field">From specific field</option>
                </select>
            </div>
            {parameters.inputSource === 'field' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Field Name
                    </label>
                    <input
                        type="text"
                        value={(parameters.inputField as string) || ''}
                        onChange={(e) => updateParameter('inputField', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="html_content"
                    />
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Extraction Method
                </label>
                <select
                    value={(parameters.extractionMethod as string) || 'css'}
                    onChange={(e) => updateParameter('extractionMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="css">CSS Selector</option>
                    <option value="xpath">XPath</option>
                    <option value="regex">Regular Expression</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {parameters.extractionMethod === 'xpath' ? 'XPath Expression' :
                        parameters.extractionMethod === 'regex' ? 'Regular Expression' : 'CSS Selector'}
                </label>
                <textarea
                    value={(parameters.selector as string) || ''}
                    onChange={(e) => updateParameter('selector', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-20"
                    placeholder={
                        parameters.extractionMethod === 'xpath' ? '//div[@class="content"]/p' :
                            parameters.extractionMethod === 'regex' ? '<title>(.*?)</title>' : 'div.content > p'
                    }
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Extract
                </label>
                <select
                    value={(parameters.extractType as string) || 'text'}
                    onChange={(e) => updateParameter('extractType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="text">Text Content</option>
                    <option value="html">Inner HTML</option>
                    <option value="attribute">Attribute Value</option>
                    <option value="all">All Matches (array)</option>
                </select>
            </div>
            {parameters.extractType === 'attribute' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Attribute Name
                    </label>
                    <input
                        type="text"
                        value={(parameters.attributeName as string) || ''}
                        onChange={(e) => updateParameter('attributeName', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="href"
                    />
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Output Variable Name
                </label>
                <input
                    type="text"
                    value={(parameters.outputVariable as string) || 'extracted'}
                    onChange={(e) => updateParameter('outputVariable', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="extracted"
                />
            </div>
        </div>
    );
}
