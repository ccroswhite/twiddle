import { registerTester } from '../registry.js';

import { testPostgreSQL } from './postgresql.js';
import { testMySQL } from './mysql.js';
import { testCassandra } from './cassandra.js';
import { testRedis } from './redis.js';
import { testMongo } from './mongo.js';
import { testElasticsearch } from './elasticsearch.js';
import { testPrestoDB } from './prestodb.js';
import { testSnowflake } from './snowflake.js';
import { testOracle } from './oracle.js';
import { testMSSQL } from './mssql.js';
import { testHttpBasicAuth } from './httpbasicauth.js';
import { testHttpBearerToken } from './httpbearertoken.js';
import { testApiKey } from './apiKey.js';
import { testSSH } from './ssh.js';
import { testWinRM } from './winrm.js';
import { testGitHub } from './github.js';
import { testOAuth2 } from './oauth2.js';

export function registerAllTesters() {
  registerTester('postgresqlDatasource', testPostgreSQL);
  registerTester('mysqlDatasource', testMySQL);
  registerTester('cassandraDatasource', testCassandra);
  registerTester('redisDatasource', testRedis);
  registerTester('valkeyDatasource', testRedis); // Valkey uses Redis tester for now
  registerTester('mongoDatasource', testMongo);
  registerTester('elasticsearchDatasource', testElasticsearch);
  registerTester('opensearchDatasource', testElasticsearch); // OpenSearch uses ES tester for now
  registerTester('prestodbDatasource', testPrestoDB);
  registerTester('snowflakeDatasource', testSnowflake);
  registerTester('oracleDatasource', testOracle);
  registerTester('mssqlDatasource', testMSSQL);
  registerTester('httpBasicAuth', testHttpBasicAuth);
  registerTester('httpBearerToken', testHttpBearerToken);
  registerTester('apiKey', testApiKey);
  registerTester('sshDatasource', testSSH);
  registerTester('winrmDatasource', testWinRM);
  registerTester('githubDatasource', testGitHub);
  registerTester('oauth2', testOAuth2);
}
