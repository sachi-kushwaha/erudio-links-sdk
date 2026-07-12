export class ErudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErudioError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ErudioAPIError extends ErudioError {
  public status: number;
  public data: any;
  public headers?: Record<string, string>;
  public requestId?: string;
  public code?: string;

  constructor(
    message: string,
    status: number,
    data?: any,
    headers?: Headers
  ) {
    super(message);
    this.name = 'ErudioAPIError';
    this.status = status;
    this.data = data;
    
    if (data && typeof data === 'object' && data.code) {
      this.code = data.code;
    }

    if (headers) {
      this.headers = {};
      headers.forEach((value, key) => {
        this.headers![key] = value;
      });
      // Try to extract common trace IDs
      this.requestId = headers.get('x-request-id') || headers.get('cf-ray') || undefined;
    }
  }
}

export class AuthenticationError extends ErudioAPIError {
  constructor(message: string = 'Authentication failed', data?: any, headers?: Headers) {
    super(message, 401, data, headers);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ErudioAPIError {
  constructor(message: string = 'Validation failed', data?: any, headers?: Headers) {
    super(message, 400, data, headers);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ErudioAPIError {
  constructor(message: string = 'Resource not found', data?: any, headers?: Headers) {
    super(message, 404, data, headers);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ErudioAPIError {
  constructor(message: string = 'Rate limit exceeded', data?: any, headers?: Headers) {
    super(message, 429, data, headers);
    this.name = 'RateLimitError';
  }
}

export class APITimeoutError extends ErudioError {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'APITimeoutError';
  }
}
