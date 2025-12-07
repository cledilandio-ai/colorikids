const net = require('net');
const client = new net.Socket();
const port = 6543;
// Tentativa 1: Região São Paulo (sa-east-1)
const host = 'aws-0-sa-east-1.pooler.supabase.com';

console.log(`Testing connection to ${host}:${port}...`);

const timeout = setTimeout(() => {
    console.error('Connection timed out');
    client.destroy();
    process.exit(1);
}, 5000);

client.connect(port, host, function () {
    clearTimeout(timeout);
    console.log('Connected successfully!');
    client.destroy();
});

client.on('error', function (err) {
    clearTimeout(timeout);
    console.error('Connection failed:', err.message);
    process.exit(1);
});

client.on('close', function () {
    console.log('Connection closed');
});
