/**
 * Node Parameter Editor Components
 * 
 * Each node type has a corresponding parameter editor component.
 * This module exports a registry mapping node types to their editors.
 */

// Types
export type { ParameterEditorProps } from './types';

// Editors
export { CodeNodeEditor } from './CodeNodeEditor';
export { HttpRequestNodeEditor } from './HttpRequestNodeEditor';
export { IfNodeEditor } from './IfNodeEditor';
export { SetDataNodeEditor } from './SetDataNodeEditor';
export { RespondToWebhookNodeEditor } from './RespondToWebhookNodeEditor';
export { WebhookNodeEditor } from './WebhookNodeEditor';
export { SshNodeEditor } from './SshNodeEditor';
export { WinrmNodeEditor } from './WinrmNodeEditor';
export { IntervalNodeEditor } from './IntervalNodeEditor';
export { HtmlExtractNodeEditor } from './HtmlExtractNodeEditor';
export { SwitchNodeEditor } from './SwitchNodeEditor';
export { DatabaseNodeEditor } from './DatabaseNodeEditor';
export { DefaultNodeEditor } from './DefaultNodeEditor';
export { EmbeddedWorkflowNodeEditor } from './EmbeddedWorkflowNodeEditor';

// Import for registry
import type { ParameterEditorProps } from './types';
import { CodeNodeEditor } from './CodeNodeEditor';
import { HttpRequestNodeEditor } from './HttpRequestNodeEditor';
import { IfNodeEditor } from './IfNodeEditor';
import { SetDataNodeEditor } from './SetDataNodeEditor';
import { RespondToWebhookNodeEditor } from './RespondToWebhookNodeEditor';
import { WebhookNodeEditor } from './WebhookNodeEditor';
import { SshNodeEditor } from './SshNodeEditor';
import { WinrmNodeEditor } from './WinrmNodeEditor';
import { IntervalNodeEditor } from './IntervalNodeEditor';
import { HtmlExtractNodeEditor } from './HtmlExtractNodeEditor';
import { SwitchNodeEditor } from './SwitchNodeEditor';
import { DatabaseNodeEditor } from './DatabaseNodeEditor';
import { DefaultNodeEditor } from './DefaultNodeEditor';
import { EmbeddedWorkflowNodeEditor } from './EmbeddedWorkflowNodeEditor';

/**
 * Registry mapping node types to their parameter editor components.
 * Each editor receives parameters and updateParameter callback.
 */
export const nodeParameterEditors: Record<string, React.FC<ParameterEditorProps>> = {
    'twiddle.code': CodeNodeEditor,
    'twiddle.httpRequest': HttpRequestNodeEditor,
    'twiddle.if': IfNodeEditor,
    'twiddle.setData': SetDataNodeEditor,
    'twiddle.respondToWebhook': RespondToWebhookNodeEditor,
    'twiddle.webhook': WebhookNodeEditor,
    'twiddle.ssh': SshNodeEditor,
    'twiddle.winrm': WinrmNodeEditor,
    'twiddle.interval': IntervalNodeEditor,
    'twiddle.htmlExtract': HtmlExtractNodeEditor,
    'twiddle.switch': SwitchNodeEditor,
    'twiddle.postgresql': DatabaseNodeEditor,
    'twiddle.mysql': DatabaseNodeEditor,
    'twiddle.mssql': DatabaseNodeEditor,
    'twiddle.embeddedWorkflow': EmbeddedWorkflowNodeEditor,
};

/**
 * Get the parameter editor for a given node type.
 * Returns DefaultNodeEditor if no specific editor is registered.
 */
export function getParameterEditor(nodeType: string): React.FC<ParameterEditorProps> {
    return nodeParameterEditors[nodeType] || DefaultNodeEditor;
}
