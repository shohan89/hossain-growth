/// <reference types="astro/client" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../worker-configuration.d.ts" />

type Runtime = import('@astrojs/cloudflare').Runtime;
type SessionPayload = import('./lib/auth/session').SessionPayload;

declare namespace App {
  interface Locals extends Runtime {
    session: SessionPayload | null;
  }
}
