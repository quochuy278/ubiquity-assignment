export interface ApplicationConfig {
  app: {
    corsOrigin: string;
    environment: string;
    port: number;
  };
  auth: {
    accessTokenSecret: string;
  };
  database: {
    url: string;
    directUrl: string;
    connectionTimeoutMillis: number;
    idleTimeoutMillis: number;
    maxConnections: number;
  };
  realtime: {
    ablyKey: string;
  };
}
