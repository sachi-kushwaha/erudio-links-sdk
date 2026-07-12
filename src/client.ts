import { FetchClient, type ClientConfig } from './fetch';
import { LinksResource } from './resources/links';
import { AnalyticsResource } from './resources/analytics';

export class Erudio {
  public links: LinksResource;
  public analytics: AnalyticsResource;
  private client: FetchClient;

  constructor(config: ClientConfig) {
    if (!config.apiKey) {
      throw new Error('Erudio Links API Key is required');
    }
    
    this.client = new FetchClient(config);
    this.links = new LinksResource(this.client);
    this.analytics = new AnalyticsResource(this.client);
  }
}
