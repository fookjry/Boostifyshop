import http from 'http';

http.get('http://0.0.0.0:3000/api/settings/payment_methods', (resp) => {
  let data = '';
  resp.on('data', (chunk) => data += chunk);
  resp.on('end', () => console.log('Response:', data));
}).on('error', (err) => console.log('Error:', err.message));
