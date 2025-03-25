const net = require('net');
const server = net.createServer(socket => {
    console.log('Nouvelle connexion TCP');

    socket.on('data', data => {
        // Convertir les données hexadécimales en chaîne de caractères
        const hexString = data.toString('hex');
        console.log(`Données reçues (hexadécimal) : ${hexString}`);

        // Vérifier si la trame commence par '7878' et se termine par '0d0a'
        if (hexString.startsWith('7878') && hexString.endsWith('0d0a')) {
            // Extraire la partie utile de la trame
            const payload = hexString.slice(4, -8); // Enlever les en-têtes et les pieds de trame

            // Décoder les valeurs
            const latitudeRaw = parseInt(payload.slice(0, 8), 16);
            const longitudeRaw = parseInt(payload.slice(8, 16), 16);
            const speedRaw = parseInt(payload.slice(16, 20), 16);

            // Convertir en degrés pour latitude et longitude
            const latitude = (latitudeRaw / 1000000) - 90; // Ajuster selon votre format de données
            const longitude = (longitudeRaw / 1000000) - 180; // Ajuster selon votre format de données

            // Convertir en km/h pour la vitesse
            const speed = speedRaw / 10; // Ajuster selon votre format de données

            // Afficher les données décodées
            console.log(`📍 Position GPS :`);
            console.log(`   🌍 Latitude : ${latitude.toFixed(6)}°`);
            console.log(`   🌍 Longitude : ${longitude.toFixed(6)}°`);
            console.log(`   🚗 Vitesse : ${speed.toFixed(1)} km/h`);
        } else {
            console.log('Trame invalide ou format inattendu.');
        }
    });

    socket.on('error', err => console.error('Erreur socket :', err));
    socket.on('end', () => console.log('Connexion terminée'));
});

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
