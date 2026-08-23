-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Make secure_uploads bucket publicly readable
--
-- Root cause of driver photo not showing in PDF:
--   • The `secure_uploads` bucket was private (Supabase default for named buckets).
--   • .getPublicUrl() always returns a URL string — it does NOT validate whether
--     the bucket is actually public or whether an RLS policy permits access.
--   • The <img src={photo_url}> in print pages silently received a 403 Forbidden
--     from Supabase Storage and rendered a broken image placeholder.
--   • No storage.objects RLS policies existed for this bucket in any prior migration.
--
-- Fix:
--   1. Upsert the bucket row with public = true.
--   2. Create a public-read Storage policy (SELECT) so the URLs returned by
--      .getPublicUrl() are actually accessible without authentication.
--   3. Restrict INSERT / UPDATE / DELETE to the service role so only server-side
--      admin code (createAdminClient) can write to this bucket.
--
-- Note: Driver photos appear on printed PDF documents that are shared with
-- clients, so public read access is appropriate and expected.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create or update the bucket to be public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'secure_uploads',
  'secure_uploads',
  true,
  10485760,  -- 10 MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public            = true,
      file_size_limit   = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. Public read — anyone can GET objects from this bucket
--    (required so <img src={supabase_public_url}> returns 200 in print pages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Public read secure_uploads'
  ) THEN
    CREATE POLICY "Public read secure_uploads"
      ON storage.objects
      FOR SELECT
      USING ( bucket_id = 'secure_uploads' );
  END IF;
END $$;

-- 3. Service-role write — only the admin client (SUPABASE_SERVICE_ROLE_KEY)
--    may insert new objects (uploads from server actions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Service role insert secure_uploads'
  ) THEN
    CREATE POLICY "Service role insert secure_uploads"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'secure_uploads'
        AND auth.role() = 'service_role'
      );
  END IF;
END $$;

-- 4. Service-role update — allow the admin client to replace/overwrite objects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Service role update secure_uploads'
  ) THEN
    CREATE POLICY "Service role update secure_uploads"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'secure_uploads'
        AND auth.role() = 'service_role'
      );
  END IF;
END $$;

-- 5. Service-role delete — allow the admin client to remove old photos on update/delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Service role delete secure_uploads'
  ) THEN
    CREATE POLICY "Service role delete secure_uploads"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'secure_uploads'
        AND auth.role() = 'service_role'
      );
  END IF;
END $$;
