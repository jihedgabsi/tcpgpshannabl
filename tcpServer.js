const net = require('net');
const gt06 = require('./gt06n.js').gt06;

const server = net.createServer((connection) => {
    connection.setEncoding('hex');

    connection.on('data', (data) => {
        const result = gt06.parse(data);
        console.log('Données décodées:', result);

        // Affichage des données pour les événements de localisation ou de statut
        if ((result.event === '12' || result.event === '13') && result.parsed) {
            if (result.event === '12') {
                // Affichage des coordonnées si c'est une localisation
                console.log(`📍 Position: Latitude: ${result.parsed.latitude}, Longitude: ${result.parsed.longitude}, Vitesse: ${result.parsed.speed} km/h, Date & Heure: ${result.parsed.datetime}`);
            } else if (result.event === '13') {
                // Affichage du statut GPS
                console.log("🔹 Statut GPS:", result.parsed);
            }
        } else if (!result.parsed) {
            // Affichage pour les paquets non traités ou inconnus
            console.log("⚠️ Paquet inconnu ou non traité:", result);
        }

        // Répondre aux messages de login
        if (result.event === '01') {
            const response = Buffer.from('787805010001D9DC0D0A', 'hex');
            connection.write(response);
        }
    });
}).listen(5000);

console.log('🚀 Serveur GT06N actif sur le port 5000');
