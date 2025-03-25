const net = require('net');
const gt06 = require('./gt06n.js').gt06; // Modification ici

const server = net.createServer((connection) => {
    connection.setEncoding('hex');
    
   connection.on('data', (data) => {
    const result = gt06.parse(data);
    console.log('Données décodées:', result);

    if (result.event === '12') { // Position
        console.log(`Position reçue: Latitude ${result.parsed.latitude}, Longitude ${result.parsed.longitude}`);
    }

    if (result.event === '01') { // Réponse au login
        const response = Buffer.from('787805010001D9DC0D0A', 'hex');
        connection.write(response);
    }
});

    
}).listen(5000);

console.log('Serveur GT06N actif sur port 5000');
