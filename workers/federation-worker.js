/*
 * Federation worker for a consuming child site.
 *
 * THE ONE JOB: make federated code appear same-origin.
 *   - Any request to /libs/*  -> fetched from the FEDERATED origin (foundation-kit-fed)
 *   - Everything else         -> fetched from THIS site's own origin
 *
 * Because the browser only ever talks to THIS domain, /libs/* is same-origin,
 * so there is NO CORS problem. The cross-origin hop happens server-side here,
 * inside the worker, where CORS rules don't apply.
 *
 * To reuse this worker for a NEW consuming site, change SITE_ORIGIN to that
 * site's own .aem.live origin. FED_ORIGIN stays the same (the shared libs source).
 */

// This site's own .aem.live origin (where non-/libs content lives).
const SITE_ORIGIN = 'main--foundation-kit-fed-temp--angelaccenture.aem.live';

// The FEDERATED origin (the "/libs" source — shared brand + framework code).
const FED_ORIGIN = 'main--foundation-kit-fed--angelaccenture.aem.live';

// The URL prefix that signals "this is federated code, get it from FED".
const LIBS_PREFIX = '/libs';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Decide which origin to fetch from, and what path to use there.
    let origin = SITE_ORIGIN;
    let path = url.pathname;

    if (url.pathname === LIBS_PREFIX || url.pathname.startsWith(`${LIBS_PREFIX}/`)) {
      // Federated request: strip the /libs prefix and pull from FED.
      // e.g. /libs/scripts/ak.js  ->  FED_ORIGIN/scripts/ak.js
      origin = FED_ORIGIN;
      path = url.pathname.slice(LIBS_PREFIX.length) || '/';
    }

    // Build the upstream request to the chosen origin (preserve query string).
    const upstreamUrl = `https://${origin}${path}${url.search}`;
    const upstreamReq = new Request(upstreamUrl, request);

    // AEM expects the original host forwarded so links/canonicals resolve right.
    upstreamReq.headers.set('x-forwarded-host', url.hostname);

    const resp = await fetch(upstreamReq);

    // Return the response as-is. Because it came back through THIS worker on
    // THIS domain, the browser treats it as same-origin -> no CORS.
    return new Response(resp.body, resp);
  },
};
