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
  APIError: () => APIError,
  AuthenticationError: () => AuthenticationError,
  Erudio: () => Erudio,
  NotFoundError: () => NotFoundError,
  ValidationError: () => ValidationError
});
module.exports = __toCommonJS(index_exports);

// src/errors.ts
var APIError = class extends Error {
  status;
  data;
  constructor(message, status, data) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
};
var AuthenticationError = class extends APIError {
  constructor(message = "Authentication failed", data) {
    super(message, 401, data);
    this.name = "AuthenticationError";
  }
};
var ValidationError = class extends APIError {
  constructor(message = "Validation failed", data) {
    super(message, 400, data);
    this.name = "ValidationError";
  }
};
var NotFoundError = class extends APIError {
  constructor(message = "Resource not found", data) {
    super(message, 404, data);
    this.name = "NotFoundError";
  }
};

// src/fetch.ts
var FetchClient = class {
  apiKey;
  baseURL;
  onRequest;
  onResponse;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = (config.baseURL || "https://links.erudio.in").replace(/\/$/, "");
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
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
    headers.set("User-Agent", "@erudio/links/1.0.0");
    let body = options.body;
    if (body !== void 0 && !(body instanceof FormData) && typeof body !== "string") {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }
    const requestInit = {
      ...options,
      method,
      headers,
      body
    };
    const req = new Request(url, requestInit);
    if (this.onRequest) {
      await this.onRequest(req);
    }
    const res = await fetch(req);
    if (this.onResponse) {
      await this.onResponse(res.clone());
    }
    if (!res.ok) {
      await this.handleError(res);
    }
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return {};
    }
    return res.json();
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
        throw new ValidationError(message, data);
      case 401:
        throw new AuthenticationError(message, data);
      case 404:
        throw new NotFoundError(message, data);
      default:
        throw new APIError(message, res.status, data);
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

// src/client.ts
var Erudio = class {
  links;
  client;
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("Erudio Links API Key is required");
    }
    this.client = new FetchClient(config);
    this.links = new LinksResource(this.client);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APIError,
  AuthenticationError,
  Erudio,
  NotFoundError,
  ValidationError
});
