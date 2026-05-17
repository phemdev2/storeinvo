import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex');

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(body);
  const data = event.data;

  try {
    switch (event.event) {
      case 'subscription.create':
        await supabaseAdmin
          .from('companies')
          .update({
            subscription_status: 'active',
            subscription_plan: data.plan?.interval, // 'monthly' or 'annually'
            subscription_ends_at: data.next_payment_date,
            paystack_customer_code: data.customer?.customer_code,
            paystack_subscription_code: data.subscription_code,
          })
          .eq('paystack_customer_code', data.customer?.customer_code);
        break;

      case 'charge.success':
        // Renew subscription period
        await supabaseAdmin
          .from('companies')
          .update({
            subscription_status: 'active',
            subscription_ends_at: data.paid_at
              ? new Date(new Date(data.paid_at).setMonth(new Date(data.paid_at).getMonth() + 1)).toISOString()
              : null,
          })
          .eq('paystack_customer_code', data.customer?.customer_code);
        break;

      case 'subscription.disable':
      case 'subscription.expiring_cards':
        await supabaseAdmin
          .from('companies')
          .update({ subscription_status: 'expired' })
          .eq('paystack_subscription_code', data.subscription_code);
        break;
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }

  return NextResponse.json({ received: true });
}