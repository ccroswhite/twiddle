/**
 * Python Export Generator
 * Generates standalone Python Temporal applications from Twiddle workflows
 */

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, unknown>;
  position: { x: number; y: number };
  credentials?: Record<string, unknown>;
  // Temporal Activity Options
  startToCloseTimeout?: number;
  scheduleToCloseTimeout?: number;
  retryOnFail?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  backoffCoefficient?: number;
  continueOnFail?: boolean;
}

// Trigger nodes are not activities - they start workflows
const TRIGGER_NODE_TYPES = new Set([
  'twiddle.manualTrigger',
  'twiddle.webhook',
  'twiddle.interval',
]);

// Check if a node type is an activity (not a trigger)
function isActivityNode(nodeType: string): boolean {
  return !TRIGGER_NODE_TYPES.has(nodeType);
}

interface WorkflowConnection {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

/**
 * Convert workflow name to valid Python identifier
 */
function toPythonIdentifier(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, '_$1') || 'workflow';
}

/**
 * Convert node type to Python function name
 */
function nodeTypeToFunctionName(nodeType: string): string {
  const parts = nodeType.split('.');
  const name = parts[parts.length - 1];
  return `execute_${name.toLowerCase()}`;
}

/**
 * Generate Python activity code for a node type
 */
function generateActivityCode(nodeType: string): string {
  switch (nodeType) {
    case 'twiddle.httpRequest':
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

    case 'twiddle.code':
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

    case 'twiddle.if':
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

    case 'twiddle.setData':
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

    case 'twiddle.ssh':
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

    case 'twiddle.mssql':
      return `
async def execute_mssql(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute SQL query on Microsoft SQL Server.
    
    Connection details should be provided via environment variables.
    """
    import pymssql
    
    params = input.parameters
    query = params.get('query', '')
    
    host = get_env('MSSQL_HOST', 'localhost')
    port = get_env('MSSQL_PORT', '1433')
    user = get_env('MSSQL_USER', 'sa')
    password = get_env('MSSQL_PASSWORD')
    database = get_env('MSSQL_DB', 'master')
    
    activity.logger.info(f"[{input.node_name}] Executing SQL on {host}:{port}/{database}")
    
    conn = pymssql.connect(
        server=f"{host}:{port}",
        user=user,
        password=password,
        database=database
    )
    
    try:
        cursor = conn.cursor(as_dict=True)
        cursor.execute(query)
        rows = cursor.fetchall()
        
        return {
            **input.input_data,
            'sql_result': {
                'rows': rows,
                'rowCount': len(rows),
                'success': True
            }
        }
    finally:
        conn.close()
`;

    case 'twiddle.postgresql':
      return `
async def execute_postgresql(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute SQL query on PostgreSQL.
    
    Connection details should be provided via environment variables.
    """
    import asyncpg
    
    params = input.parameters
    query = params.get('query', '')
    
    host = get_env('POSTGRES_HOST', 'localhost')
    port = int(get_env('POSTGRES_PORT', '5432'))
    user = get_env('POSTGRES_USER', 'postgres')
    password = get_env('POSTGRES_PASSWORD')
    database = get_env('POSTGRES_DB', 'postgres')
    
    activity.logger.info(f"[{input.node_name}] Executing SQL on {host}:{port}/{database}")
    
    conn = await asyncpg.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database
    )
    
    try:
        rows = await conn.fetch(query)
        
        return {
            **input.input_data,
            'sql_result': {
                'rows': [dict(row) for row in rows],
                'rowCount': len(rows),
                'success': True
            }
        }
    finally:
        await conn.close()
`;

    case 'twiddle.mysql':
      return `
async def execute_mysql(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute SQL query on MySQL.
    
    Connection details should be provided via environment variables.
    """
    import aiomysql
    
    params = input.parameters
    query = params.get('query', '')
    
    host = get_env('MYSQL_HOST', 'localhost')
    port = int(get_env('MYSQL_PORT', '3306'))
    user = get_env('MYSQL_USER', 'root')
    password = get_env('MYSQL_PASSWORD')
    database = get_env('MYSQL_DB', 'mysql')
    
    activity.logger.info(f"[{input.node_name}] Executing SQL on {host}:{port}/{database}")
    
    conn = await aiomysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        db=database
    )
    
    try:
        async with conn.cursor(aiomysql.DictCursor) as cursor:
            await cursor.execute(query)
            rows = await cursor.fetchall()
            
            return {
                **input.input_data,
                'sql_result': {
                    'rows': list(rows),
                    'rowCount': len(rows),
                    'success': True
                }
            }
    finally:
        conn.close()
`;

    case 'twiddle.oracle':
      return `
async def execute_oracle(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute SQL query on Oracle Database.
    
    Connection details should be provided via environment variables.
    Uses oracledb in thin mode (no Oracle Client required).
    """
    import oracledb
    
    params = input.parameters
    query = params.get('query', '')
    
    host = get_env('ORACLE_HOST', 'localhost')
    port = get_env('ORACLE_PORT', '1521')
    user = get_env('ORACLE_USER')
    password = get_env('ORACLE_PASSWORD')
    service_name = get_env('ORACLE_SERVICE', 'ORCL')
    
    activity.logger.info(f"[{input.node_name}] Executing SQL on {host}:{port}/{service_name}")
    
    dsn = f"{host}:{port}/{service_name}"
    
    conn = oracledb.connect(user=user, password=password, dsn=dsn)
    
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [col[0] for col in cursor.description] if cursor.description else []
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        return {
            **input.input_data,
            'sql_result': {
                'rows': rows,
                'rowCount': len(rows),
                'success': True
            }
        }
    finally:
        conn.close()
`;

    case 'twiddle.cassandra':
      return `
async def execute_cassandra(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute CQL query on Cassandra.
    
    Connection details should be provided via environment variables.
    """
    from cassandra.cluster import Cluster
    from cassandra.auth import PlainTextAuthProvider
    
    params = input.parameters
    query = params.get('query', '')
    
    hosts = get_env('CASSANDRA_HOSTS', 'localhost').split(',')
    port = int(get_env('CASSANDRA_PORT', '9042'))
    username = get_env('CASSANDRA_USER')
    password = get_env('CASSANDRA_PASSWORD')
    keyspace = get_env('CASSANDRA_KEYSPACE')
    
    activity.logger.info(f"[{input.node_name}] Executing CQL on {hosts}")
    
    auth_provider = None
    if username and password:
        auth_provider = PlainTextAuthProvider(username=username, password=password)
    
    cluster = Cluster(hosts, port=port, auth_provider=auth_provider)
    session = cluster.connect(keyspace) if keyspace else cluster.connect()
    
    try:
        result = session.execute(query)
        rows = [dict(row._asdict()) for row in result]
        
        return {
            **input.input_data,
            'cql_result': {
                'rows': rows,
                'rowCount': len(rows),
                'success': True
            }
        }
    finally:
        cluster.shutdown()
`;

    case 'twiddle.redis':
      return `
async def execute_redis(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute Redis command.
    
    Connection details should be provided via environment variables.
    Supports ACL authentication (username + password).
    """
    import redis.asyncio as redis
    
    params = input.parameters
    command = params.get('command', 'PING')
    args = params.get('args', [])
    
    host = get_env('REDIS_HOST', 'localhost')
    port = int(get_env('REDIS_PORT', '6379'))
    username = get_env('REDIS_USER')
    password = get_env('REDIS_PASSWORD')
    db = int(get_env('REDIS_DB', '0'))
    use_tls = get_env('REDIS_TLS', 'false').lower() == 'true'
    
    activity.logger.info(f"[{input.node_name}] Executing Redis command: {command}")
    
    client = redis.Redis(
        host=host,
        port=port,
        username=username or None,
        password=password or None,
        db=db,
        ssl=use_tls,
        decode_responses=True
    )
    
    try:
        result = await client.execute_command(command, *args)
        
        return {
            **input.input_data,
            'redis_result': {
                'response': result,
                'success': True
            }
        }
    finally:
        await client.aclose()
`;

    case 'twiddle.valkey':
      return `
async def execute_valkey(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute Valkey command (Redis-compatible).
    
    Connection details should be provided via environment variables.
    """
    import redis.asyncio as redis
    
    params = input.parameters
    command = params.get('command', 'PING')
    args = params.get('args', [])
    
    host = get_env('VALKEY_HOST', 'localhost')
    port = int(get_env('VALKEY_PORT', '6379'))
    username = get_env('VALKEY_USER')
    password = get_env('VALKEY_PASSWORD')
    db = int(get_env('VALKEY_DB', '0'))
    use_tls = get_env('VALKEY_TLS', 'false').lower() == 'true'
    
    activity.logger.info(f"[{input.node_name}] Executing Valkey command: {command}")
    
    client = redis.Redis(
        host=host,
        port=port,
        username=username or None,
        password=password or None,
        db=db,
        ssl=use_tls,
        decode_responses=True
    )
    
    try:
        result = await client.execute_command(command, *args)
        
        return {
            **input.input_data,
            'valkey_result': {
                'response': result,
                'success': True
            }
        }
    finally:
        await client.aclose()
`;

    case 'twiddle.opensearch':
      return `
async def execute_opensearch(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute OpenSearch query.
    
    Connection details should be provided via environment variables.
    """
    from opensearchpy import OpenSearch
    
    params = input.parameters
    index = params.get('index', '')
    query = params.get('query', {'query': {'match_all': {}}})
    
    host = get_env('OPENSEARCH_HOST', 'localhost')
    port = int(get_env('OPENSEARCH_PORT', '9200'))
    username = get_env('OPENSEARCH_USER')
    password = get_env('OPENSEARCH_PASSWORD')
    use_tls = get_env('OPENSEARCH_TLS', 'false').lower() == 'true'
    
    activity.logger.info(f"[{input.node_name}] Querying OpenSearch index: {index}")
    
    client = OpenSearch(
        hosts=[{'host': host, 'port': port}],
        http_auth=(username, password) if username and password else None,
        use_ssl=use_tls,
        verify_certs=not get_env('OPENSEARCH_ALLOW_SELF_SIGNED', 'false').lower() == 'true'
    )
    
    try:
        if isinstance(query, str):
            import json
            query = json.loads(query)
        
        result = client.search(index=index, body=query)
        
        return {
            **input.input_data,
            'opensearch_result': {
                'hits': result.get('hits', {}).get('hits', []),
                'total': result.get('hits', {}).get('total', {}).get('value', 0),
                'success': True
            }
        }
    finally:
        client.close()
`;

    case 'twiddle.elasticsearch':
      return `
async def execute_elasticsearch(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute Elasticsearch query.
    
    Connection details should be provided via environment variables.
    """
    from elasticsearch import Elasticsearch
    
    params = input.parameters
    index = params.get('index', '')
    query = params.get('query', {'query': {'match_all': {}}})
    
    host = get_env('ELASTICSEARCH_HOST', 'localhost')
    port = int(get_env('ELASTICSEARCH_PORT', '9200'))
    username = get_env('ELASTICSEARCH_USER')
    password = get_env('ELASTICSEARCH_PASSWORD')
    api_key = get_env('ELASTICSEARCH_API_KEY')
    use_tls = get_env('ELASTICSEARCH_TLS', 'false').lower() == 'true'
    
    activity.logger.info(f"[{input.node_name}] Querying Elasticsearch index: {index}")
    
    if api_key:
        client = Elasticsearch(
            hosts=[f"{'https' if use_tls else 'http'}://{host}:{port}"],
            api_key=api_key,
            verify_certs=not get_env('ELASTICSEARCH_ALLOW_SELF_SIGNED', 'false').lower() == 'true'
        )
    else:
        client = Elasticsearch(
            hosts=[f"{'https' if use_tls else 'http'}://{host}:{port}"],
            basic_auth=(username, password) if username and password else None,
            verify_certs=not get_env('ELASTICSEARCH_ALLOW_SELF_SIGNED', 'false').lower() == 'true'
        )
    
    try:
        if isinstance(query, str):
            import json
            query = json.loads(query)
        
        result = client.search(index=index, body=query)
        
        return {
            **input.input_data,
            'elasticsearch_result': {
                'hits': result.get('hits', {}).get('hits', []),
                'total': result.get('hits', {}).get('total', {}).get('value', 0),
                'success': True
            }
        }
    finally:
        client.close()
`;

    case 'twiddle.snowflake':
      return `
async def execute_snowflake(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute SQL query on Snowflake.
    
    Connection details should be provided via environment variables.
    """
    import snowflake.connector
    
    params = input.parameters
    query = params.get('query', '')
    
    account = get_env('SNOWFLAKE_ACCOUNT')
    user = get_env('SNOWFLAKE_USER')
    password = get_env('SNOWFLAKE_PASSWORD')
    warehouse = get_env('SNOWFLAKE_WAREHOUSE')
    database = get_env('SNOWFLAKE_DATABASE')
    schema = get_env('SNOWFLAKE_SCHEMA', 'PUBLIC')
    role = get_env('SNOWFLAKE_ROLE')
    
    activity.logger.info(f"[{input.node_name}] Executing SQL on Snowflake {account}")
    
    conn = snowflake.connector.connect(
        account=account,
        user=user,
        password=password,
        warehouse=warehouse,
        database=database,
        schema=schema,
        role=role or None
    )
    
    try:
        cursor = conn.cursor(snowflake.connector.DictCursor)
        cursor.execute(query)
        rows = cursor.fetchall()
        
        return {
            **input.input_data,
            'sql_result': {
                'rows': list(rows),
                'rowCount': len(rows),
                'success': True
            }
        }
    finally:
        conn.close()
`;

    case 'twiddle.prestodb':
      return `
async def execute_prestodb(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute SQL query on PrestoDB/Trino.
    
    Connection details should be provided via environment variables.
    """
    from prestodb.dbapi import connect as presto_connect
    from prestodb.auth import BasicAuthentication
    
    params = input.parameters
    query = params.get('query', '')
    
    host = get_env('PRESTO_HOST', 'localhost')
    port = int(get_env('PRESTO_PORT', '8080'))
    user = get_env('PRESTO_USER', 'presto')
    password = get_env('PRESTO_PASSWORD')
    catalog = get_env('PRESTO_CATALOG', 'hive')
    schema = get_env('PRESTO_SCHEMA', 'default')
    
    activity.logger.info(f"[{input.node_name}] Executing SQL on Presto {host}:{port}")
    
    auth = BasicAuthentication(user, password) if password else None
    
    conn = presto_connect(
        host=host,
        port=port,
        user=user,
        catalog=catalog,
        schema=schema,
        auth=auth
    )
    
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [col[0] for col in cursor.description] if cursor.description else []
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        return {
            **input.input_data,
            'sql_result': {
                'rows': rows,
                'rowCount': len(rows),
                'success': True
            }
        }
    finally:
        conn.close()
`;

    case 'twiddle.winrm':
      return `
async def execute_winrm(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute command on Windows via WinRM.
    
    Connection details should be provided via environment variables.
    """
    import winrm
    
    params = input.parameters
    command = params.get('command', '')
    use_powershell = params.get('powershell', True)
    
    host = get_env('WINRM_HOST')
    username = get_env('WINRM_USER')
    password = get_env('WINRM_PASSWORD')
    use_https = get_env('WINRM_HTTPS', 'false').lower() == 'true'
    
    activity.logger.info(f"[{input.node_name}] Executing WinRM command on {host}")
    
    protocol = 'https' if use_https else 'http'
    port = '5986' if use_https else '5985'
    
    session = winrm.Session(
        f"{protocol}://{host}:{port}/wsman",
        auth=(username, password),
        transport='ntlm'
    )
    
    if use_powershell:
        result = session.run_ps(command)
    else:
        result = session.run_cmd(command)
    
    return {
        **input.input_data,
        'winrm_result': {
            'stdout': result.std_out.decode('utf-8', errors='replace'),
            'stderr': result.std_err.decode('utf-8', errors='replace'),
            'exit_code': result.status_code,
            'success': result.status_code == 0
        }
    }
`;

    case 'twiddle.mongodb':
      return `
async def execute_mongodb(input: ActivityInput) -> Dict[str, Any]:
    """
    Execute MongoDB query.
    
    Connection details should be provided via environment variables.
    """
    from pymongo import MongoClient
    
    params = input.parameters
    collection_name = params.get('collection', '')
    operation = params.get('operation', 'find')
    query = params.get('query', {})
    
    host = get_env('MONGODB_HOST', 'localhost')
    port = int(get_env('MONGODB_PORT', '27017'))
    username = get_env('MONGODB_USER')
    password = get_env('MONGODB_PASSWORD')
    database = get_env('MONGODB_DATABASE', 'test')
    auth_source = get_env('MONGODB_AUTH_SOURCE', 'admin')
    
    activity.logger.info(f"[{input.node_name}] Executing MongoDB {operation} on {collection_name}")
    
    if username and password:
        uri = f"mongodb://{username}:{password}@{host}:{port}/{database}?authSource={auth_source}"
    else:
        uri = f"mongodb://{host}:{port}/{database}"
    
    client = MongoClient(uri)
    db = client[database]
    collection = db[collection_name]
    
    try:
        if isinstance(query, str):
            import json
            query = json.loads(query)
        
        if operation == 'find':
            result = list(collection.find(query))
            # Convert ObjectId to string for serialization
            for doc in result:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])
        elif operation == 'find_one':
            result = collection.find_one(query)
            if result and '_id' in result:
                result['_id'] = str(result['_id'])
        elif operation == 'count':
            result = collection.count_documents(query)
        elif operation == 'aggregate':
            result = list(collection.aggregate(query))
            for doc in result:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])
        else:
            result = None
        
        return {
            **input.input_data,
            'mongodb_result': {
                'data': result,
                'success': True
            }
        }
    finally:
        client.close()
`;

    default:
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
}

/**
 * Helper to converting JS values to Python literals
 */
function toPythonValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'None';
  }
  if (value === true) {
    return 'True';
  }
  if (value === false) {
    return 'False';
  }
  if (Array.isArray(value)) {
    return `[${value.map(toPythonValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => `'${k}': ${toPythonValue(v)}`
    );
    return `{${entries.join(', ')}}`;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value); // Strings are compatible mostly, but we use JSON.stringify to handle escapes
  }
  return String(value);
}

/**
 * Generate activity execution code for a node with proper options
 */
function generateActivityExecution(node: WorkflowNode, index: number): string {
  const funcName = nodeTypeToFunctionName(node.type);
  const nodeVarName = `node_${index}_result`;
  const nodeName = node.name || node.type.split('.').pop() || 'unknown';

  // Get activity options with defaults
  const startToCloseTimeout = node.startToCloseTimeout || 300;
  const scheduleToCloseTimeout = node.scheduleToCloseTimeout || 0;
  const retryOnFail = node.retryOnFail !== false; // Default true
  const maxRetries = node.maxRetries || 3;
  const retryInterval = node.retryInterval || 1;
  const backoffCoefficient = node.backoffCoefficient || 2.0;
  const continueOnFail = node.continueOnFail || false;

  // Build retry policy if retries are enabled
  let retryPolicyCode = '';
  if (retryOnFail) {
    retryPolicyCode = `
        retry_policy=RetryPolicy(
            initial_interval=timedelta(seconds=${retryInterval}),
            backoff_coefficient=${backoffCoefficient},
            maximum_attempts=${maxRetries},
        ),`;
  } else {
    retryPolicyCode = `
        retry_policy=RetryPolicy(maximum_attempts=1),`;
  }

  // Build timeout options
  let timeoutCode = `
        start_to_close_timeout=timedelta(seconds=${startToCloseTimeout}),`;

  if (scheduleToCloseTimeout > 0) {
    timeoutCode += `
        schedule_to_close_timeout=timedelta(seconds=${scheduleToCloseTimeout}),`;
  }

  // Generate the activity call
  // We use toPythonValue for parameters to ensure True/False/None are correct
  const parametersDict = toPythonValue(node.parameters || {});

  let activityCall = `
        # Activity ${index + 1}: ${nodeName}
        try:
            ${nodeVarName} = await workflow.execute_activity(
                ${funcName},
                ActivityInput(
                    node_id="${node.id}",
                    node_name="${nodeName}",
                    node_type="${node.type}",
                    parameters=${parametersDict},
                    input_data=result,
                ),${timeoutCode}${retryPolicyCode}
            )
            result = ${nodeVarName}`;

  if (continueOnFail) {
    activityCall += `
        except Exception as e:
            workflow.logger.warning(f"Activity '${nodeName}' failed but continuing: {e}")
            # Continue with previous result`;
  } else {
    activityCall += `
        except Exception as e:
            workflow.logger.error(f"Activity '${nodeName}' failed: {e}")
            raise`;
  }

  return activityCall;
}

