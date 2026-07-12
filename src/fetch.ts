import { APIError, AuthenticationError, NotFoundError, ValidationError } from './errors';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, any>;
}

export interface ClientConfig {
  apiKey: string;
  baseURL?: string;
  onRequest?: (req: Request) => void | Promise<void>;
  onResponse?: (res: Response) => void | Promise<void>;
}

export class FetchClient {
  private apiKey: string;
  private baseURL: string;
  private onRequest?: (req: Request) => void | Promise<void>;
  private onResponse?: (res: Response) => void | Promise<void>;

  constructor(config: ClientConfig) {
    this.apiKey = config.apiKey;
    // Default to production URL if not provided
    this.baseURL = (config.baseURL || 'https://links.erudio.in').replace(/\/$/, '');
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
  }

  async request<T>(method: string, path: string, options: FetchOptions = {}): Promise<T> {
    let url = `${this.baseURL}${path}`;

    // Handle query parameters
    if (options.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) {
        url += `?${qs}`;
      }
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.apiKey}`);
    headers.set('User-Agent', '@erudio/links/1.0.0');

    let body = options.body;
    if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }

    const requestInit: RequestInit = {
      ...options,
      method,
      headers,
      body: body as RequestInit['body'],
    };

    const req = new Request(url, requestInit);

    if (this.onRequest) {
      await this.onRequest(req);
    }

    const res = await fetch(req);

    if (this.onResponse) {
      await this.onResponse(res.clone() as unknown as Response);
    }

    if (!res.ok) {
      await this.handleError(res);
    }

    // Handle empty responses
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  private async handleError(res: Response): Promise<never> {
    let data: any;
    let message = res.statusText;

    try {
      data = await res.json();
      message = data.message || data.error || message;
    } catch {
      // Ignored
    }

    switch (res.status) {
      case 400:
        throw new ValidationError(message, data);
      case 401:
        throw new AuthenticationError(message, data);
      case 404:
        throw new NotFoundError(message, data);
      default:
        throw new APIError(message, res.status, data);
    }
  }

  get<T>(path: string, options?: FetchOptions) {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, options?: FetchOptions) {
    return this.request<T>('POST', path, options);
  }

  patch<T>(path: string, options?: FetchOptions) {
    return this.request<T>('PATCH', path, options);
  }

  put<T>(path: string, options?: FetchOptions) {
    return this.request<T>('PUT', path, options);
  }

  delete<T>(path: string, options?: FetchOptions) {
    return this.request<T>('DELETE', path, options);
  }
}
