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
 * FED-BRANCH TESTING (?fed-ref=):
 *   By default /libs is served from FED's `main`. A federated block engineer
 *   can preview an UNMERGED FED branch against this site by adding
 *   ?fed-ref=<branch> to the URL. e.g. ?fed-ref=update-columns serves /libs
 *   from `update-columns--foundation-kit-fed--angelaccenture.aem.page`.
 *   This lets them see how a change impacts a consuming site BEFORE the PR.
 *   Absent the param, /libs always comes from main (safe for production).
 *
 * To reuse this worker for a NEW consuming site, change SITE_ORIGIN to that
 * site's own .aem.live origin. The FED constants stay the same.
 */

// This site's own .aem.live origin (where non-/libs content lives).
const SITE_ORIGIN = 'main--foundation-kit-fed-temp--angelaccenture.aem.live';

// The federated project's repo + owner (used to build the FED origin per ref).
const FED_REPO = 'foundation-kit-fed';
const FED_OWNER = 'angelaccenture';

// Default FED branch when no ?fed-ref= override is supplied.
const FED_DEFAULT_REF = 'main';

// The URL prefix that signals "this is federated code, get it from FED".
const LIBS_PREFIX = '/libs';

// Build the FED origin for a given branch ref.
// main -> production .aem.live; any other branch -> its .aem.page preview.
function fedOrigin(ref) {
  const tld = ref === FED_DEFAULT_REF ? 'aem.live' : 'aem.page';
  return `${ref}--${FED_REPO}--${FED_OWNER}.${tld}`;
}

// Only allow safe branch names (letters, numbers, dot, underscore, hyphen).
// Prevents the param from being used to point /libs at an arbitrary origin.
function safeRef(ref) {
  return ref && /^[\w.-]+$/.test(ref) ? ref : FED_DEFAULT_REF;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Which FED branch should /libs resolve from? Default main; ?fed-ref overrides.
    const fedRef = safeRef(url.searchParams.get('fed-ref'));

    // Decide which origin to fetch from, and what path to use there.
    let origin = SITE_ORIGIN;
    let path = url.pathname;

    if (url.pathname === LIBS_PREFIX || url.pathname.startsWith(`${LIBS_PREFIX}/`)) {
      // Federated request: strip the /libs prefix and pull from the chosen FED ref.
      // e.g. /libs/scripts/ak.js  ->  <fedOrigin>/scripts/ak.js
      origin = fedOrigin(fedRef);
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