/**
 * Generate the main workflow file
 */
function generateWorkflowFile(workflow: WorkflowData): string {
  const workflowName = toPythonIdentifier(workflow.name);
  const workflowClassName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1) + 'Workflow';
  const nodes = workflow.nodes as WorkflowNode[];
  const connections = workflow.connections as WorkflowConnection[];

  // Build execution order from connections (for future graph traversal)
  void connections; // Used for topology

  // Filter to only activity nodes (not triggers)
  const activityNodes = nodes.filter(n => isActivityNode(n.type));

  // Generate node execution calls with proper activity options
  const nodeExecutions = activityNodes
    .map((node, index) => generateActivityExecution(node, index))
    .join('\n');

  return `"""
${workflow.name}
${workflow.description || 'Generated from Twiddle workflow'}

Auto-generated Temporal workflow with durable activity execution.
Each activity is idempotent and has configurable retry and timeout policies.
"""
import os
from datetime import timedelta
from dataclasses import dataclass
from typing import Any, Dict, Optional

from temporalio import workflow
from temporalio.common import RetryPolicy

# Import Twiddle DSL types
from twiddle_dsl import ActivityInput

with workflow.unsafe.imports_passed_through():
    from activities import (
${activityNodes.map(n => `        ${nodeTypeToFunctionName(n.type)},`).join('\n')}
    )


@workflow.defn
class ${workflowClassName}:
    """
    ${workflow.description || workflow.name}
    
    This is a Temporal workflow that orchestrates a series of activities.
    Each activity is durable - if the worker crashes, Temporal will resume
    execution from the last completed activity.
    """
    
    @workflow.run
    async def run(self, input_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute the workflow.
        
        Args:
            input_data: Optional input data to pass to the first activity
            
        Returns:
            The result from the final activity
        """
        result = input_data or {}
        
        workflow.logger.info(f"Starting workflow with input: {result}")
${nodeExecutions || '        # No activities to execute\n        pass'}
        
        workflow.logger.info(f"Workflow completed with result: {result}")
        return result
`;
}

