import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, plan, companyId } = await req.json();

    if (!email || !plan || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        plan,
        amount: 10000,
        channels: ['bank_transfer'], // ← only show bank transfer option
        metadata: {
          company_id: companyId,
          cancel_action: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/callback?company_id=${companyId}`,
      }),
    });

    const data = await res.json();
    console.log('Paystack init response:', JSON.stringify(data));

    if (!data.status) {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

    return NextResponse.json({ url: data.data.authorization_url });

  } catch (err: any) {
    console.error('Paystack init error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}