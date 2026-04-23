const http = require('http');
http.get('http://localhost:3000', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d.substring(0, 500) + (d.length > 500 ? '...' : '')));
}).on('error', console.error);