/**
 * Generate the activities file with enhanced execution logging
 */
function generateActivitiesFile(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = [...new Set(nodes.filter(n => isActivityNode(n.type)).map(n => n.type))];

  const activities = nodeTypes
    .map(nodeType => {
      const activityCode = generateActivityCode(nodeType);
      const funcName = nodeTypeToFunctionName(nodeType);

      // Stack decorators: activity.defn for Temporal, with_execution_logging for structured events
      return `
@activity.defn(name="${funcName}")
@with_execution_logging
${activityCode}`;
    })
    .join('\n');

  return `"""
Activity implementations for the workflow.

Each activity is:
- Idempotent: Safe to retry without side effects
- Durable: State is persisted by Temporal
- Configurable: Retry policies and timeouts are set by the workflow

Execution Logging:
- All activities emit structured JSON execution events
- Events: ACTIVITY_STARTED, ACTIVITY_COMPLETED, ACTIVITY_FAILED, ACTIVITY_RETRY
- Use these events to build waterfall visualizations
"""
import os
from typing import Any, Dict

from temporalio import activity

# Import Twiddle DSL components for consistent execution logging
from twiddle_dsl import ActivityInput, ExecutionLogger, with_execution_logging


def get_env(key: str, default: str = "") -> str:
    """Get environment variable with optional default."""
    return os.environ.get(key, default)

${activities}
`;
}




