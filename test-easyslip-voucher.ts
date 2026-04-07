import axios from 'axios';

async function testEasyslipVoucher() {
  try {
    const res = await axios.post('https://developer.easyslip.com/api/v1/voucher', {
      phone: '0812345678',
      voucher: 'dummy_hash'
    }, {
      headers: {
        'Authorization': 'Bearer dummy',
        'Content-Type': 'application/json'
      }
    });
    console.log(res.data);
  } catch (e: any) {
    console.log("easyslip voucher error:", e.response?.status, e.response?.data || e.message);
  }
}

testEasyslipVoucher();
