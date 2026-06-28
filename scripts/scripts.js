// FEDERATED CHILD bootstrap.
// The engine (ak.js) is imported from the FED origin rather than this repo.
// Because ak.js derives its codeBase from its own URL, all framework code
// (blocks, utils, etc.) is pulled from FED. This site stays thin and only
// adds its own custom blocks/templates locally as they are "broken off".
import { loadArea, setConfig } from 'https://main--foundation-kit-fed--angelaccenture.aem.live/scripts/ak.js';

const hostnames = ['authorkit.dev'];

const locales = {
  '': { lang: 'en' },
};

const linkBlocks = [
  { fragment: '/fragments/' },
];

// Blocks with self-managed styles
const components = [];

export async function loadPage() {
  const config = setConfig({ hostnames, locales, linkBlocks, components });
  if (config.locale?.dir) document.documentElement.dir = config.locale.dir;
  await loadArea();
}

await loadPage();
