/**
 * Shared Supabase Storage URL resolver.
 *
 * Eliminates the three copies of `getResolvedImageUrl` that existed across
 * the print page files. If the bucket name or CDN prefix ever changes, only
 * this file needs updating.
 *
 * Usage:
 *   import { getStorageUrl } from '@/lib/storage-url'
 *   const url = getStorageUrl(driver.photo_url, 'secure_uploads')
 *   const logo = getStorageUrl(company.logo_url, 'company-assets')
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * Resolves a Supabase Storage path or full URL to an absolute public URL.
 *
 * - If `path` is null/empty → returns null (caller should render a placeholder)
 * - If `path` already starts with 'http' → it's already a full URL, return as-is
 *   (handles legacy DB rows that stored the full URL instead of a relative path)
 * - Otherwise → constructs the public CDN URL for the given bucket
 */
export function getStorageUrl(path: string | null | undefined, bucket: string): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

/**
 * Convenience wrapper for the `secure_uploads` bucket (driver photos).
 */
export function getDriverPhotoUrl(path: string | null | undefined): string | null {
  return getStorageUrl(path, 'secure_uploads')
}

/**
 * Convenience wrapper for the `company-assets` bucket (logo, stamp).
 */
export function getCompanyAssetUrl(path: string | null | undefined): string | null {
  return getStorageUrl(path, 'company-assets')
}
