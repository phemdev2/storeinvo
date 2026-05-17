import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  const companyId = searchParams.get('company_id');

  if (!reference || !companyId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&status=error`
    );
  }

  try {
    // Verify transaction with Paystack
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await res.json();
    console.log('[Callback] verify response:', JSON.stringify(data));

    if (data.status && data.data.status === 'success') {
      const planInterval = data.data.plan_object?.interval ?? null;

      await supabaseAdmin
        .from('companies')
        .update({
          subscription_status: 'active',
          subscription_plan: planInterval,
          paystack_customer_code: data.data.customer?.customer_code,
          subscription_ends_at: planInterval === 'annually'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', companyId);

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&status=success`
      );
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&status=error`
    );

  } catch (err: any) {
    console.error('[Callback] error:', err.message);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&status=error`
    );
  }
}