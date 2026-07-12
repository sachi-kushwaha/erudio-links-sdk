"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  APITimeoutError: () => APITimeoutError,
  AnalyticsResource: () => AnalyticsResource,
  AuthenticationError: () => AuthenticationError,
  Erudio: () => Erudio,
  ErudioAPIError: () => ErudioAPIError,
  ErudioError: () => ErudioError,
  LinksResource: () => LinksResource,
  NotFoundError: () => NotFoundError,
  RateLimitError: () => RateLimitError,
  ValidationError: () => ValidationError
});
module.exports = __toCommonJS(index_exports);

// src/errors.ts
var ErudioError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ErudioError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var ErudioAPIError = class extends ErudioError {
  status;
  data;
  headers;
  requestId;
  code;
  constructor(message, status, data, headers) {
    super(message);
    this.name = "ErudioAPIError";
    this.status = status;
    this.data = data;
    if (data && typeof data === "object" && data.code) {
      this.code = data.code;
    }
    if (headers) {
      this.headers = {};
      headers.forEach((value, key) => {
        this.headers[key] = value;
      });
      this.requestId = headers.get("x-request-id") || headers.get("cf-ray") || void 0;
    }
  }
};
var AuthenticationError = class extends ErudioAPIError {
  constructor(message = "Authentication failed", data, headers) {
    super(message, 401, data, headers);
    this.name = "AuthenticationError";
  }
};
var ValidationError = class extends ErudioAPIError {
  constructor(message = "Validation failed", data, headers) {
    super(message, 400, data, headers);
    this.name = "ValidationError";
  }
};
var NotFoundError = class extends ErudioAPIError {
  constructor(message = "Resource not found", data, headers) {
    super(message, 404, data, headers);
    this.name = "NotFoundError";
  }
};
var RateLimitError = class extends ErudioAPIError {
  constructor(message = "Rate limit exceeded", data, headers) {
    super(message, 429, data, headers);
    this.name = "RateLimitError";
  }
};
var APITimeoutError = class extends ErudioError {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "APITimeoutError";
  }
};

