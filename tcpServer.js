const net = require('net');
const gt06 = require('./gt06n.js').gt06; // Assurez-vous d'avoir le module gt06n.js adapté

const server = net.createServer((connection) => {
    // Définir l'encodage pour que les données soient en hexadécimal
    connection.setEncoding('hex');

    connection.on('data', (data) => {
        const result = gt06.parse(data);
        console.log('Données décodées:', result);

        // Répondre directement au message de login (event '01')
        if (result.event === '01') {
            // Envoi de la trame de réponse : 787805010001D9DC0D0A
            const response = Buffer.from('787805010001D9DC0D0A', 'hex');
            connection.write(response);
            console.log('Réponse login envoyée:', response.toString('hex'));
        } else {
            console.log('Message reçu (non-login) :', data);
        }
    });

    connection.on('error', (err) => {
        console.error('Erreur sur la connexion:', err);
    });

}).listen(5000);

console.log('🚀 Serveur GT06N actif sur le port 5000');
