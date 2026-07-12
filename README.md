# Erudio Links SDK

[![npm version](https://img.shields.io/npm/v/@erudio/links.svg?style=flat-square)](https://www.npmjs.com/package/@erudio/links)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

The official TypeScript/JavaScript SDK for the Erudio Links API.

Built for modern web development, this SDK provides a strongly-typed, Promise-based interface to interact with your Erudio Links workspace. It handles authentication, retries, and error parsing out of the box.

---

## Features

- **End-to-End Type Safety**: Generated directly from our OpenAPI specification.
- **Isomorphic**: Works flawlessly in Node.js, Bun, Deno, Edge runtimes (Cloudflare Workers, Vercel Edge), and the browser.
- **Developer Friendly**: Built-in timeout handling, custom errors, and intelligent retries.
- **Zero Dependencies**: Lightweight architecture using the native `fetch` API.
- **Advanced Network Controls**: Set request timeouts, inject custom `fetch` clients, and support `AbortSignal`.
- **Automatic Retries**: Built-in exponential backoff for rate limits and server errors.
- **Idempotency**: Native support for safe POST retries via `Idempotency-Key` headers.

---

## Installation

Install the package via your preferred package manager:

```bash
# npm
npm install @erudio/links

# yarn
yarn add @erudio/links

# pnpm
pnpm add @erudio/links

# bun
bun add @erudio/links
```

---

## Getting Started

### 1. Initialization

To use the SDK, you need an API key from your Erudio Links dashboard.

```typescript
import { Erudio } from '@erudio/links';

const erudio = new Erudio({
  apiKey: process.env.ERUDIO_API_KEY, // Your secret API key
  // Optional: configure network behavior
  timeout: 15000, // 15 seconds
  maxRetries: 3, // Retry up to 3 times on 429/5xx errors
  // baseUrl: 'https://links.erudio.in',
  // fetch: customFetchImpl // Inject custom fetch for edge runtimes
});
```

### 2. Managing Links

You can easily create, list, update, and delete your shortened URLs.

#### Create a Link

```typescript
// Create a link with an auto-generated short code
const link = await erudio.links.create({
  destination: 'https://example.com/very/long/path/to/resource'
});

console.log(`Short URL: https://links.erudio.in/${link.alias}`);

// Or create a link with a custom alias
const customLink = await erudio.links.create({
  destination: 'https://github.com/sachi-kushwaha',
  alias: 'sachi-github'
});
```

#### List Links

```typescript
const links = await erudio.links.list();
console.log(`Found ${links.length} links.`);
```

#### Update a Link

```typescript
await erudio.links.update('sachi-github', {
  destination: 'https://github.com/sachi-kushwaha?tab=repositories',
  // You can also update tags, UTM parameters, etc.
});
```

#### Delete a Link

```typescript
await erudio.links.delete('sachi-github');
```

### 3. Analytics

You can easily fetch analytics for your links.

```typescript
// Get analytics for all your links
const allStats = await erudio.analytics.get();
console.log(`Total clicks: ${allStats.totalClicks}`);

// Get analytics for a specific short link
const specificStats = await erudio.analytics.get('sachi-github');
console.log(specificStats.clicksByDate);
```

---

## Advanced Usage

### Idempotency

When creating resources, you can pass an idempotency key to safely retry requests without accidentally creating duplicates.

```typescript
const link = await erudio.links.create(
  { destination: 'https://example.com' },
  { idempotencyKey: 'request-12345' } // Will be sent as Idempotency-Key header
);
```

### Cancellation

You can cancel requests using the standard `AbortController`.

```typescript
const controller = new AbortController();

// Cancel the request after 1 second manually
setTimeout(() => controller.abort(), 1000);

try {
  await erudio.links.list({ signal: controller.signal });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  }
}
```

---

## Error Handling

The SDK throws descriptive custom errors when API requests fail, making it easy to debug and handle edge cases gracefully. Every API error exposes a `requestId` so you can easily trace requests.

```typescript
import { Erudio, ErudioAPIError, RateLimitError } from '@erudio/links';

try {
  await erudio.links.create({ destination: 'invalid-url' });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.error('Hit rate limits, slowing down...');
  } else if (error instanceof ErudioAPIError) {
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
    console.error(`API Code: ${error.code}`); // e.g., 'invalid_destination'
    console.error(`Request ID: ${error.requestId}`); // trace ID for debugging
  }
}
```

---

## Documentation

For full API documentation, advanced configuration options, and webhooks, please visit the [Erudio API Reference](https://links.erudio.in/docs).

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
