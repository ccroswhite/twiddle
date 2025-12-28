/**
 * If/Condition Activity
 */
export function ifActivity(): string {
    return `
async def execute_if(input: ActivityInput) -> Dict[str, Any]:
    """
    Evaluate conditions and determine branch.
    
    Returns the input data with a 'branch' field indicating
    which path to take ('true' or 'false').
    """
    params = input.parameters
    conditions = params.get('conditions', {}).get('conditions', [])
    combine_mode = params.get('combineConditions', 'all')
    
    def evaluate_condition(cond: dict) -> bool:
        left = cond.get('leftValue', '')
        op = cond.get('operation', 'equals')
        right = cond.get('rightValue', '')
        
        if op == 'equals':
            return str(left) == str(right)
        elif op == 'notEquals':
            return str(left) != str(right)
        elif op == 'contains':
            return str(right) in str(left)
        elif op == 'gt':
            return float(left) > float(right)
        elif op == 'lt':
            return float(left) < float(right)
        elif op == 'isEmpty':
            return not left
        elif op == 'isNotEmpty':
            return bool(left)
        return False
    
    results = [evaluate_condition(c) for c in conditions]
    
    if combine_mode == 'all':
        branch_result = all(results) if results else True
    else:
        branch_result = any(results) if results else True
    
    branch = 'true' if branch_result else 'false'
    activity.logger.info(f"[{input.node_name}] Condition evaluated to: {branch}")
    
    return {**input.input_data, 'branch': branch}
`;
}
