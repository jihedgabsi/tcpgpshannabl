const net = require('net');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');
dotenv.config();
connectDB();

// Créer un modèle plus flexible pour stocker n'importe quel format de données
const RawGpsSchema = new mongoose.Schema({
  deviceId: String,
  rawData: String,
  parsedData: mongoose.Schema.Types.Mixed,
  receivedAt: {
    type: Date,
    default: Date.now
  }
});

const RawGpsData = mongoose.model('RawGpsData', RawGpsSchema);

const server = net.createServer(socket => {
  console.log('Nouvelle connexion TCP');
  
  socket.on('data', async data => {
    // Convertir les données brutes en chaîne de caractères
    const rawMessage = data.toString('hex'); // Format hexadécimal
    const textMessage = data.toString('utf8'); // Format texte
    
    console.log('Données brutes (hex):', rawMessage);
    console.log('Données texte:', textMessage);
    
    try {
      // Essayer d'extraire un identifiant de l'appareil si possible
      let deviceId = 'unknown';
      // Tentative de parser différents formats connus
      const parsedData = parseGpsData(textMessage, rawMessage);
      
      if (parsedData.deviceId) {
        deviceId = parsedData.deviceId;
      }
      
      // Enregistrer les données brutes et analysées
      const gpsEntry = new RawGpsData({
        deviceId: deviceId,
        rawData: rawMessage,
        parsedData: parsedData
      });
      
      await gpsEntry.save();
      console.log("Données GPS enregistrées !");
      
      // Envoyer une réponse ACK à l'appareil si nécessaire
      if (parsedData.needsAck) {
        socket.write(Buffer.from(parsedData.ackResponse || '01', 'hex'));
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des données GPS :", error);
    }
  });
  
  socket.on('error', err => console.error("Erreur socket :", err));
  socket.on('end', () => console.log("Connexion terminée"));
});

// Fonction qui tente de parser différents formats connus de traceurs GPS
function parseGpsData(textMessage, hexMessage) {
  const result = {
    original: {
      text: textMessage,
      hex: hexMessage
    },
    needsAck: false
  };
  
  // Essayer format standard (deviceId,lat,lng,speed)
  const standardParts = textMessage.split(',');
  if (standardParts.length === 4) {
    try {
      result.format = 'standard';
      result.deviceId = standardParts[0];
      result.latitude = parseFloat(standardParts[1]);
      result.longitude = parseFloat(standardParts[2]);
      result.speed = parseFloat(standardParts[3]);
      return result;
    } catch (e) {
      // Si erreur, continuer avec d'autres formats
    }
  }
  
  // Essayer de détecter le format GT06N
  if (hexMessage.length > 10) {
    // Format typique GT06N commence par 78 78
    if (hexMessage.startsWith('7878')) {
      result.format = 'gt06n';
      // Extraire la longueur du paquet
      const packetLength = parseInt(hexMessage.substring(4, 6), 16);
      // Extraire le type de protocole
      const protocolId = hexMessage.substring(6, 8);
      
      result.needsAck = true;
      result.ackResponse = '787805' + protocolId + '0001' + 'D9DC' + '0D0A';
      
      // Essayer d'extraire IMEI pour les paquets Login (0x01)
      if (protocolId === '01' && packetLength === 8) {
        const imei = hexMessage.substring(8, 8 + 16);
        result.deviceId = imei;
        result.messageType = 'login';
      } else if (protocolId === '12' || protocolId === '22') {
        // Location data
        result.messageType = 'location';
        // Parser plus de détails si nécessaire...
      }
      
      return result;
    }
  }
  
  // Si aucun format n'est reconnu, retourner les données brutes
  result.format = 'unknown';
  return result;
}

// Démarrer le serveur TCP
const PORT = process.env.TCP_PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Serveur TCP en écoute sur le port ${PORT}`));
