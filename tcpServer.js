const net = require('net');
const gt06 = require('./gt06n.js').gt06;

const server = net.createServer((connection) => {
    connection.setEncoding('hex');

    connection.on('data', (data) => {
        console.log('Donnée brute reçue:', data);

        // Conversion forcée en message de localisation (type 12)
        try {
            const forcedLocation = gt06.parseLocation(data);
            console.log(`📍 Conversion forcée en type 12: 
    Latitude: ${forcedLocation.latitude}, 
    Longitude: ${forcedLocation.longitude}, 
    Vitesse: ${forcedLocation.speed} km/h, 
    Date & Heure: ${forcedLocation.datetime}`);
        } catch (error) {
            console.error("Erreur lors de la conversion en type 12 :", error);
        }
    });

}).listen(5000);

console.log('🚀 Serveur GT06N actif sur le port 5000');
