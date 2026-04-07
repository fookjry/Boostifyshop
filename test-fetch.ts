async function testFetch() {
  try {
    const res = await fetch('https://gift.truemoney.com/campaign/v1/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
        'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
        'Origin': 'https://gift.truemoney.com',
      },
      body: JSON.stringify({
        mobile: '0812345678',
        voucher_hash: 'dummy_hash'
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text.substring(0, 200));
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

testFetch();
