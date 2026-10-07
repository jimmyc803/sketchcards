const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/**
 * Strip anything specific to a person before a page view is counted: deck/card IDs become
 * ":id", and query strings / hashes (e.g. practice card lists) are dropped.
 */
export function anonymizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname.replace(UUID, ':id')}`
  } catch {
    return url.split(/[?#]/)[0].replace(UUID, ':id')
  }
}
