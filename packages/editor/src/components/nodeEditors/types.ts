/**
 * Shared types for node parameter editors
 */
export interface ParameterEditorProps {
    parameters: Record<string, unknown>;
    updateParameter: (key: string, value: unknown) => void;
}
