const net = require('net');

const server = net.createServer(socket => {
    console.log('Nouvelle connexion TCP');

    socket.on('data', data => {
        const message = data.toString().trim();
        console.log(`📡 Données GPS reçues : ${message}`);
    });

    socket.on('error', err => console.error("❌ Erreur socket :", err));
    socket.on('end', () => console.log("🔌 Connexion terminée"));
});

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Serveur TCP en écoute sur le port ${PORT}`));
