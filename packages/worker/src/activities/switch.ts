/**
 * Switch node activity implementation
 * Routes items to different outputs based on matching rules
 */
import type { WorkflowNode } from '@twiddle/shared';

interface SwitchParams {
  mode: 'rules' | 'expression';
  dataToMatch?: string;
  rules?: {
    rules?: Rule[];
  };
  cases?: {
    cases?: Case[];
  };
  fallbackOutput: string;
  allMatchingRules?: boolean;
}

interface Rule {
  output: string;
  value: string;
  operation: string;
  compareValue?: string;
}

interface Case {
  output: string;
  value: string;
}

type OutputName = 'output0' | 'output1' | 'output2' | 'output3' | 'fallback';

/**
 * Evaluate a rule condition
 */
function evaluateRule(rule: Rule): boolean {
  const { value, operation, compareValue } = rule;
  
  switch (operation) {
    case 'equals':
      return value === compareValue;
    
    case 'notEquals':
      return value !== compareValue;
    
    case 'contains':
      return String(value).includes(String(compareValue));
    
    case 'startsWith':
      return String(value).startsWith(String(compareValue ?? ''));
    
    case 'endsWith':
      return String(value).endsWith(String(compareValue ?? ''));
    
    case 'regex':
      try {
        return new RegExp(String(compareValue)).test(String(value));
      } catch {
        return false;
      }
    
    case 'gt':
      return Number(value) > Number(compareValue);
    
    case 'lt':
      return Number(value) < Number(compareValue);
    
    case 'isEmpty':
      return value === null || value === undefined || value === '' ||
             (Array.isArray(value) && value.length === 0);
    
    case 'isNotEmpty':
      return !(value === null || value === undefined || value === '' ||
               (Array.isArray(value) && value.length === 0));
    
    default:
      return false;
  }
}

/**
 * Execute Switch node - route to appropriate output(s)
 */
export async function executeSwitch(
  node: WorkflowNode,
  inputData: unknown,
): Promise<{ outputs: OutputName[]; data: unknown }> {
  const params = node.parameters as unknown as SwitchParams;
  const { mode, fallbackOutput, allMatchingRules } = params;
  
  const matchedOutputs: OutputName[] = [];
  
  if (mode === 'rules') {
    // Rules mode - evaluate each rule
    const rules = params.rules?.rules || [];
    
    for (const rule of rules) {
      if (evaluateRule(rule)) {
        matchedOutputs.push(rule.output as OutputName);
        
        // If not sending to all matching, stop at first match
        if (!allMatchingRules) {
          break;
        }
      }
    }
  } else {
    // Expression mode - match value against cases
    const valueToMatch = params.dataToMatch;
    const cases = params.cases?.cases || [];
    
    for (const caseItem of cases) {
      if (valueToMatch === caseItem.value) {
        matchedOutputs.push(caseItem.output as OutputName);
        break; // Expression mode always stops at first match
      }
    }
  }
  
  // If no matches, use fallback
  if (matchedOutputs.length === 0) {
    if (fallbackOutput === 'none') {
      // Drop the item - return empty outputs
      return { outputs: [], data: inputData };
    }
    matchedOutputs.push(fallbackOutput as OutputName);
  }
  
  return {
    outputs: matchedOutputs,
    data: inputData,
  };
}
