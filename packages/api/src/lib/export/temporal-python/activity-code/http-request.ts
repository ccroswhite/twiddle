/**
 * HTTP Request Activity Code
 */
export function httpRequestActivity(): string {
    return `
async def execute_httprequest(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute HTTP request activity.
    
    This activity makes an HTTP request to the specified URL and returns
    the response. It is idempotent for GET requests.
    """
    import aiohttp
    
    params = input.parameters
    url = params.get('url', '')
    method = params.get('method', 'GET').upper()
    headers = params.get('headers', {})
    body = params.get('body')
    timeout = params.get('timeout', 30)
    
    activity.logger.info(f"[{input.node_name}] Making {method} request to {url}")
    
    async with aiohttp.ClientSession() as session:
        async with session.request(
            method=method,
            url=url,
            headers=headers,
            json=body if isinstance(body, dict) else None,
            data=body if isinstance(body, str) else None,
            timeout=aiohttp.ClientTimeout(total=timeout)
        ) as response:
            response_body = await response.text()
            activity.logger.info(f"[{input.node_name}] Response status: {response.status}")
            
            return {
                **input.input_data,
                'http_response': {
                    'status': response.status,
                    'headers': dict(response.headers),
                    'body': response_body
                }
            }
`;
}
