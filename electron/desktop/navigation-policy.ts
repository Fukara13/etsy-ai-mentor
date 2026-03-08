/**
 * DC-10: Navigation policy helper.
 * No Electron dependency; testable in Node.
 */

const ALLOWED_DEV_PREFIXES = ['http://localhost:5173', 'http://127.0.0.1:5173']
const ALLOWED_FILE_PREFIX = 'file://'

/** DC-10: Check if navigation to url is allowed. */
export function isAllowedAppNavigation(url: string, isPackaged: boolean): boolean {
  if (isPackaged) {
    return url.startsWith(ALLOWED_FILE_PREFIX)
  }
  return ALLOWED_DEV_PREFIXES.some((prefix) => url.startsWith(prefix))
}
