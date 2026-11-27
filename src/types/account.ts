export interface AccountIdentity {
  id?: number | string;
  supabase_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  name: string;
  role: string;
  company_name?: string | null;
}

export interface AccountIdentityResponse {
  authenticated: true;
  user: AccountIdentity;
}
