export class APIError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication failed', data?: any) {
    super(message, 401, data);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string = 'Validation failed', data?: any) {
    super(message, 400, data);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found', data?: any) {
    super(message, 404, data);
    this.name = 'NotFoundError';
  }
}
