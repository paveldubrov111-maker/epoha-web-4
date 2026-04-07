import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Функція для отримання Access Token від Google для Firestore
async function getFirestoreAccessToken(serviceAccount: any) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore",
  };

  const key = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const jwt = await create(header, payload, key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Отримуємо конфігурацію Firebase з секретів
    const firebaseKeyRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!firebaseKeyRaw) {
      console.error('[WEBHOOK] Missing FIREBASE_SERVICE_ACCOUNT secret')
      return new Response(JSON.stringify({ error: 'Missing configuration' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const firebaseKey = JSON.parse(firebaseKeyRaw)

    const url = new URL(req.url)
    const connId = url.searchParams.get('connId')

    if (!connId) {
      return new Response(JSON.stringify({ error: 'Missing connId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payload = await req.json()
    console.log(`[WEBHOOK] Received payload for conn ${connId}`)

    if (payload.type !== 'StatementItem') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { account: bankAccountId, statementItem } = payload.data
    
    // Знаходимо підключення та користувача в Supabase
    const { data: connection, error: connError } = await supabase
      .from('bankConnections')
      .select('userId, name')
      .eq('id', connId)
      .single()

    if (connError || !connection) {
      console.error('[WEBHOOK] Connection not found:', connId)
      return new Response('ok', { headers: corsHeaders })
    }

    const userId = connection.userId

    // Отримуємо токен для Firestore
    const accessToken = await getFirestoreAccessToken(firebaseKey)

    // Знаходимо акаунт у Firestore через REST API
    const firestoreBase = `https://firestore.googleapis.com/v1/projects/${firebaseKey.project_id}/databases/(default)/documents`
    
    // Список акаунтів користувача
    const accListRes = await fetch(`${firestoreBase}/users/${userId}/accounts`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const accListData = await accListRes.json()
    const dbAccount = accListData.documents?.find((doc: any) => {
      const fields = doc.fields
      return fields.bankAccountId?.stringValue === bankAccountId
    })

    if (!dbAccount) {
      console.warn('[WEBHOOK] App account not linked for bankAccountId:', bankAccountId)
      return new Response('ok', { headers: corsHeaders })
    }

    const appAccId = dbAccount.name.split('/').pop()
    const appAccName = dbAccount.fields.name?.stringValue || 'Account'

    // Мапінг валют
    const currencyMap: Record<number, string> = { 980: 'UAH', 840: 'USD', 978: 'EUR', 985: 'PLN' }

    // Логіка визначення типів (Переказ / Витрата)
    const INTERNAL_TRANSFER_PATTERNS = [
      'банка', 'jar', 'з рахунку', 'на рахунок', 'переказ між рахунками', 
      'з білої', 'на білу', 'з чорної', 'на чорну', 'переказ між',
      'з рахунку на', 'собі на', 'своїх рахунк', 'свою картк', 'власної картк', 
      'зі своєї картк', 'власну карту', 'own accounts', 'скарбничк', 'sweeping'
    ];

    const amount = statementItem.amount / 100
    const txDate = new Date(statementItem.time * 1000).toISOString().split('T')[0]
    const txTime = new Date(statementItem.time * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    const isTransfer = INTERNAL_TRANSFER_PATTERNS.some(p => (statementItem.description || '').toLowerCase().includes(p));
    const txType = isTransfer ? 'transfer' : (amount > 0 ? 'income' : 'expense');

    // Створюємо транзакцію у Firestore
    const txId = crypto.randomUUID()
    const txDoc = {
      fields: {
        id: { stringValue: txId },
        type: { stringValue: txType },
        date: { stringValue: txDate },
        time: { stringValue: txTime },
        amount: { doubleValue: Math.abs(amount) },
        currency: { stringValue: currencyMap[statementItem.currencyCode] || 'UAH' },
        accountId: { stringValue: appAccId },
        description: { stringValue: statementItem.description || '' },
        accountName: { stringValue: appAccName },
        bankTxId: { stringValue: statementItem.id },
        isAiCategorized: { booleanValue: false },
        isIncoming: { booleanValue: amount > 0 }
      }
    }

    const saveTxRes = await fetch(`${firestoreBase}/users/${userId}/budgetTxs/${txId}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(txDoc)
    })

    if (!saveTxRes.ok) {
        const err = await saveTxRes.text()
        console.error('[WEBHOOK] Firestore Save Error:', err)
    } else {
        console.log(`[WEBHOOK] Successfully saved to Firestore: ${statementItem.id}`)
    }

    // Оновлюємо баланс акаунта у Firestore
    if (statementItem.balance !== undefined) {
      const newBalance = statementItem.balance / 100
      await fetch(`${firestoreBase}/users/${userId}/accounts/${appAccId}?updateMask.fieldPaths=balance`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: { balance: { doubleValue: newBalance } }
        })
      })
    }

    return new Response('ok', { headers: corsHeaders })

  } catch (error) {
    console.error('[WEBHOOK] Fatal Error:', error.message)
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})

