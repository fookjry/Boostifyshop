Promise.all([
  fetch('http://localhost:3000/api/device-options').then(r=>r.json()),
  fetch('http://localhost:3000/api/settings/global').then(r=>r.json())
]).then(console.log).catch(console.error);
