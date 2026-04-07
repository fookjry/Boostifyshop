import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://developer.easyslip.com/api/v1/verify');
    console.log(res.data);
  } catch (e: any) {
    console.log("get error:", e.response?.data || e.message);
  }
}

test();
