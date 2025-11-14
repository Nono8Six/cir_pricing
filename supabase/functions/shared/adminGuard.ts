import type { SupabaseClient } from 'npm:@supabase/supabase-js';

const ADMIN_GUARD_RPC = 'admin_mutation_guard';

export class AdminGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminGuardError';
  }
}

export async function ensureAdmin(
  client: SupabaseClient,
  authorizationHeader: string | null | undefined
): Promise<void> {
  if (!authorizationHeader) {
    throw new AdminGuardError('Missing Authorization header');
  }

  const { error } = await client.rpc(ADMIN_GUARD_RPC, undefined, {
    headers: { Authorization: authorizationHeader }
  });

  if (error) {
    throw new AdminGuardError(
      'Access denied: unable to verify admin role'
    );
  }
}
