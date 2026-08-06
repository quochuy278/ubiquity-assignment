export type Environment = 'development' | 'production';

export interface ClientConfig {
  app: {
    environment: Environment;
  };
  api: {
    baseUrl: string;
  };
}