/**
 * Generate the worker file that runs the workflow and activities
 */
function generateWorkerFile(workflow: WorkflowData): string {
  const workflowName = toPythonIdentifier(workflow.name);
  const workflowClassName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1) + 'Workflow';

  // Get all activity function names
  const nodes = workflow.nodes as WorkflowNode[];
  const activityNodes = nodes.filter(n => isActivityNode(n.type));
  // Deduplicate node types
  const nodeTypes = [...new Set(activityNodes.map(n => n.type))];
  const activityFunctions = nodeTypes.map(t => nodeTypeToFunctionName(t));

  const activityImports = activityFunctions.length > 0
    ? `
from activities import (
${activityFunctions.map(f => `    ${f},`).join('\n')}
)`
    : '';

  return `"""
Worker for ${workflow.name}

This script starts a Temporal Worker that listens to the task queue
and executes workflows and activities.
"""
import asyncio
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor

from temporalio.client import Client
from temporalio.worker import Worker

from workflow import ${workflowClassName}
${activityImports}

# Configure logging
logging.basicConfig(
    level=os.environ.get('LOG_LEVEL', 'INFO').upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("worker")

# Configuration
TEMPORAL_HOST = os.environ.get('TEMPORAL_HOST', 'localhost:7233')
TEMPORAL_NAMESPACE = os.environ.get('TEMPORAL_NAMESPACE', 'default')
TASK_QUEUE = "${workflowName}"


async def main():
    logger.info(f"Starting worker for task queue: {TASK_QUEUE}")
    logger.info(f"Connecting to Temporal server at {TEMPORAL_HOST}...")

    try:
        client = await Client.connect(
            TEMPORAL_HOST,
            namespace=TEMPORAL_NAMESPACE,
        )
        logger.info("Connected to Temporal server")
    except Exception as e:
        logger.error(f"Failed to connect to Temporal server: {e}")
        logger.error("Ensure Temporal server is running and reachable")
        sys.exit(1)

    # Create worker
    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[${workflowClassName}],
        activities=[
${activityFunctions.map(f => `            ${f},`).join('\n')}
        ],
        # Thread pool for synchronous activities if needed
        activity_executor=ThreadPoolExecutor(max_workers=10),
    )

    logger.info("Worker started, waiting for tasks...")
    try:
        await worker.run()
    except asyncio.CancelledError:
        logger.info("Worker stopped")
    except Exception as e:
        logger.error(f"Worker failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupt received, shutting down")
`;
}


