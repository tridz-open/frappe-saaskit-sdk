# @frappe-saaskit/node
Helpers for agents and CLIs.
```ts
import { createNodeClient, tokenFromEnv, loadTokenFile } from '@frappe-saaskit/node';
// token is a Frappe API `key:secret`, sent as `Authorization: token key:secret`
const client = createNodeClient({ baseUrl: 'https://app.example.com', token: tokenFromEnv() }); // SAASKIT_TOKEN
// or: token: loadTokenFile(`${process.env.HOME}/.saaskit-token`)  // warns if group/world readable
```
`client.subscribe` uses fetch-based SSE, so no EventSource polyfill is needed on Node 20+.
