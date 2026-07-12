import {
  ErudioAPIError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  APITimeoutError
} from './errors';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, any>;
  idempotencyKey?: string;
  timeout?: number;
}

export interface ClientConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
  onRequest?: (req: Request) => void | Promise<void>;
  onResponse?: (res: Response) => void | Promise<void>;
}

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 2;

// Calculate exponential backoff delay
const calculateRetryDelay = (attempt: number): number => {
  const baseDelay = 500;
  const maxDelay = 8000;
  const backoff = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  // Add jitter
  return backoff + Math.random() * (backoff * 0.2);
};

export class FetchClient {
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;
  private fetchImpl: typeof fetch;
  private onRequest?: (req: Request) => void | Promise<void>;
  private onResponse?: (res: Response) => void | Promise<void>;

  constructor(config: ClientConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = (config.baseURL || 'https://links.erudio.in').replace(/\/$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetchImpl = config.fetch ?? (typeof fetch !== 'undefined' ? fetch : undefined as any);
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;

    if (!this.fetchImpl) {
      throw new Error('A global fetch implementation is required. Please pass a custom fetch implementation via ClientConfig.fetch.');
    }
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
    headers.set('User-Agent', '@erudio/links/1.1.0');

    if (options.idempotencyKey) {
      headers.set('Idempotency-Key', options.idempotencyKey);
    }

    let body = options.body;
    if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }

    let attempt = 0;
    while (true) {
      const requestTimeout = options.timeout ?? this.timeout;
      const controller = new AbortController();
      let timeoutId: any;
      
      const requestSignal = options.signal;
      let abortListener: (() => void) | undefined;
      
      // Merge user abort signal with our timeout signal
      if (requestSignal) {
        if (requestSignal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        abortListener = () => controller.abort();
        requestSignal.addEventListener('abort', abortListener);
      }

      if (requestTimeout > 0) {
        timeoutId = setTimeout(() => controller.abort('TimeoutError'), requestTimeout);
      }

      const requestInit: RequestInit = {
        ...options,
        method,
        headers,
        body: body as RequestInit['body'],
        signal: controller.signal,
      };

      try {
        const req = new Request(url, requestInit);

        if (this.onRequest) {
          await this.onRequest(req);
        }

        const res = await this.fetchImpl(req);

        if (this.onResponse) {
          await this.onResponse(res.clone() as unknown as Response);
        }

        if (!res.ok) {
          const shouldRetry = this.shouldRetry(res.status) && attempt < this.maxRetries;
          if (shouldRetry) {
            attempt++;
            const delay = calculateRetryDelay(attempt);
            // Respect Retry-After header if present
            const retryAfter = res.headers.get('retry-after');
            const finalDelay = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
            await new Promise(r => setTimeout(r, finalDelay));
            continue;
          }
          await this.handleError(res);
        }

        if (res.status === 204 || res.headers.get('content-length') === '0') {
          return {} as T;
        }
        return res.json() as Promise<T>;
        
      } catch (error: any) {
        // If abort is explicitly triggered by our timeout
        if (error === 'TimeoutError' || error?.name === 'TimeoutError' || (error?.name === 'AbortError' && !requestSignal?.aborted)) {
          const shouldRetry = attempt < this.maxRetries;
          if (shouldRetry) {
            attempt++;
            await new Promise(r => setTimeout(r, calculateRetryDelay(attempt)));
            continue;
          }
          throw new APITimeoutError(`Request timed out after ${requestTimeout}ms`);
        }
        
        // Rethrow normal fetch errors (like DNS resolution, explicit user abort, etc.)
        throw error;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (requestSignal && abortListener) {
          requestSignal.removeEventListener('abort', abortListener);
        }
      }
    }
  }

  private shouldRetry(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
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
        throw new ValidationError(message, data, res.headers);
      case 401:
        throw new AuthenticationError(message, data, res.headers);
      case 404:
        throw new NotFoundError(message, data, res.headers);
      case 429:
        throw new RateLimitError(message, data, res.headers);
      default:
        throw new ErudioAPIError(message, res.status, data, res.headers);
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
