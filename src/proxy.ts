import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESTRICTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/transactions',
  '/branches',
  '/reports',
  '/products',
  '/orders',
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!RESTRICTED_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  try {
    const res = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('subscription_status, trial_ends_at, subscription_ends_at')
      .eq('id', profile.company_id)
      .single();

    if (!company) return res;

    const now = new Date();

    const trialExpired =
      company.subscription_status === 'trial' &&
      company.trial_ends_at &&
      new Date(company.trial_ends_at) < now;

    const subExpired =
      company.subscription_status === 'expired' ||
      (company.subscription_status === 'active' &&
        company.subscription_ends_at &&
        new Date(company.subscription_ends_at) < now);

    if (trialExpired || subExpired) {
      return NextResponse.redirect(
        new URL('/settings?tab=billing&reason=expired', req.url)
      );
    }

    return res;

  } catch (err) {
    console.error('[Proxy] error:', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/transactions/:path*',
    '/branches/:path*',
    '/reports/:path*',
    '/products/:path*',
    '/orders/:path*',
  ],
};