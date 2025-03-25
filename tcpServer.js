const net = require('net');
const PORT = process.env.TCP_PORT || 5000;
const HOST = '0.0.0.0';

// Convertit un buffer en une chaîne hexadécimale formatée
function formatHex(buffer) {
    return buffer.toString('hex').match(/.{1,2}/g).join(' ').toUpperCase();
}

// Convertit un buffer en entier signé
function toSignedInt(buffer) {
    let value = buffer.readInt32BE(0);
    return value / 1000000; // Ajuste la précision pour GPS
}

// Fonction pour extraire la position et la vitesse
function parseGPSData(data) {
    console.log('----------------------------------------');
    console.log(`📥 Trame reçue (${data.length} octets) :`);
    console.log(`🔹 Hexadecimal : ${formatHex(data)}`);

    if (data.length >= 12) {  // Vérification de la taille minimale
        let latitude = toSignedInt(data.slice(4, 8));
        let longitude = toSignedInt(data.slice(8, 12));
        let speed = data[12]; // Vitesse

        console.log(`📍 Position GPS :`);
        console.log(`   🌍 Latitude : ${latitude}`);
        console.log(`   🌍 Longitude : ${longitude}`);
        console.log(`   🚗 Vitesse : ${speed} km/h`);
    } else {
        console.log('⚠️ Données GPS invalides.');
    }

    console.log('----------------------------------------');
}

// Création du serveur TCP
const server = net.createServer((socket) => {
    console.log(`✅ Client connecté : ${socket.remoteAddress}:${socket.remotePort}`);

    // Gestion des données reçues
    socket.on('data', (data) => {
        parseGPSData(data);

        // Réponse au client (accusé de réception)
        const response = Buffer.from([0x78, 0x78, 0x05, 0x01, 0x00, 0x00, 0x00, 0x0D, 0x0A]);
        socket.write(response);
        console.log('📤 Réponse envoyée au client.');
    });

    // Gestion des erreurs
    socket.on('error', (err) => {
        console.error(`❌ Erreur sur le socket : ${err.message}`);
    });

    // Fermeture de la connexion
    socket.on('close', () => {
        console.log(`❌ Connexion fermée : ${socket.remoteAddress}:${socket.remotePort}`);
    });
});

// Démarrer le serveur
server.listen(PORT, HOST, () => {
    console.log(`🚀 Serveur TCP en écoute sur ${HOST}:${PORT}`);
});
