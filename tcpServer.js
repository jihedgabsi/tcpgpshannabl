const net = require('net');

const server = net.createServer(socket => {
    console.log('Nouvelle connexion TCP');

    socket.on('data', data => {
        // Afficher les données brutes en hexadécimal
        const hexData = data.toString('hex');
        console.log(`📡 Données brutes (hexadécimal) : ${hexData}`);

        try {
            // Convertir en texte lisible si possible
            const textData = data.toString('utf-8');
            console.log(`📝 Données GPS décodées : ${textData}`);
        } catch (error) {
            console.error("❌ Erreur de décodage des données GPS :", error);
        }
    });

    socket.on('error', err => console.error("❌ Erreur socket :", err));
    socket.on('end', () => console.log("🔌 Connexion terminée"));
});

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Serveur TCP en écoute sur le port ${PORT}`));
