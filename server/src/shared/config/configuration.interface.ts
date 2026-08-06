export interface ApplicationConfig {
  app: {
    environment: string;
    port: number;
  };
  database: {
    url: string;
    directUrl: string;
    connectionTimeoutMillis: number;
    idleTimeoutMillis: number;
    maxConnections: number;
  };
}
