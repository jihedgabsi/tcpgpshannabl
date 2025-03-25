const net = require('net');
const gt06 = require('./gt06n.js').gt06;

const server = net.createServer((connection) => {
    connection.setEncoding('hex');

    connection.on('data', (data) => {
        const result = gt06.parse(data);
        console.log('Données décodées:', result);

        if (result.event === '01') {
            // Répondre au login
            const response = Buffer.from('787805010001D9DC0D0A', 'hex');
            connection.write(response);
            console.log('Réponse login envoyée:', response.toString('hex'));
        } else if (result.event === '12' && result.parsed) {
            // Afficher les données de localisation (exemple pour des messages type '12')
            console.log(`📍 Position: Latitude: ${result.parsed.latitude}, Longitude: ${result.parsed.longitude}, Vitesse: ${result.parsed.speed} km/h, Date & Heure: ${result.parsed.datetime}`);
        } else if (result.event === '13' && result.parsed) {
            // Afficher les informations de statut (exemple pour des messages type '13')
            console.log("🔹 Statut GPS:", result.parsed);
        } else {
            console.log("⚠️ Paquet inconnu ou non traité:", result);
        }
    });

}).listen(5000);

console.log('🚀 Serveur GT06N actif sur le port 5000');
