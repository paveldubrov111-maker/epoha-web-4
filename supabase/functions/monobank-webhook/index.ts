import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // The webhook URL should be: .../monobank-webhook?connId=UUID
    const url = new URL(req.url)
    const connId = url.searchParams.get('connId')

    if (!connId) {
      console.error('[WEBHOOK] Missing connId')
      return new Response(JSON.stringify({ error: 'Missing connId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payload = await req.json()
    console.log(`[WEBHOOK] Received payload for conn ${connId}:`, JSON.stringify(payload))

    // Monobank webhook payload structure:
    // {
    //   "type": "StatementItem",
    //   "data": {
    //     "account": "...",
    //     "statementItem": {
    //       "id": "...",
    //       "time": 12345678,
    //       "description": "...",
    //       "mcc": 123,
    //       "amount": -10000,
    //       "operationAmount": -10000,
    //       "currencyCode": 980,
    //       ...
    //     }
    //   }
    // }

    if (payload.type !== 'StatementItem') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { account: bankAccountId, statementItem } = payload.data
    
    // Find the connection and user
    const { data: connection, error: connError } = await supabase
      .from('bankConnections')
      .select('userId, name')
      .eq('id', connId)
      .single()

    if (connError || !connection) {
      console.error('[WEBHOOK] Connection not found:', connError)
      return new Response(JSON.stringify({ error: 'Connection not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = connection.userId

    // Find the specific account by bankAccountId
    const { data: dbAccount, error: accError } = await supabase
      .from('accounts')
      .select('id, name, currency')
      .eq('userId', userId)
      .eq('bankAccountId', bankAccountId)
      .single()

    if (accError || !dbAccount) {
      console.warn('[WEBHOOK] Account not found for bankAccountId:', bankAccountId)
      return new Response('ok', { headers: corsHeaders }) // Still return OK to Monobank
    }

    // Map Monobank currency code to our Currency type
    const currencyMap: Record<number, string> = {
      980: 'UAH',
      840: 'USD',
      978: 'EUR',
      985: 'PLN',
      826: 'GBP'
    }

    const INTERNAL_TRANSFER_PATTERNS = [
      'банка', 'jar', 'з рахунку', 'на рахунок', 'переказ між рахунками', 
      'з білої', 'на білу', 'з чорної', 'на чорну', 'переказ між',
      'з рахунку на', 'собі на', 'своїх рахунк', 'свою картк', 'власної картк', 
      'зі своєї картк', 'власну карту', 'own accounts', '«', '»', 'скарбничк',
      'account', 'картк', 'jar', 'банка', 'свої кошти', 'sweeping'
    ];

    const txDate = new Date(statementItem.time * 1000).toISOString().split('T')[0]
    const txTime = new Date(statementItem.time * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    const amount = statementItem.amount / 100

    const isTransfer = INTERNAL_TRANSFER_PATTERNS.some(p => (statementItem.description || '').toLowerCase().includes(p));
    const txType = isTransfer ? 'transfer' : (amount > 0 ? 'income' : 'expense');

    const newTx = {
      id: crypto.randomUUID(),
      userId,
      accountId: dbAccount.id,
      accountName: dbAccount.name,
      bankTxId: statementItem.id,
      amount: Math.abs(amount),
      currency: currencyMap[statementItem.currencyCode] || 'UAH',
      date: txDate,
      time: txTime,
      description: statementItem.description,
      type: txType,
      isAiCategorized: false,
      isIncoming: amount > 0,
      createdAt: new Date().toISOString()
    }

    let { error: upsertError } = await supabase
      .from('budgetTxs')
      .upsert(newTx, { onConflict: 'bankTxId' })

    if (upsertError && upsertError.code === 'PGRST204') {
      console.warn('[WEBHOOK] Column is_incoming missing, retrying without it...')
      const { isIncoming, ...rest } = newTx
      const { error: retryError } = await supabase
        .from('budgetTxs')
        .upsert(rest, { onConflict: 'bankTxId' })
      upsertError = retryError
    }

    if (upsertError) {
      console.error('[WEBHOOK] Upsert error:', upsertError)
      return new Response(JSON.stringify({ error: upsertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Update the account balance in real-time
    if (statementItem.balance !== undefined) {
      const newBalance = statementItem.balance / 100
      console.log(`[WEBHOOK] Updating account ${dbAccount.id} balance to ${newBalance}`)
      const { error: balanceError } = await supabase
        .from('accounts')
        .update({ balance: newBalance, updatedAt: new Date().toISOString() })
        .eq('id', dbAccount.id)
      
      if (balanceError) {
        console.error('[WEBHOOK] Error updating balance:', balanceError)
        // We don't return error here because the transaction was already saved
      }
    }

    console.log(`[WEBHOOK] Successfully saved tx ${statementItem.id}`)
    return new Response('ok', { headers: corsHeaders })

  } catch (error) {
    console.error('[WEBHOOK] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
