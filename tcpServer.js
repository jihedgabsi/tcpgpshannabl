const net = require('net');

// Fonction pour décoder les données
function decodeGpsData(data) {
    const buffer = Buffer.from(data, 'hex'); // Si les données sont en hex
    const latitude = buffer.readUInt32LE(4) / 1000000.0; // Latitude (supposée sur 4 octets)
    const longitude = buffer.readUInt32LE(8) / 1000000.0; // Longitude (supposée sur 4 octets)
    const speed = buffer.readUInt16LE(12); // Vitesse (2 octets)

    return {
        latitude,
        longitude,
        speed
    };
}

const server = net.createServer(socket => {
    console.log('Nouvelle connexion TCP');

    socket.on('data', data => {
        console.log(`Données brutes reçues : ${data.toString('hex')}`);

        // Si la donnée reçue a la longueur attendue
        if (data.length >= 16) {
            const gpsData = decodeGpsData(data);
            console.log(`Latitude: ${gpsData.latitude}`);
            console.log(`Longitude: ${gpsData.longitude}`);
            console.log(`Vitesse: ${gpsData.speed} km/h`);
        } else {
            console.log("Message non valide");
        }
    });

    socket.on('error', err => console.error("Erreur socket :", err));
    socket.on('end', () => console.log("Connexion terminée"));
});

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
