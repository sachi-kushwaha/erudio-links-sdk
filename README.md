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
  // Optional: override the base URL if needed
  // baseUrl: 'https://links.erudio.in' 
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

---

## Error Handling

The SDK throws descriptive custom errors when API requests fail, making it easy to debug and handle edge cases gracefully.

```typescript
import { Erudio, ErudioAPIError } from '@erudio/links';

try {
  await erudio.links.create({ destination: 'invalid-url' });
} catch (error) {
  if (error instanceof ErudioAPIError) {
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
    console.error(`API Code: ${error.code}`); // e.g., 'invalid_destination'
  } else {
    console.error('An unexpected error occurred:', error);
  }
}
```

---

## Documentation

For full API documentation, advanced configuration options, and webhooks, please visit the [Erudio API Reference](https://links.erudio.in/docs).

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