// src/fetch.ts
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_MAX_RETRIES = 2;
var calculateRetryDelay = (attempt) => {
  const baseDelay = 500;
  const maxDelay = 8e3;
  const backoff = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  return backoff + Math.random() * (backoff * 0.2);
};
var FetchClient = class {
  apiKey;
  baseURL;
  timeout;
  maxRetries;
  fetchImpl;
  onRequest;
  onResponse;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = (config.baseURL || "https://links.erudio.in").replace(/\/$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetchImpl = config.fetch ?? (typeof fetch !== "undefined" ? fetch : void 0);
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
    if (!this.fetchImpl) {
      throw new Error("A global fetch implementation is required. Please pass a custom fetch implementation via ClientConfig.fetch.");
    }
  }
  async request(method, path, options = {}) {
    let url = `${this.baseURL}${path}`;
    if (options.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== void 0) {
          params.append(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) {
        url += `?${qs}`;
      }
    }
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    headers.set("User-Agent", "@erudio/links/1.1.0");
    if (options.idempotencyKey) {
      headers.set("Idempotency-Key", options.idempotencyKey);
    }
    let body = options.body;
    if (body !== void 0 && !(body instanceof FormData) && typeof body !== "string") {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }
    let attempt = 0;
    while (true) {
      const requestTimeout = options.timeout ?? this.timeout;
      const controller = new AbortController();
      let timeoutId;
      const requestSignal = options.signal;
      let abortListener;
      if (requestSignal) {
        if (requestSignal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        abortListener = () => controller.abort();
        requestSignal.addEventListener("abort", abortListener);
      }
      if (requestTimeout > 0) {
        timeoutId = setTimeout(() => controller.abort("TimeoutError"), requestTimeout);
      }
      const requestInit = {
        ...options,
        method,
        headers,
        body,
        signal: controller.signal
      };
      try {
        const req = new Request(url, requestInit);
        if (this.onRequest) {
          await this.onRequest(req);
        }
        const res = await this.fetchImpl(req);
        if (this.onResponse) {
          await this.onResponse(res.clone());
        }
        if (!res.ok) {
          const shouldRetry = this.shouldRetry(res.status) && attempt < this.maxRetries;
          if (shouldRetry) {
            attempt++;
            const delay = calculateRetryDelay(attempt);
            const retryAfter = res.headers.get("retry-after");
            const finalDelay = retryAfter ? parseInt(retryAfter, 10) * 1e3 : delay;
            await new Promise((r) => setTimeout(r, finalDelay));
            continue;
          }
          await this.handleError(res);
        }
        if (res.status === 204 || res.headers.get("content-length") === "0") {
          return {};
        }
        return res.json();
      } catch (error) {
        if (error === "TimeoutError" || error?.name === "TimeoutError" || error?.name === "AbortError" && !requestSignal?.aborted) {
          const shouldRetry = attempt < this.maxRetries;
          if (shouldRetry) {
            attempt++;
            await new Promise((r) => setTimeout(r, calculateRetryDelay(attempt)));
            continue;
          }
          throw new APITimeoutError(`Request timed out after ${requestTimeout}ms`);
        }
        throw error;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (requestSignal && abortListener) {
          requestSignal.removeEventListener("abort", abortListener);
        }
      }
    }
  }
  shouldRetry(status) {
    return status === 408 || status === 429 || status >= 500;
  }
  async handleError(res) {
    let data;
    let message = res.statusText;
    try {
      data = await res.json();
      message = data.message || data.error || message;
    } catch {
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
  get(path, options) {
    return this.request("GET", path, options);
  }
  post(path, options) {
    return this.request("POST", path, options);
  }
  patch(path, options) {
    return this.request("PATCH", path, options);
  }
  put(path, options) {
    return this.request("PUT", path, options);
  }
  delete(path, options) {
    return this.request("DELETE", path, options);
  }
};

// src/resources/links.ts
var LinksResource = class {
  constructor(client) {
    this.client = client;
  }
  client;
  /**
   * List all links
   * @description Get all links for the authenticated API client.
   * @returns List of links
   */
  async list() {
    return this.client.get("/api/v1/links");
  }
  /**
   * Create a new short link
   * @description Only `destination` is strictly required. If `alias` is omitted, a random 8-character code will be generated.
   * @param payload Link configuration payload
   * @returns Created link details
   */
  async create(payload) {
    return this.client.post("/api/v1/links", {
      body: payload
    });
  }
  /**
   * Update an existing link
   * @description Update properties of a short link. Provide only the fields you wish to update.
   * @param shortCode The short code of the link to update
   * @param payload Link properties to update
   */
  async update(shortCode, payload) {
    return this.client.patch(`/api/v1/links/${shortCode}`, {
      body: payload
    });
  }
  /**
   * Delete a link
   * @description Permanently delete a short link and all associated analytics.
   * @param shortCode The short code of the link to delete
   */
  async delete(shortCode) {
    return this.client.delete(`/api/v1/links/${shortCode}`);
  }
};

// src/resources/analytics.ts
var AnalyticsResource = class {
  constructor(client) {
    this.client = client;
  }
  client;
  /**
   * Get analytics
   * @description Get analytics for the authenticated user, optionally filtered by a specific short code.
   * @param shortCode Optional short code to filter analytics
   * @returns Analytics payload
   */
  async get(shortCode) {
    const query = shortCode ? { shortCode } : void 0;
    return this.client.get("/api/v1/analytics", { query });
  }
};

// src/client.ts
var Erudio = class {
  links;
  analytics;
  client;
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("Erudio Links API Key is required");
    }
    this.client = new FetchClient(config);
    this.links = new LinksResource(this.client);
    this.analytics = new AnalyticsResource(this.client);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APITimeoutError,
  AnalyticsResource,
  AuthenticationError,
  Erudio,
  ErudioAPIError,
  ErudioError,
  LinksResource,
  NotFoundError,
  RateLimitError,
  ValidationError
});
