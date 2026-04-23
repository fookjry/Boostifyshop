import axios from 'axios';
axios.get('http://localhost:3000/api/settings/global').then(console.log).catch(console.error);
