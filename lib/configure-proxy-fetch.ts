import { ProxyAgent, setGlobalDispatcher } from "undici";

let proxyConfigured = false;

export function configureProxyFetch() {
  if (proxyConfigured) {
    return;
  }

  proxyConfigured = true;

  if (typeof process === "undefined") {
    return;
  }

  // Edge runtime does not expose the necessary Node APIs.
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) {
    return;
  }

  try {
    const agent = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(agent);
  } catch (error) {
    console.warn(
      "Failed to configure global proxy for fetch requests:",
      error instanceof Error ? error.message : error
    );
  }
}

configureProxyFetch();
