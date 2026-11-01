/**
 * A minimal GitHub REST client for scripts/sync-work.mjs: Node's built-in fetch, no
 * dependency, and patient with rate limits (retry-after first, then the reset time).
 * GITHUB_API_URL is the variable Actions sets; it also lets a test point at a stub.
 */
export const API = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function client(token) {
  return async function req(method, path, body, { version = "2022-11-28", allow = [] } = {}) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": version, "user-agent": "starshot-sync-work", ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const retry = Number(res.headers.get("retry-after")) * 1000;
      const reset = res.headers.get("x-ratelimit-remaining") === "0" ? Number(res.headers.get("x-ratelimit-reset")) * 1000 - Date.now() + 1000 : 0;
      const wait = retry || reset;
      if ((res.status === 403 || res.status === 429) && wait > 0 && wait < 15 * 60_000) {
        console.log(`  rate limited; waiting ${Math.ceil(wait / 1000)} s`);
        await sleep(wait);
        continue;
      }
      if (allow.includes(res.status)) return { status: res.status, data: null };
      const text = await res.text();
      if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} ${text.slice(0, 200)}`);
      return { status: res.status, data: text ? JSON.parse(text) : null, next: /<([^>]+)>;\s*rel="next"/.exec(res.headers.get("link") ?? "")?.[1] };
    }
    throw new Error(`${method} ${path}: still rate limited after 5 tries`);
  };
}

/** Every page of a list endpoint, following the Link header, up to 50 pages. */
export async function all(req, path, opts) {
  const out = [];
  let url = path;
  for (let page = 0; url && page < 50; page++) {
    const r = await req("GET", url, null, opts);
    out.push(...(r.data ?? []));
    url = r.next?.replace(API, "");
  }
  return out;
}