/**
 * Generate the starter/client file
 */
function generateStarterFile(workflow: WorkflowData): string {
  const workflowName = toPythonIdentifier(workflow.name);
  const workflowClassName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1) + 'Workflow';

  return `"""
Start the ${workflow.name} workflow

This script connects to Temporal and starts a workflow execution.
Configure the Temporal server address via environment variables.

Task Queue: ${workflowName}
  """
  import argparse
import asyncio
import json
import logging
import os
import sys
import uuid

    from dotenv import load_dotenv
    from temporalio.client import Client

    from workflow import ${workflowClassName}

# Load environment variables from.env file
  load_dotenv()

# Workflow configuration
  WORKFLOW_NAME = "${workflowName}"
  TASK_QUEUE = WORKFLOW_NAME  # Task queue matches workflow name

# Configure logging
  logging.basicConfig(
    level = logging.INFO,
    format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
  )
  logger = logging.getLogger(WORKFLOW_NAME)


def get_temporal_host() -> str:
  """Get Temporal server address from environment."""
  return os.environ.get('TEMPORAL_HOST', 'localhost:7233')


def get_temporal_namespace() -> str:
  """Get Temporal namespace from environment."""
  return os.environ.get('TEMPORAL_NAMESPACE', 'default')


async def start_workflow(input_data: dict = None, wait_for_result: bool = True, workflow_id: str = None) -> dict:
  """
    Start a workflow execution.

    Args:
  input_data: Optional input data to pass to the workflow
  wait_for_result: If True, wait for the workflow to complete
  workflow_id: Optional custom workflow ID(auto - generated if not provided)

  Returns:
        The workflow result if wait_for_result is True, otherwise the workflow ID
  """
  temporal_host = get_temporal_host()
  namespace = get_temporal_namespace()

  logger.info(f"=== Starting ${workflow.name} ===")
  logger.info(f"Temporal Server: {temporal_host}")
  logger.info(f"Namespace: {namespace}")
  logger.info(f"Task Queue: {TASK_QUEUE}")

  try:
  client = await Client.connect(
    temporal_host,
    namespace = namespace,
  )
    except Exception as e:
  logger.error(f"Failed to connect to Temporal server: {e}")
  logger.error("Make sure Temporal server is running and accessible")
  sys.exit(1)
    
    # Generate a unique workflow ID if not provided
  if not workflow_id:
    workflow_id = f"{WORKFLOW_NAME}-{uuid.uuid4().hex[:8]}"

  logger.info(f"Workflow ID: {workflow_id}")
  logger.info(f"Input data: {json.dumps(input_data, default=str)}")
    
    # Start the workflow
  handle = await client.start_workflow(
    ${workflowClassName}.run,
    id = workflow_id,
    task_queue = TASK_QUEUE,
    arg = input_data or {},
  )

  logger.info(f"Workflow started successfully!")
  logger.info(f"View in Temporal UI: http://localhost:8080/namespaces/{namespace}/workflows/{workflow_id}")

  if wait_for_result:
    logger.info("Waiting for workflow to complete...")
  try:
  result = await handle.result()
  logger.info(f"Workflow completed!")
  logger.info(f"Result: {json.dumps(result, indent=2, default=str)}")
  return result
        except Exception as e:
  logger.error(f"Workflow failed: {e}")
  raise
    else:
  return { "workflow_id": workflow_id, "status": "started" }


async def main():
  """Main entry point with CLI argument parsing."""
  parser = argparse.ArgumentParser(
    description = 'Start the ${workflow.name} workflow',
    formatter_class = argparse.RawDescriptionHelpFormatter,
    epilog = """
Examples:
    python starter.py
  python starter.py--input '{"key": "value"}'
  python starter.py--id my - custom - id--no - wait
        """
  )
  parser.add_argument(
    '--input', '-i',
    type = str,
    help = 'JSON input data for the workflow',
        default='{}'
  )
  parser.add_argument(
    '--id',
    type = str,
    help = 'Custom workflow ID (auto-generated if not provided)',
        default=None
  )
  parser.add_argument(
    '--no-wait',
    action = 'store_true',
    help = 'Start the workflow without waiting for the result'
  )

  args = parser.parse_args()

  try:
  input_data = json.loads(args.input)
    except json.JSONDecodeError as e:
  logger.error(f"Invalid JSON input: {e}")
  sys.exit(1)

  await start_workflow(
    input_data = input_data,
    wait_for_result = not args.no_wait,
    workflow_id = args.id
  )


  if __name__ == "__main__":
    asyncio.run(main())
`;
}

/**
 * Generate requirements.txt based on node types used
 */
