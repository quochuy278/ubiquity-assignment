export type Environment = 'development' | 'production';

export interface ClientConfig {
  app: {
    environment: Environment;
  };
  api: {
    baseUrl: string;
    timeoutMs: number;
  };
  realtime: {
    ablyKey: string | null;
  };
}
