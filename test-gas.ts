import axios from 'axios';

async function testGas() {
  try {
    const gasUrl = 'https://script.google.com/macros/s/AKfycbwoxl_G9I_4bxFUVktosdbz3C2kXIw_91L2nSyl6MYKcokFEXvy8J1Yt3A--_P320ld/exec';
    const res = await axios.post(gasUrl, {
      mobile: '0812345678',
      voucher_hash: 'dummy_hash'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });
    console.log("Status:", res.status);
    console.log("Data:", res.data);
  } catch (e: any) {
    console.log("Error:", e.message);
    if (e.response) {
      console.log("Response data:", e.response.data);
    }
  }
}

testGas();
