/**
 * OC-7: Minimal read-only access to operator advisory projection.
 * Calls desktop API; no mutation or actions.
 */

/**
 * Fetches the current operator advisory projection from the main process.
 * Returns null when unavailable or when desktop API is not present.
 */
export async function getOperatorAdvisoryProjection(): Promise<OperatorRuntimeAdvisoryProjection | null> {
  const projection = await window.desktopApi?.read?.getOperatorAdvisoryProjection?.()
  return projection ?? null
}
