/**
 * Database Activities (PostgreSQL, MySQL, MSSQL)
 */

export const databaseActivities = {
    mssql(): string {
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
    },

    postgresql(): string {
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
    },

    mysql(): string {
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
    },
};
