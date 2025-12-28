/**
 * Default Activity (fallback for unregistered node types)
 */
export function defaultActivity(nodeType: string): string {
    const funcName = nodeType.split('.').pop()?.toLowerCase() || 'unknown';
    return `
async def execute_${funcName}(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute ${nodeType} activity.
    
    TODO: Implement the specific logic for this activity type.
    """
    activity.logger.info(f"[{input.node_name}] Executing ${nodeType}")
    
    # Placeholder implementation - passes through input data
    return input.input_data
`;
}
