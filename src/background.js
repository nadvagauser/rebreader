'use strict'

// A dictionary with host as a key and its alternative as a value, loaded from
// the browser's storage.
let redirects = {}

// We only want 'document'-like requests, redirecting media may break certain
// front-ends which do not proxy images or videos (for example Scribe).
//
// Relevant documentation:
// - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/ResourceType
const resourceTypes = ["main_frame", "object", "sub_frame"]

// An array of WebExtensionsAPI-compatible match patterns (strings), it
// gets populated by `loadRedirects()` from browser's storage API.
//
// Relevant documentation:
// - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
// - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/RequestFilter
let requestFilter = []


///////
/// Storage
//////

// Populate browser's storage on installation
browser.runtime.onInstalled.addListener(async (reason) => {
  const { base, instances } = await import('./dictionary.js')

  browser.storage.local.set({ redirects: Object.assign(base, instances) })
})

// Load and process redirects after storage gets changed either by installation
// hook or instance discovery
browser.storage.onChanged.addListener(loadRedirects)
// Diffing with `details` doesn't seem neccessary, maybe we should revisit this
// later on. It's simpler this way and probably faster until like 10,000s of
// records.
async function loadRedirects() {
  redirects = (await browser.storage.local.get()).redirects
  for (let host in redirects) {
    requestFilter.push(`*://*.${host}/*`)
  }
  
  // (Re)register listeners with new redirection dictionary
  refreshBeforeRequestListeners()
}


///////
/// Request handling
/////

// Redirecting happens here! We need WebRequestBlocking permission to actually
// *redirect* websites. We can block here as the browser only passes relevant
// requests to the extension thanks to the RequestFilter parameter.
//
// Relevant documentation:
// - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest
// - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/BlockingResponse
// - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/RequestFilter

// Re-apply the listener, used to update when the requestFilter changes
function refreshBeforeRequestListeners() {
  console.log('Refreshing onBeforeRequest listeners')
  if (browser.webRequest.onBeforeRequest.hasListener(attemptRedirecting)) {
    browser.webRequest.onBeforeRequest.removeListener(attemptRedirecting)
  }
  
  browser.webRequest.onBeforeRequest.addListener(
    attemptRedirecting,
    { urls: requestFilter, types: resourceTypes},
    ["blocking"]
  )
}

async function attemptRedirecting(details) {
  const url = new URL(details.url)
  let pureHostname = url.hostname.startsWith('www.')
    ? url.hostname.slice(4)
    : url.hostname

  switch (pureHostname) {
    // (Hopefully temporary) Workaround for Beatbump, as it unfortunately doesn't
    // support YouTube playlists URLs yet. We could redirect them to URLs
    // supported by Beatbump by extracting Album's ID from the URL, but Piped
    // works fine too. For now this should be enough.
    case 'music.youtube.com':
      if (url.pathname === '/playlist') {
        pureHostname = 'youtube.com'
      }
    case 'jobs.medium.com':
      return {}
  }
  // This is probably going to need some additional work soon, as we discover
  // more edge-cases benefitting from a simple pattern-matching in dictionaries.
  // However, Medium alredy has to be handled as a special case in
  // reviewHeaders().
  if (pureHostname.endsWith('medium.com')) {
    pureHostname = 'medium.com'
  }
  }

  // Baseline, as most front-ends are 'drop-in replacements' considering the URLs
  // Piped instances also supports YouTube embeds and youtu.be URLs!
  let finalDestination = details.url.replace(url.hostname, redirects?.[pureHostname])

  console.log(`[${pureHostname}]`, `Redirecting ${details.url} to ${finalDestination}`)
  return { redirectUrl: finalDestination }
}


// Here we attempt to detect other instances of target websites, for example
// Medium blogs with a custom domain. We can extend it to cover more services!
// It has to be non-blocking because it can severely impact browsing experience
// since we are checking **every** request for known footprints.
//
// Filtering out media requests for the same reason as with onBeforeRequest, but
// it can be removed if it interferes with detecting accuracy.
//
// Hopefully headers will be enough.
//
// TODO: Would be nice to redirect a newly-indentified instance right after too!
// This might be possible by utilizing the Tabs API?
//
// TODO: reviewHeaders() might benefit from splitting it into separate
// functions/modules, but for now it should be fine, as we don't have much
// 'reviewing' logic anyway.
//
// Relevant documentation:
// - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onHeadersReceived
browser.webRequest.onHeadersReceived.addListener(
  reviewHeaders,
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
)

async function reviewHeaders(details) {
  if (!resourceTypes.includes(details.type)) return

  const url = new URL(details.url)
  const headers = new Headers(details.responseHeaders.map(h => [h.name, h.value ?? h.binaryValue]))

  const pureHostname = url.hostname.startsWith('www.')
    ? url.hostname.slice(4)
    : url.hostname

  // Medium thankfully introduces itself every time. There are other
  // 'footprints' in case these headers get removed.
  if (
    headers.get('x-powered-by') === 'Medium'
    || headers.has('medium-missing-time')
    || headers.has('medium-fullfilled-by')
  ) {
    console.log(`Identified a new Medium instance: ${url.hostname}`)
    redirects[pureHostname] = redirects['medium.com']
    browser.storage.local.set({ redirects })
  }
}
