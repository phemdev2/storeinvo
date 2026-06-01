import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'storeflow.app';

const RESTRICTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/transactions',
  '/branches',
  '/reports',
  '/products',
  '/orders',
];

async function getCompanyByHost(host: string) {
  const hostname = host.split(':')[0];

  // Check if it's a subdomain: company.storeflow.app
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.replace(`.${ROOT_DOMAIN}`, '');
    if (slug === 'www') return null;
    const { data } = await supabaseAdmin
      .from('companies')
      .select('id, slug, subscription_status, trial_ends_at, subscription_ends_at')
      .eq('slug', slug)
      .single();
    return data;
  }

  // Check if it's a custom domain
  if (hostname !== ROOT_DOMAIN && hostname !== `www.${ROOT_DOMAIN}`) {
    const { data } = await supabaseAdmin
      .from('companies')
      .select('id, slug, subscription_status, trial_ends_at, subscription_ends_at')
      .eq('custom_domain', hostname)
      .single();
    return data;
  }

  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') || '';

  // ── Handle subdomain / custom domain routing ──
  const company = await getCompanyByHost(host);

  if (company) {
    // Rewrite /pos → actual page, inject company context via header
    const url = req.nextUrl.clone();

    // Add company info to headers for pages to read
    const res = NextResponse.rewrite(url);
    res.headers.set('x-company-id', company.id);
    res.headers.set('x-company-slug', company.slug);

    // Check subscription
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
  }

  // ── Main domain — handle restricted routes ──
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
    if (!user) return NextResponse.redirect(new URL('/login', req.url));

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const { data: comp } = await supabaseAdmin
      .from('companies')
      .select('subscription_status, trial_ends_at, subscription_ends_at')
      .eq('id', profile.company_id)
      .single();

    if (!comp) return res;

    const now = new Date();
    const trialExpired =
      comp.subscription_status === 'trial' &&
      comp.trial_ends_at &&
      new Date(comp.trial_ends_at) < now;

    const subExpired =
      comp.subscription_status === 'expired' ||
      (comp.subscription_status === 'active' &&
        comp.subscription_ends_at &&
        new Date(comp.subscription_ends_at) < now);

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
  matcher: ['/:path*'],
};