import { FetchClient, type ClientConfig } from './fetch';
import { LinksResource } from './resources/links';

export class Erudio {
  public links: LinksResource;
  private client: FetchClient;

  constructor(config: ClientConfig) {
    if (!config.apiKey) {
      throw new Error('Erudio Links API Key is required');
    }
    
    this.client = new FetchClient(config);
    this.links = new LinksResource(this.client);
  }
}
