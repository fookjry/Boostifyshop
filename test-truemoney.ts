import axios from 'axios';

async function testTruemoney() {
  try {
    const redeemRes = await axios.post(`https://gift.truemoney.com/campaign/v1/redeem`, {
      mobile: '0812345678',
      voucher_hash: 'dummy_hash'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
        'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
        'Origin': 'https://gift.truemoney.com',
      }
    });
    console.log(redeemRes.data);
  } catch (e: any) {
    console.log("TrueMoney error:", e.response?.status, e.response?.data || e.message);
  }
}

testTruemoney();
