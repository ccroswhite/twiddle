-- Rename credential types from xxxCredentials to xxxDatasource
-- This migration updates existing credential records to match the new naming convention

UPDATE "Credential" SET type = 'postgresqlDatasource' WHERE type = 'postgresqlCredentials';
UPDATE "Credential" SET type = 'mysqlDatasource' WHERE type = 'mysqlCredentials';
UPDATE "Credential" SET type = 'mssqlDatasource' WHERE type = 'mssqlCredentials';
UPDATE "Credential" SET type = 'oracleDatasource' WHERE type = 'oracleCredentials';
UPDATE "Credential" SET type = 'cassandraDatasource' WHERE type = 'cassandraCredentials';
UPDATE "Credential" SET type = 'redisDatasource' WHERE type = 'redisCredentials';
UPDATE "Credential" SET type = 'valkeyDatasource' WHERE type = 'valkeyCredentials';
UPDATE "Credential" SET type = 'opensearchDatasource' WHERE type = 'opensearchCredentials';
UPDATE "Credential" SET type = 'elasticsearchDatasource' WHERE type = 'elasticsearchCredentials';
UPDATE "Credential" SET type = 'snowflakeDatasource' WHERE type = 'snowflakeCredentials';
UPDATE "Credential" SET type = 'prestodbDatasource' WHERE type = 'prestodbCredentials';
UPDATE "Credential" SET type = 'sshDatasource' WHERE type = 'sshCredentials';
UPDATE "Credential" SET type = 'winrmDatasource' WHERE type = 'winrmCredentials';
UPDATE "Credential" SET type = 'githubDatasource' WHERE type = 'githubCredentials';
