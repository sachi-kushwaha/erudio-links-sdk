import { FetchClient } from '../fetch';
import type { paths } from '../generated';

type GetAnalyticsResponse = paths['/api/v1/analytics']['get']['responses']['200'];

export class AnalyticsResource {
  constructor(private client: FetchClient) {}

  /**
   * Get analytics
   * @description Get analytics for the authenticated user, optionally filtered by a specific short code.
   * @param shortCode Optional short code to filter analytics
   * @returns Analytics payload
   */
  async get(shortCode?: string): Promise<GetAnalyticsResponse> {
    const query = shortCode ? { shortCode } : undefined;
    return this.client.get('/api/v1/analytics', { query });
  }
}
