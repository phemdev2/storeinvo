import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, companyName, branchName, name } = await req.json();

  try {
    // 1. Create company
    const { data: company, error: compError } = await supabaseAdmin
      .from('companies')
      .insert({ name: companyName })
      .select('id')
      .single();
    if (compError) throw new Error(compError.message);

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        company_id: company.id,
        full_name: name,
        role: 'admin',
      });
    if (profileError) throw new Error(profileError.message);

    // 3. Create branch
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .insert({ company_id: company.id, name: branchName })
      .select('id')
      .single();
    if (branchError) throw new Error(branchError.message);

    return NextResponse.json({ branchId: branch.id });

  } catch (err: any) {
    // Rollback — delete the auth user
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}