import { HttpBasicAuthForm } from './httpBasicAuth';
import { HttpBearerTokenForm } from './httpBearerToken';
import { ApiKeyForm } from './apiKey';
import { Oauth2Form } from './oauth2';
import { WinrmForm } from './winrmDatasource';
import { SshForm } from './sshDatasource';
import { MssqlForm } from './mssqlDatasource';
import { PostgresqlForm } from './postgresqlDatasource';
import { MysqlForm } from './mysqlDatasource';
import { CassandraForm } from './cassandraDatasource';
import { RedisForm } from './redisDatasource';
import { ValkeyForm } from './valkeyDatasource';
import { OpensearchForm } from './opensearchDatasource';
import { ElasticsearchForm } from './elasticsearchDatasource';
import { SnowflakeForm } from './snowflakeDatasource';
import { PrestodbForm } from './prestodbDatasource';
import { OracleForm } from './oracleDatasource';
import { MongoForm } from './mongoDatasource';
import { GithubForm } from './githubDatasource';

import { registerDataSourceForm } from '../registry';

export function registerAllForms() {
  registerDataSourceForm('httpBasicAuth', HttpBasicAuthForm);
  registerDataSourceForm('httpBearerToken', HttpBearerTokenForm);
  registerDataSourceForm('apiKey', ApiKeyForm);
  registerDataSourceForm('oauth2', Oauth2Form);
  registerDataSourceForm('winrmDatasource', WinrmForm);
  registerDataSourceForm('sshDatasource', SshForm);
  registerDataSourceForm('mssqlDatasource', MssqlForm);
  registerDataSourceForm('postgresqlDatasource', PostgresqlForm);
  registerDataSourceForm('mysqlDatasource', MysqlForm);
  registerDataSourceForm('cassandraDatasource', CassandraForm);
  registerDataSourceForm('redisDatasource', RedisForm);
  registerDataSourceForm('valkeyDatasource', ValkeyForm);
  registerDataSourceForm('opensearchDatasource', OpensearchForm);
  registerDataSourceForm('elasticsearchDatasource', ElasticsearchForm);
  registerDataSourceForm('snowflakeDatasource', SnowflakeForm);
  registerDataSourceForm('prestodbDatasource', PrestodbForm);
  registerDataSourceForm('oracleDatasource', OracleForm);
  registerDataSourceForm('mongoDatasource', MongoForm);
  registerDataSourceForm('githubDatasource', GithubForm);
}
