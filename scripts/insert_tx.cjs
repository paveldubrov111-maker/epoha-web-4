const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kcsitkemfmkdlttvqegp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjc2l0a2VtZm1rZGx0dHZxZWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMxNzA2NywiZXhwIjoyMDg5ODkzMDY3fQ.0Fh83Zzsos8PtOP7qd8AtIWUkz41BhuBNzWnTz-6Em4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Searching for "Готівка" account...');
  const { data: accounts, error: accError } = await supabase.from('accounts').select('*');
  if (accError) { console.error(accError); return; }
  
  const cashAcc = accounts.find(a => a.name.toLowerCase().includes('готівк'));
  if (!cashAcc) { console.error('Account not found'); return; }
  console.log(`Found account: ${cashAcc.name} (${cashAcc.id})`);

  console.log('Searching for "Радість" category...');
  const { data: categories, error: catError } = await supabase.from('categories').select('*');
  if (catError) { console.error(catError); return; }
  
  const joyCat = categories.find(c => c.name.toLowerCase().includes('радість') || c.name.toLowerCase().includes('радость'));
  if (!joyCat) { console.error('Category not found'); return; }
  console.log(`Found category: ${joyCat.name} (${joyCat.id})`);

  const txId = require('crypto').randomUUID();
  const now = new Date().toISOString();
  
  const payload = {
    id: txId,
    user_id: cashAcc.user_id,
    amount: 500,
    type: 'expense',
    category_id: joyCat.id,
    account_id: cashAcc.id,
    date: now.slice(0, 10),
    description: 'Радість (ручна транзакція)',
    note: 'Додано системою Antigravity за запитом',
    currency: 'UAH',
    is_incoming: false
  };

  console.log('Inserting transaction...');
  const { error: txError } = await supabase.from('budget_txs').insert(payload);
  if (txError) { console.error('TX Error:', txError); return; }

  console.log('Updating account balance...');
  const newBalance = (cashAcc.balance || 0) - 500;
  const { error: upError } = await supabase.from('accounts').update({ balance: newBalance }).eq('id', cashAcc.id);
  
  if (upError) { console.error('Account Update Error:', upError); return; }
  
  console.log('Success! Transaction added and balance updated.');
}

run();
