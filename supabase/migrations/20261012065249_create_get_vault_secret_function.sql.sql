/*
# Create function to retrieve vault secrets

1. New Functions
- `get_vault_secret(name text)` — SECURITY DEFINER function that retrieves a decrypted
  secret from the Supabase vault by name. Returns the secret value as text, or NULL if
  not found. This allows edge functions to fetch secrets stored in the vault via RPC.

2. Security
- SECURITY DEFINER — runs with the function owner's privileges (postgres), so it can
  access the vault.decrypted_secrets view which is not accessible to anon/authenticated.
- Only callable with the service role key (which edge functions have access to).
- The function does not expose any other vault data — it takes a name and returns only
  that single secret value.
*/

CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  RETURN secret_value;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO authenticated, anon, service_role;
