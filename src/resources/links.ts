import { FetchClient } from '../fetch';
import type { paths } from '../generated';

type CreateLinkRequest = paths['/api/v1/links']['post']['requestBody']['content']['application/json'];
type CreateLinkResponse = paths['/api/v1/links']['post']['responses']['201']['content']['application/json'];

type UpdateLinkRequest = paths['/api/v1/links/{shortCode}']['patch']['requestBody']['content']['application/json'];

export class LinksResource {
  constructor(private client: FetchClient) {}

  /**
   * List all links
   * @description Get all links for the authenticated API client.
   * @returns List of links
   */
  async list() {
    return this.client.get('/api/v1/links');
  }

  /**
   * Create a new short link
   * @description Only `destination` is strictly required. If `alias` is omitted, a random 8-character code will be generated.
   * @param payload Link configuration payload
   * @returns Created link details
   */
  async create(payload: CreateLinkRequest): Promise<CreateLinkResponse> {
    return this.client.post<CreateLinkResponse>('/api/v1/links', {
      body: payload
    });
  }

  /**
   * Update an existing link
   * @description Update properties of a short link. Provide only the fields you wish to update.
   * @param shortCode The short code of the link to update
   * @param payload Link properties to update
   */
  async update(shortCode: string, payload: UpdateLinkRequest): Promise<void> {
    return this.client.patch<void>(`/api/v1/links/${shortCode}`, {
      body: payload
    });
  }

  /**
   * Delete a link
   * @description Permanently delete a short link and all associated analytics.
   * @param shortCode The short code of the link to delete
   */
  async delete(shortCode: string): Promise<void> {
    return this.client.delete<void>(`/api/v1/links/${shortCode}`);
  }
}