function generateRequirements(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = new Set(nodes.map(n => n.type));

  const requirements: string[] = [
    '# Twiddle DSL',
    'twiddle-dsl>=1.0.0',
    '',
    '# Temporal SDK',
    'temporalio>=1.4.0',
    '',
    '# HTTP requests',
    'aiohttp>=3.9.0',
    '',
    '# Utilities',
    'python-dotenv>=1.0.0',
  ];

  // Add SSH dependencies
  if (nodeTypes.has('twiddle.ssh')) {
    requirements.push('', '# SSH', 'asyncssh>=2.14.0', 'cryptography>=41.0.0');
  }

  // Add WinRM dependencies
  if (nodeTypes.has('twiddle.winrm')) {
    requirements.push('', '# WinRM', 'pywinrm>=0.4.3');
  }

  // Add PostgreSQL dependencies
  if (nodeTypes.has('twiddle.postgresql') || nodes.some(n => n.type.includes('credential.postgresqlDatasource'))) {
    requirements.push('', '# PostgreSQL', 'asyncpg>=0.29.0', 'psycopg2-binary>=2.9.9');
  }

  // Add MySQL dependencies
  if (nodeTypes.has('twiddle.mysql') || nodes.some(n => n.type.includes('credential.mysqlDatasource'))) {
    requirements.push('', '# MySQL', 'aiomysql>=0.2.0', 'PyMySQL>=1.1.0');
  }

  // Add MSSQL dependencies
  if (nodeTypes.has('twiddle.mssql') || nodes.some(n => n.type.includes('credential.mssqlDatasource'))) {
    requirements.push('', '# Microsoft SQL Server', 'pymssql>=2.2.11');
  }

  // Add Redis dependencies
  if (nodeTypes.has('twiddle.redis') || nodes.some(n => n.type.includes('credential.redisDatasource'))) {
    requirements.push('', '# Redis', 'redis>=5.0.0', 'aioredis>=2.0.1');
  }

  // Add Valkey dependencies (Redis-compatible)
  if (nodeTypes.has('twiddle.valkey') || nodes.some(n => n.type.includes('credential.valkeyDatasource'))) {
    requirements.push('', '# Valkey (Redis-compatible)', 'redis>=5.0.0');
  }

  // Add Cassandra dependencies
  if (nodeTypes.has('twiddle.cassandra') || nodes.some(n => n.type.includes('credential.cassandraDatasource'))) {
    requirements.push('', '# Cassandra', 'cassandra-driver>=3.29.0');
  }

  // Add OpenSearch/Elasticsearch dependencies
  if (nodeTypes.has('twiddle.opensearch') || nodes.some(n => n.type.includes('credential.opensearchDatasource'))) {
    requirements.push('', '# OpenSearch', 'opensearch-py>=2.4.0');
  }

  if (nodeTypes.has('twiddle.elasticsearch') || nodes.some(n => n.type.includes('credential.elasticsearchDatasource'))) {
    requirements.push('', '# Elasticsearch', 'elasticsearch>=8.11.0');
  }

  // Add Snowflake dependencies
  if (nodeTypes.has('twiddle.snowflake') || nodes.some(n => n.type.includes('credential.snowflakeDatasource'))) {
    requirements.push('', '# Snowflake', 'snowflake-connector-python>=3.6.0');
  }

  // Add PrestoDB dependencies
  if (nodeTypes.has('twiddle.prestodb') || nodes.some(n => n.type.includes('credential.prestodbDatasource'))) {
    requirements.push('', '# PrestoDB', 'presto-python-client>=0.8.4');
  }

  // Add Oracle dependencies
  if (nodeTypes.has('twiddle.oracle') || nodes.some(n => n.type.includes('credential.oracleDatasource'))) {
    requirements.push('', '# Oracle', 'oracledb>=2.0.0');
  }

  // Add MongoDB dependencies
  if (nodeTypes.has('twiddle.mongodb') || nodes.some(n => n.type.includes('credential.mongodbDatasource'))) {
    requirements.push('', '# MongoDB', 'pymongo>=4.6.0');
  }

  // Add WinRM dependencies
  if (nodeTypes.has('twiddle.winrm')) {
    requirements.push('', '# WinRM', 'pywinrm>=0.4.3');
  }

  return requirements.join('\n') + '\n';
}

/**
 * Generate README.md
 */
function generateReadme(workflow: WorkflowData): string {
  const workflowName = toPythonIdentifier(workflow.name);

  return `# ${workflow.name}

${workflow.description || 'A Temporal workflow generated from Twiddle.'}

## Prerequisites

Before running this workflow, ensure the following services are running:

- ** Temporal Server ** - The workflow orchestration engine
    - Any databases or services used by your workflow nodes

## Quick Start with Docker

  \`\`\`bash
# Configure your environment
cp .env.example .env
# Edit .env with your Temporal and database connection settings

# Build and start the worker
./run.sh build
./run.sh start

# Execute the workflow
./run.sh run-workflow

# View logs
./run.sh logs

# Stop the worker
./run.sh stop
\`\`\`

## Manual Setup (Without Docker)

### Prerequisites

- Python 3.9+
- Temporal server running locally

### Setup

1. Create a virtual environment:
   \`\`\`bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. Copy and configure environment:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your settings
   \`\`\`

4. Start Temporal server (if not already running):
   \`\`\`bash
   temporal server start-dev
   \`\`\`

### Running

1. Start the worker:
   \`\`\`bash
   python worker.py
   \`\`\`

2. In another terminal, start a workflow:
   \`\`\`bash
   python starter.py
   \`\`\`

## Files

| File | Description |
|------|-------------|
| \`workflow.py\` | Main workflow definition |
| \`activities.py\` | Activity implementations |
| \`worker.py\` | Worker that executes workflows |
| \`starter.py\` | Script to start workflow executions |
| \`requirements.txt\` | Python dependencies |
| \`Dockerfile\` | Docker image definition |
| \`docker-compose.yml\` | Multi-container Docker setup |
| \`run.sh\` | Helper script for Docker operations |
| \`.env.example\` | Example environment configuration |

## Docker Commands

| Command | Description |
|---------|-------------|
| \`./run.sh start\` | Start all services |
| \`./run.sh stop\` | Stop all services |
| \`./run.sh restart\` | Restart all services |
| \`./run.sh logs\` | View logs |
| \`./run.sh build\` | Rebuild Docker image |
| \`./run.sh run-workflow\` | Execute the workflow |
| \`./run.sh shell\` | Open shell in worker container |
| \`./run.sh clean\` | Remove containers and volumes |

## Configuration

Environment variables (set in \`.env\` or docker-compose.yml):

| Variable | Default | Description |
|----------|---------|-------------|
| \`TEMPORAL_HOST\` | localhost:7233 | Temporal server address |
| \`TEMPORAL_NAMESPACE\` | default | Temporal namespace |
| \`METRICS_PORT\` | (disabled) | Port for Prometheus metrics endpoint |

## Task Queue

This workflow uses the task queue: \`${workflowName}\`

The task queue name matches the workflow name for easy identification in the Temporal UI.

## Metrics

When \`METRICS_PORT\` is set, the worker exposes Prometheus metrics at:
\`http://localhost:<METRICS_PORT>/metrics\`

Key metrics include:
- \`temporal_workflow_completed\` - Completed workflows
- \`temporal_workflow_failed\` - Failed workflows  
- \`temporal_activity_execution_latency\` - Activity execution time
- \`temporal_activity_schedule_to_start_latency\` - Time waiting for worker

All metrics include labels for \`workflow_type\` and \`task_queue\` (\`${workflowName}\`).

## Temporal UI

When running with Docker, access the Temporal UI at: http://localhost:8080

Filter by task queue \`${workflowName}\` to see only this workflow's executions.
`;
}

