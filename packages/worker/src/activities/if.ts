/**
 * If/conditional activity implementation
 */
import type { WorkflowNode } from '@twiddle/shared';

interface IfParams {
  conditions?: {
    conditions?: Condition[];
  };
  combineConditions?: 'all' | 'any';
  fallbackOutput?: 'true' | 'false' | 'error';
}

interface Condition {
  leftValue?: string;
  operation?: string;
  rightValue?: string;
  caseSensitive?: boolean;
}

/**
 * Evaluate a single condition
 */
function evaluateSingleCondition(condition: Condition, _data: unknown): boolean {
  const { leftValue, operation, rightValue, caseSensitive = true } = condition;
  
  if (!operation) return false;
  
  // Parse the left value (could be a reference like {{$json.field}} or a literal)
  let left: unknown = leftValue;
  let right: unknown = rightValue;
  
  // For case-insensitive string comparisons
  const normalizeForComparison = (val: unknown): string => {
    const str = String(val ?? '');
    return caseSensitive ? str : str.toLowerCase();
  };
  
  switch (operation) {
    // String/General comparisons
    case 'equals':
      return normalizeForComparison(left) === normalizeForComparison(right);
    
    case 'notEquals':
      return normalizeForComparison(left) !== normalizeForComparison(right);
    
    case 'contains':
      return normalizeForComparison(left).includes(normalizeForComparison(right));
    
    case 'notContains':
      return !normalizeForComparison(left).includes(normalizeForComparison(right));
    
    case 'startsWith':
      return normalizeForComparison(left).startsWith(normalizeForComparison(right));
    
    case 'endsWith':
      return normalizeForComparison(left).endsWith(normalizeForComparison(right));
    
    case 'regex':
      try {
        return new RegExp(String(right)).test(String(left));
      } catch {
        return false;
      }
    
    // Numeric comparisons
    case 'gt':
      return Number(left) > Number(right);
    
    case 'gte':
      return Number(left) >= Number(right);
    
    case 'lt':
      return Number(left) < Number(right);
    
    case 'lte':
      return Number(left) <= Number(right);
    
    // Empty/Null checks
    case 'isEmpty':
      return left === null || left === undefined || left === '' || 
             (Array.isArray(left) && left.length === 0) ||
             (typeof left === 'object' && left !== null && Object.keys(left).length === 0);
    
    case 'isNotEmpty':
      return !(left === null || left === undefined || left === '' || 
               (Array.isArray(left) && left.length === 0) ||
               (typeof left === 'object' && left !== null && Object.keys(left).length === 0));
    
    case 'isNull':
      return left === null || left === undefined;
    
    case 'isNotNull':
      return left !== null && left !== undefined;
    
    // Boolean checks
    case 'isTrue':
      return left === true || left === 'true' || left === 1 || left === '1';
    
    case 'isFalse':
      return left === false || left === 'false' || left === 0 || left === '0';
    
    // Type checks
    case 'isNumber':
      return typeof left === 'number' || (typeof left === 'string' && !isNaN(Number(left)) && left !== '');
    
    case 'isString':
      return typeof left === 'string';
    
    case 'isArray':
      return Array.isArray(left);
    
    case 'isObject':
      return typeof left === 'object' && left !== null && !Array.isArray(left);
    
    // Array operations
    case 'arrayContains':
      if (!Array.isArray(left)) return false;
      return left.some(item => normalizeForComparison(item) === normalizeForComparison(right));
    
    case 'arrayLengthEquals':
      if (!Array.isArray(left)) return false;
      return left.length === Number(right);
    
    default:
      console.warn(`Unknown condition operation: ${operation}`);
      return false;
  }
}

/**
 * Execute If node - evaluate conditions and return branch
 */
export async function executeIf(
  node: WorkflowNode,
  inputData: unknown,
): Promise<{ branch: 'true' | 'false'; data: unknown }> {
  const params = node.parameters as unknown as IfParams;
  const fallbackOutput = params.fallbackOutput || 'false';
  const combineMode = params.combineConditions || 'all';
  
  // Extract conditions from the fixedCollection structure
  const conditionsWrapper = params.conditions;
  const conditions = conditionsWrapper?.conditions;
  
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    // No conditions, default to true
    return { branch: 'true', data: inputData };
  }
  
  try {
    // Evaluate all conditions
    const results = conditions.map((condition) => 
      evaluateSingleCondition(condition, inputData)
    );
    
    // Combine results based on mode
    let finalResult: boolean;
    if (combineMode === 'all') {
      finalResult = results.every((r) => r);
    } else {
      finalResult = results.some((r) => r);
    }
    
    return {
      branch: finalResult ? 'true' : 'false',
      data: inputData,
    };
  } catch (error) {
    // Handle evaluation errors based on fallbackOutput setting
    if (fallbackOutput === 'error') {
      throw error;
    }
    
    console.warn('Condition evaluation failed, using fallback:', error);
    return {
      branch: fallbackOutput as 'true' | 'false',
      data: inputData,
    };
  }
}
