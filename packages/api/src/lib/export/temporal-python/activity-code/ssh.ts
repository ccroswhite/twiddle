/**
 * SSH Activity
 */
export function sshActivity(): string {
    return `
async def execute_ssh(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute SSH command on remote host.
    
    Connects to a remote host via SSH and executes a command.
    Credentials should be provided via environment variables for security.
    """
    import asyncssh
    
    params = input.parameters
    host = params.get('host', '') or get_env('SSH_HOST')
    port = int(params.get('port', 22) or get_env('SSH_PORT', '22'))
    username = params.get('username', '') or get_env('SSH_USERNAME')
    password = params.get('password') or get_env('SSH_PASSWORD')
    private_key_path = get_env('SSH_PRIVATE_KEY_PATH')
    command = params.get('command', '')
    
    activity.logger.info(f"[{input.node_name}] Connecting to {host}:{port} as {username}")
    
    connect_kwargs = {
        'host': host,
        'port': port,
        'username': username,
        'known_hosts': None,  # Disable host key checking (configure properly in production)
    }
    
    if password:
        connect_kwargs['password'] = password
    elif private_key_path:
        connect_kwargs['client_keys'] = [private_key_path]
    
    async with asyncssh.connect(**connect_kwargs) as conn:
        result = await conn.run(command)
        activity.logger.info(f"[{input.node_name}] Command exit code: {result.exit_status}")
        
        return {
            **input.input_data,
            'ssh_result': {
                'stdout': result.stdout,
                'stderr': result.stderr,
                'exit_code': result.exit_status
            }
        }
`;
}
