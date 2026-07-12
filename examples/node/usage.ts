import { Erudio } from '../../src';

async function main() {
  const client = new Erudio({
    apiKey: process.env.ERUDIO_API_KEY || 'benchmark-api-key-xyz',
    baseURL: 'http://localhost:3000',
    onRequest: (req) => {
      console.log(`[Erudio] -> ${req.method} ${req.url}`);
    },
    onResponse: (res) => {
      console.log(`[Erudio] <- ${res.status} ${res.statusText}`);
    },
  });

  try {
    // 1. Create a link
    console.log('\n--- Creating Link ---');
    const newLink = await client.links.create({
      destination: 'https://example.com/sdk-test',
      alias: 'sdk-test-123'
    });
    console.log('Created:', newLink);

    // 2. List links
    console.log('\n--- Listing Links ---');
    const list = await client.links.list();
    console.log('Links found (count):', Object.keys(list).length);

    // 3. Update link
    console.log('\n--- Updating Link ---');
    await client.links.update('sdk-test-123', {
      notes: 'Updated via SDK test script'
    });
    console.log('Update successful');

    // 4. Delete link
    console.log('\n--- Deleting Link ---');
    await client.links.delete('sdk-test-123');
    console.log('Delete successful');
    
  } catch (error) {
    console.error('\n--- Error ---');
    console.error(error);
  }
}

main();