/**
 * Generate .env.example file
 */
function generateEnvExample(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = new Set(nodes.map(n => n.type));

  const workflowName = toPythonIdentifier(workflow.name);

  let envContent = `# ${workflow.name} Configuration
# Generated by Twiddle

# Temporal Configuration
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default

# Task queue (matches workflow name)
# TASK_QUEUE=${workflowName}

# Prometheus Metrics (optional)
# Set to enable metrics endpoint on this port
# METRICS_PORT=9090
`;

  // Add database-specific env vars
  if (nodeTypes.has('twiddle.postgresql') || nodes.some(n => n.type.includes('credential.postgresqlDatasource'))) {
    envContent += `
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=mydb
`;
  }

  if (nodeTypes.has('twiddle.mysql') || nodes.some(n => n.type.includes('credential.mysqlDatasource'))) {
    envContent += `
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DB=mydb
`;
  }

  if (nodeTypes.has('twiddle.mssql') || nodes.some(n => n.type.includes('credential.mssqlDatasource'))) {
    envContent += `
# SQL Server Configuration
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=password
MSSQL_DB=mydb
`;
  }

  if (nodeTypes.has('twiddle.redis') || nodes.some(n => n.type.includes('credential.redisDatasource'))) {
    envContent += `
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USER=
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false
`;
  }

  if (nodeTypes.has('twiddle.valkey') || nodes.some(n => n.type.includes('credential.valkeyDatasource'))) {
    envContent += `
# Valkey Configuration
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_USER=
VALKEY_PASSWORD=
VALKEY_DB=0
VALKEY_TLS=false
`;
  }

  if (nodeTypes.has('twiddle.oracle') || nodes.some(n => n.type.includes('credential.oracleDatasource'))) {
    envContent += `
# Oracle Configuration
ORACLE_HOST=localhost
ORACLE_PORT=1521
ORACLE_USER=
ORACLE_PASSWORD=
ORACLE_SERVICE=ORCL
`;
  }

  if (nodeTypes.has('twiddle.cassandra') || nodes.some(n => n.type.includes('credential.cassandraDatasource'))) {
    envContent += `
# Cassandra Configuration
CASSANDRA_HOSTS=localhost
CASSANDRA_PORT=9042
CASSANDRA_USER=
CASSANDRA_PASSWORD=
CASSANDRA_KEYSPACE=
`;
  }

  if (nodeTypes.has('twiddle.opensearch') || nodes.some(n => n.type.includes('credential.opensearchDatasource'))) {
    envContent += `
# OpenSearch Configuration
OPENSEARCH_HOST=localhost
OPENSEARCH_PORT=9200
OPENSEARCH_USER=
OPENSEARCH_PASSWORD=
OPENSEARCH_TLS=false
OPENSEARCH_ALLOW_SELF_SIGNED=false
`;
  }

  if (nodeTypes.has('twiddle.elasticsearch') || nodes.some(n => n.type.includes('credential.elasticsearchDatasource'))) {
    envContent += `
# Elasticsearch Configuration
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_USER=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_API_KEY=
ELASTICSEARCH_TLS=false
ELASTICSEARCH_ALLOW_SELF_SIGNED=false
`;
  }

  if (nodeTypes.has('twiddle.snowflake') || nodes.some(n => n.type.includes('credential.snowflakeDatasource'))) {
    envContent += `
# Snowflake Configuration
SNOWFLAKE_ACCOUNT=
SNOWFLAKE_USER=
SNOWFLAKE_PASSWORD=
SNOWFLAKE_WAREHOUSE=
SNOWFLAKE_DATABASE=
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_ROLE=
`;
  }

  if (nodeTypes.has('twiddle.prestodb') || nodes.some(n => n.type.includes('credential.prestodbDatasource'))) {
    envContent += `
# PrestoDB/Trino Configuration
PRESTO_HOST=localhost
PRESTO_PORT=8080
PRESTO_USER=presto
PRESTO_PASSWORD=
PRESTO_CATALOG=hive
PRESTO_SCHEMA=default
`;
  }

  if (nodeTypes.has('twiddle.mongodb') || nodes.some(n => n.type.includes('credential.mongodbDatasource'))) {
    envContent += `
# MongoDB Configuration
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USER=
MONGODB_PASSWORD=
MONGODB_DATABASE=test
MONGODB_AUTH_SOURCE=admin
`;
  }

  if (nodeTypes.has('twiddle.winrm')) {
    envContent += `
# WinRM Configuration
WINRM_HOST=
WINRM_USER=
WINRM_PASSWORD=
WINRM_HTTPS=false
`;
  }

  if (nodeTypes.has('twiddle.ssh')) {
    envContent += `
# SSH Configuration
SSH_HOST=
SSH_PORT=22
SSH_USERNAME=
SSH_PASSWORD=
SSH_PRIVATE_KEY_PATH=
`;
  }

  return envContent;
}

/**
 * Generate Dockerfile
 */
function generateDockerfile(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = new Set(nodes.map(n => n.type));

  // Determine if we need special system dependencies
  const needsMssql = nodeTypes.has('twiddle.mssql') || nodes.some(n => n.type.includes('credential.mssqlDatasource'));
  const needsOracle = nodeTypes.has('twiddle.oracle') || nodes.some(n => n.type.includes('credential.oracleDatasource'));
  const needsSsh = nodeTypes.has('twiddle.ssh');

  let systemDeps = 'gcc libffi-dev';

  if (needsMssql) {
    systemDeps += ' freetds-dev';
  }

  if (needsOracle) {
    systemDeps += ' libaio1';
  }

  if (needsSsh) {
    systemDeps += ' openssh-client';
  }

  return `# Dockerfile for ${workflow.name}
# Generated by Twiddle

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    ${systemDeps} \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV TEMPORAL_HOST=temporal:7233
ENV TEMPORAL_NAMESPACE=default

# Default command runs the worker
CMD ["python", "worker.py"]
`;
}

/**
 * Generate docker-compose.yml (worker only - assumes external services)
 */
