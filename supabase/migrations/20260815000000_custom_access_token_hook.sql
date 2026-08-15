-- Custom Access Token Hook: Embeds user_role into JWT claims
-- This eliminates the need for a separate profiles query on every request.
--
-- IMPORTANT: After applying this migration, you must enable the hook in:
-- Supabase Dashboard → Authentication → Hooks → Custom Access Token
-- Select the function: public.custom_access_token_hook

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
  declare
    claims jsonb;
    user_role text;
  begin
    claims := event->'claims';

    -- Look up the user's role from the profiles table
    select role::text into user_role
    from public.profiles
    where id = (event->>'user_id')::uuid;

    if user_role is not null then
      -- Ensure app_metadata exists
      if jsonb_typeof(claims->'app_metadata') is null then
        claims := jsonb_set(claims, '{app_metadata}', '{}');
      end if;

      -- Inject the role into app_metadata.user_role
      claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(user_role));

      -- Update the claims in the event
      event := jsonb_set(event, '{claims}', claims);
    end if;

    return event;
  end;
$$;

-- Grant execute to supabase_auth_admin (required for auth hooks)
grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

-- Revoke from public roles for security (SECURITY DEFINER-like function
-- should not be callable by authenticated/anon users directly)
revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

-- Grant read access to profiles table for the auth admin role
-- (needed so the hook can look up the role)
grant select on table public.profiles to supabase_auth_admin;
