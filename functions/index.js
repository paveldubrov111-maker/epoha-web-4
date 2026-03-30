const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });

admin.initializeApp();

exports.monobankProxy = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    const { method, headers, url, body } = req;
    
    // Extract the path after /api/monobank
    const monobankPath = url.replace(/^\/api\/monobank/, '');
    const targetUrl = `https://api.monobank.ua${monobankPath}`;
    
    console.log(`[PROXY] Forwarding ${method} to ${targetUrl}`);

    try {
      const response = await axios({
        method,
        url: targetUrl,
        headers: {
          'X-Token': headers['x-token'],
          'Content-Type': 'application/json',
        },
        data: body,
        timeout: 10000, // 10s timeout
      });

      res.status(response.status).json(response.data);
    } catch (error) {
      console.error('[PROXY] Error:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
      }
    }
  });
});
