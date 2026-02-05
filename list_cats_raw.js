const https = require('https');

const SUPABASE_URL = 'https://cikaeialdcyxniwxtmzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpa2FlaWFsZGN5eG5pd3h0bXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjk2MjMsImV4cCI6MjA4NTYwNTYyM30.BtcIqTyIR4QZLNG6fYq-bQ3pY3xmjITzDTN9Z4SiOvQ';

const options = {
    hostname: 'cikaeialdcyxniwxtmzl.supabase.co',
    port: 443,
    path: '/rest/v1/users?select=category',
    method: 'GET',
    headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const users = JSON.parse(data);
            const categories = [...new Set(users.map(u => u.category))];
            console.log('Categories found in DB:', categories);
        } catch (e) {
            console.error('Error parsing response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
});

req.end();
