/**
 * Set Data activity implementation
 */
import type { WorkflowNode } from '@twiddle/shared';

interface SetDataParams {
  mode?: 'manual' | 'json';
  fields?: Array<{ name: string; value: unknown }>;
  jsonData?: string;
  keepOnlySet?: boolean;
}

/**
 * Execute Set Data node - set or modify data fields
 */
export async function executeSetData(
  node: WorkflowNode,
  inputData: unknown,
): Promise<unknown> {
  const params = node.parameters as SetDataParams;
  const mode = params.mode || 'manual';
  const keepOnlySet = params.keepOnlySet || false;

  let newData: Record<string, unknown>;

  if (keepOnlySet) {
    newData = {};
  } else {
    // Start with existing data
    if (typeof inputData === 'object' && inputData !== null) {
      newData = { ...inputData as Record<string, unknown> };
    } else {
      newData = { value: inputData };
    }
  }

  if (mode === 'manual') {
    // Set fields from manual configuration
    const fields = params.fields || [];
    for (const field of fields) {
      if (field.name) {
        setNestedValue(newData, field.name, field.value);
      }
    }
  } else if (mode === 'json') {
    // Parse and merge JSON data
    const jsonData = params.jsonData || '{}';
    try {
      const parsed = JSON.parse(jsonData);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.assign(newData, parsed);
      }
    } catch (error) {
      throw new Error(`Invalid JSON data: ${(error as Error).message}`);
    }
  }

  return newData;
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}
