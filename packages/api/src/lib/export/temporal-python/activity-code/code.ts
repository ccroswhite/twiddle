/**
 * Code Execution Activity
 */
export function codeActivity(): string {
    return `
async def execute_code(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute custom Python code activity.
    
    The code has access to 'input_data' and should set 'result' variable.
    This activity should be idempotent - avoid side effects.
    """
    params = input.parameters
    code = params.get('code', '')
    
    activity.logger.info(f"[{input.node_name}] Executing custom code")
    
    # Create execution context with input data
    local_vars = {
        'input_data': input.input_data,
        'result': None,
        'activity': activity,
    }
    
    # Execute the code
    exec(code, {'__builtins__': __builtins__}, local_vars)
    
    result = local_vars.get('result')
    if result is None:
        result = input.input_data
    
    activity.logger.info(f"[{input.node_name}] Code execution completed")
    return result
`;
}
