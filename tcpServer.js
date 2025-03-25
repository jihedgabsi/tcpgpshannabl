const net = require('net');

// Définition du port et de l'adresse IP
const PORT = process.env.TCP_PORT || 5000;
const HOST = '0.0.0.0';

// Création du serveur TCP
const server = net.createServer((socket) => {
    console.log(`Client connecté : ${socket.remoteAddress}:${socket.remotePort}`);

    // Gestion des données reçues
    socket.on('data', (data) => {
        console.log(`Données reçues : ${data.toString('hex')}`);

        // Vérifier le format des données et envoyer une réponse
        if (data.length >= 4 && data[3] === 1) {
            console.log('Trame valide détectée.');

            // Exemple de réponse
            const response = Buffer.from([0x78, 0x78, 0x05, 0x01, 0x00, 0x00, 0x00, 0x0D, 0x0A]);
            socket.write(response);
            console.log('Réponse envoyée au client.');
        } else {
            console.log('Données reçues non valides.');
        }
    });

    // Gestion de la fermeture de la connexion
    socket.on('close', () => {
        console.log(`Connexion fermée : ${socket.remoteAddress}:${socket.remotePort}`);
    });

    // Gestion des erreurs
    socket.on('error', (err) => {
        console.error(`Erreur sur le socket : ${err.message}`);
    });
});

// Démarrage du serveur TCP
server.listen(PORT, HOST, () => {
    console.log(`Serveur TCP en écoute sur ${HOST}:${PORT}`);
});
