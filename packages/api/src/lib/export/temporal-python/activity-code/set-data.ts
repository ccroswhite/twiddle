/**
 * Set Data Activity
 */
export function setDataActivity(): string {
    return `
async def execute_setdata(input: ActivityInput) -> Dict[str, Any]:
    """
    Set or transform data activity.
    
    Adds or modifies fields in the data based on configuration.
    """
    params = input.parameters
    mode = params.get('mode', 'manual')
    
    result = dict(input.input_data) if isinstance(input.input_data, dict) else {}
    
    if mode == 'manual':
        fields = params.get('fields', {}).get('fields', [])
        for field in fields:
            field_name = field.get('name', '')
            field_value = field.get('value', '')
            if field_name:
                result[field_name] = field_value
                activity.logger.info(f"[{input.node_name}] Set {field_name} = {field_value}")
    
    return result
`;
}
