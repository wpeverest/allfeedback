// Expose Node 18+ fetch globals for MSW 2 in Jest/jsdom environment
const { Request, Response, Headers, fetch, ReadableStream, TextEncoder, TextDecoder } = globalThis;

if ( typeof globalThis.Request === 'undefined' )   globalThis.Request   = Request;
if ( typeof globalThis.Response === 'undefined' )  globalThis.Response  = Response;
if ( typeof globalThis.Headers === 'undefined' )   globalThis.Headers   = Headers;
if ( typeof globalThis.fetch === 'undefined' )     globalThis.fetch     = fetch;
