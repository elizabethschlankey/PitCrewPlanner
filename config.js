// Fill these in from your Supabase project: Project Settings > API.
// SUPABASE_ANON_KEY is the "anon public" key — safe to ship in client
// code, because Row Level Security (see schema.sql) is what actually
// controls who can read/write. Never put the "service_role" key here.
window.SUPABASE_CONFIG = {
  url: 'https://ficeyvfwfpyiejmbftad.supabase.co',
  anonKey: 'sb_publishable_cXwIedgSG-n7Vu-xlLO9cA_Qax-IjIQ',

  // Director/Lead Volunteer PIN logins sign the browser into one of these
  // two shared, non-personal Supabase Auth accounts behind the scenes —
  // see README.md "Set up Director/Lead Volunteer PIN access" for how to
  // create them. Their passwords have the SAME public exposure as
  // anonKey above (this whole file ships to every browser) — they are
  // not a real secret boundary. The actual gate a person faces is the
  // PIN, checked server-side (verify_role_pin in schema.sql) before the
  // app ever uses these credentials. Leave this block out (or leave the
  // emails blank) until you've created the two accounts — the login
  // screen shows "Setup incomplete" for Director/Lead Volunteer until
  // both are filled in.
  roleAccounts: {
    director:       { email: '', password: '' },
    lead_volunteer: { email: '', password: '' }
  }
};
