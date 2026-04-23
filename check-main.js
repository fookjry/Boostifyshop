import http from 'http';
http.get('http://localhost:3000/src/main.tsx', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d.substring(0, 500)));
}).on('error', console.error);