function generateDockerCompose(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = new Set(nodes.map(n => n.type));

  let envVars = `      - TEMPORAL_HOST=\${TEMPORAL_HOST:-localhost:7233}
      - TEMPORAL_NAMESPACE=\${TEMPORAL_NAMESPACE:-default}`;

  // Add database environment variables if needed
  if (nodeTypes.has('twiddle.postgresql') || nodes.some(n => n.type.includes('credential.postgresqlDatasource'))) {
    envVars += `
      - POSTGRES_HOST=\${POSTGRES_HOST:-localhost}
      - POSTGRES_PORT=\${POSTGRES_PORT:-5432}
      - POSTGRES_USER=\${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD:-}
      - POSTGRES_DB=\${POSTGRES_DB:-postgres}`;
  }

  if (nodeTypes.has('twiddle.mysql') || nodes.some(n => n.type.includes('credential.mysqlDatasource'))) {
    envVars += `
      - MYSQL_HOST=\${MYSQL_HOST:-localhost}
      - MYSQL_PORT=\${MYSQL_PORT:-3306}
      - MYSQL_USER=\${MYSQL_USER:-root}
      - MYSQL_PASSWORD=\${MYSQL_PASSWORD:-}
      - MYSQL_DB=\${MYSQL_DB:-mysql}`;
  }

  if (nodeTypes.has('twiddle.mssql') || nodes.some(n => n.type.includes('credential.mssqlDatasource'))) {
    envVars += `
      - MSSQL_HOST=\${MSSQL_HOST:-localhost}
      - MSSQL_PORT=\${MSSQL_PORT:-1433}
      - MSSQL_USER=\${MSSQL_USER:-sa}
      - MSSQL_PASSWORD=\${MSSQL_PASSWORD:-}
      - MSSQL_DB=\${MSSQL_DB:-master}`;
  }

  if (nodeTypes.has('twiddle.redis') || nodeTypes.has('twiddle.valkey') ||
    nodes.some(n => n.type.includes('credential.redisDatasource') || n.type.includes('credential.valkeyDatasource'))) {
    envVars += `
      - REDIS_HOST=\${REDIS_HOST:-localhost}
      - REDIS_PORT=\${REDIS_PORT:-6379}
      - REDIS_PASSWORD=\${REDIS_PASSWORD:-}`;
  }

  return `# Docker Compose for ${workflow.name}
# Generated by Twiddle
#
# This runs ONLY the workflow worker.
# External services (Temporal, databases) must be running separately.
#
# Configure connection settings in .env file or environment variables.

version: '3.8'

services:
  # Workflow Worker
  worker:
    build: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
${envVars}
    # Use host network to connect to services running on the host
    # Alternatively, configure specific service addresses in .env
    # network_mode: host
`;
}

/**
 * Generate run.sh script
 */
function generateRunScript(workflow: WorkflowData): string {
  return `#!/bin/bash
# Run script for ${workflow.name}
# Generated by Twiddle

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo -e "\${GREEN}=== ${workflow.name} ===\${NC}"
echo ""

# Check for required commands
command -v docker >/dev/null 2>&1 || { echo -e "\${RED}Docker is required but not installed.\${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || { echo -e "\${RED}Docker Compose is required but not installed.\${NC}" >&2; exit 1; }

# Determine docker compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

case "\${1:-help}" in
    start)
        echo -e "\${YELLOW}Starting all services...\${NC}"
        $COMPOSE_CMD up -d
        echo -e "\${GREEN}Services started!\${NC}"
        echo ""
        echo "Temporal UI: http://localhost:8080"
        echo ""
        echo "To view logs: ./run.sh logs"
        echo "To stop: ./run.sh stop"
        ;;
    
    stop)
        echo -e "\${YELLOW}Stopping all services...\${NC}"
        $COMPOSE_CMD down
        echo -e "\${GREEN}Services stopped.\${NC}"
        ;;
    
    restart)
        echo -e "\${YELLOW}Restarting all services...\${NC}"
        $COMPOSE_CMD restart
        echo -e "\${GREEN}Services restarted.\${NC}"
        ;;
    
    logs)
        $COMPOSE_CMD logs -f \${2:-}
        ;;
    
    build)
        echo -e "\${YELLOW}Building Docker image...\${NC}"
        $COMPOSE_CMD build
        echo -e "\${GREEN}Build complete.\${NC}"
        ;;
    
    run-workflow)
        echo -e "\${YELLOW}Starting workflow execution...\${NC}"
        docker exec -it \$(docker ps -qf "name=worker") python starter.py
        ;;
    
    shell)
        echo -e "\${YELLOW}Opening shell in worker container...\${NC}"
        docker exec -it \$(docker ps -qf "name=worker") /bin/bash
        ;;
    
    clean)
        echo -e "\${YELLOW}Removing all containers and volumes...\${NC}"
        $COMPOSE_CMD down -v
        echo -e "\${GREEN}Cleanup complete.\${NC}"
        ;;
    
    help|*)
        echo "Usage: ./run.sh <command>"
        echo ""
        echo "Commands:"
        echo "  start         Start all services (Temporal, worker, databases)"
        echo "  stop          Stop all services"
        echo "  restart       Restart all services"
        echo "  logs [svc]    View logs (optionally for specific service)"
        echo "  build         Build Docker image"
        echo "  run-workflow  Execute the workflow"
        echo "  shell         Open shell in worker container"
        echo "  clean         Remove all containers and volumes"
        echo "  help          Show this help message"
        ;;
esac
`;
}

/**
 * Generate .dockerignore file
 */
function generateDockerignore(): string {
  return `# Docker ignore file
.git
.gitignore
.env
.env.local
*.pyc
__pycache__
*.pyo
*.pyd
.Python
venv
.venv
env
*.egg-info
dist
build
.pytest_cache
.coverage
htmlcov
.mypy_cache
*.log
.DS_Store
Thumbs.db
`;
}

/**
 * Generated Python code for database storage
 */
export interface GeneratedPythonCode {
  pythonWorkflow: string;
  pythonActivities: string;
  pythonRequirements: string;
}

/**
 * Generate Python code for database storage
 */
export function generatePythonCode(workflow: WorkflowData): GeneratedPythonCode {
  return {
    pythonWorkflow: generateWorkflowFile(workflow),
    pythonActivities: generateActivitiesFile(workflow),
    pythonRequirements: generateRequirements(workflow),
  };
}

/**
 * Main export function - generates all files for download
 */
export function generatePythonExport(workflow: WorkflowData): Record<string, string> {
  return {
    'workflow.py': generateWorkflowFile(workflow),
    'activities.py': generateActivitiesFile(workflow),
    'worker.py': generateWorkerFile(workflow),
    'starter.py': generateStarterFile(workflow),
    'requirements.txt': generateRequirements(workflow),
    'Dockerfile': generateDockerfile(workflow),
    'docker-compose.yml': generateDockerCompose(workflow),
    'run.sh': generateRunScript(workflow),
    '.dockerignore': generateDockerignore(),
    '.env.example': generateEnvExample(workflow),
    'README.md': generateReadme(workflow),
  };
}
