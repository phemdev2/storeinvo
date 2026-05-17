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
        metadata: { company_id: companyId },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&status=success`,
      }),
    });

    const data = await res.json();

    if (!data.status) {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

    return NextResponse.json({ url: data.data.authorization_url });

  } catch (err: any) {
    console.error('Paystack init error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}