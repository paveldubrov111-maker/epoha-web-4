import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-okx-apikey, x-okx-secretkey, x-okx-passphrase, x-okx-path',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = (req.headers.get('x-okx-apikey') || '').trim();
    const secretKey = (req.headers.get('x-okx-secretkey') || '').trim();
    const passphrase = (req.headers.get('x-okx-passphrase') || '').trim();
    const okxPath = req.headers.get('x-okx-path') || '/api/v5/account/balance';
    
    if (!apiKey || !secretKey || !passphrase) {
      console.error('[OKX-PROXY] Missing credentials');
      return new Response(JSON.stringify({ error: 'Missing OKX credentials' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[OKX-PROXY] Request for: ${okxPath}`);
    console.log(`[OKX-PROXY] API Key: ${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`);
    console.log(`[OKX-PROXY] Passphrase length: ${passphrase.length}`);

    const timestamp = new Date().toISOString();
    const method = 'GET';
    const requestPath = okxPath;
    
    // HMAC-SHA256 signature: timestamp + method + requestPath + body
    const preHash = timestamp + method + requestPath;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const msgData = encoder.encode(preHash);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const sign = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    console.log(`[OKX-PROXY] Signature generated: ${sign.slice(0, 5)}...`);

    const targetUrl = `https://www.okx.com${requestPath}`;
    console.log(`[OKX-PROXY] Forwarding to ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': passphrase,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.text();
    console.log(`[OKX-PROXY] Response from OKX: ${response.status} ${data.slice(0, 100)}`);

    return new Response(data, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[OKX-PROXY] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
