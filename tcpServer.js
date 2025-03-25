const net = require('net');
const GpsData = require('./models/GpsData');
const dotenv = require('dotenv');
require('dotenv').config();
const connectDB = require('./config/database');

class GT06NDecoder {
  constructor() {
    this.protocolVersion = 0x01;
  }

  // Méthode principale de décodage des trames
  decodeMessage(buffer) {
    try {
      // Vérification de l'entête du protocole
      if (buffer.length < 5) {
        throw new Error('Trame trop courte');
      }

      // Lecture de l'en-tête et de la longueur
      const start = buffer.readUInt16BE(0);
      const length = buffer[2];
      const protocolNumber = buffer[3];

      // Vérification de l'en-tête et de la version du protocole
      if (start !== 0x7878) {
        throw new Error('En-tête invalide');
      }

      // Type de message
      const messageType = buffer[4];

      // Décodage selon le type de message
      switch (messageType) {
        case 0x01: // Login
          return this.decodeLogin(buffer);
        case 0x10: // Position
          return this.decodePosition(buffer);
        case 0x13: // Status
          return this.decodeStatus(buffer);
        case 0x05: // Heartbeat/Handshake
          return this.decodeHeartbeat(buffer);
        default:
          return this.decodeUnknownMessage(buffer);
      }
    } catch (error) {
      return { 
        error: error.message, 
        raw: buffer.toString('hex') 
      };
    }
  }

  // Décodage du message de login
  decodeLogin(buffer) {
    const imei = buffer.slice(5, 12).toString('hex');
    return {
      type: 'login',
      imei: imei
    };
  }

  // Décodage des données de position
  decodePosition(buffer) {
    // Extraction des données GPS
    const date = this.decodeDate(buffer.slice(5, 11));
    const latitude = this.decodeCoordinate(buffer.slice(11, 15));
    const longitude = this.decodeCoordinate(buffer.slice(15, 19));
    
    return {
      type: 'position',
      date: date,
      latitude: latitude,
      longitude: longitude,
      speed: buffer[19],
      course: buffer.readUInt16BE(20)
    };
  }

  // Décodage du statut
  decodeStatus(buffer) {
    return {
      type: 'status',
      raw: buffer.toString('hex')
    };
  }

  // Décodage des messages heartbeat/handshake
  decodeHeartbeat(buffer) {
    // Exemple de décodage basique d'un heartbeat
    return {
      type: 'heartbeat',
      raw: buffer.toString('hex')
    };
  }

  // Décodage des messages inconnus avec plus de détails
  decodeUnknownMessage(buffer) {
    // Extraction de l'IMEI potentiel
    const potentialImei = buffer.slice(5, 12).toString('hex');

    return {
      type: 'unknown',
      raw: buffer.toString('hex'),
      details: {
        bufferLength: buffer.length,
        startBytes: buffer.slice(0, 2).toString('hex'),
        lengthByte: buffer[2],
        protocolByte: buffer[3],
        messageType: buffer[4],
        potentialImei: potentialImei
      }
    };
  }

  // Utilitaire pour décoder la date
  decodeDate(dateBuffer) {
    const year = dateBuffer.readUInt8(0) + 2000;
    const month = dateBuffer.readUInt8(1);
    const day = dateBuffer.readUInt8(2);
    const hours = dateBuffer.readUInt8(3);
    const minutes = dateBuffer.readUInt8(4);
    const seconds = dateBuffer.readUInt8(5);

    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  // Utilitaire pour décoder les coordonnées
  decodeCoordinate(coordBuffer) {
    const value = coordBuffer.readUInt32BE(0);
    const degrees = Math.floor(value / 1000000);
    const minutes = (value % 1000000) / 10000;
    return degrees + (minutes / 60);
  }
}

class GT06NServer {
  constructor() {
    this.decoder = new GT06NDecoder();
    connectDB(); // Connexion à la base de données
  }

  // Création du serveur TCP
  createServer() {
    const server = net.createServer(socket => {
      console.log('Nouvelle connexion TCP');

      socket.on('data', async data => {
        try {
          const decodedMessage = this.decoder.decodeMessage(data);
          
          // Gestion des différents types de messages
          switch (decodedMessage.type) {
            case 'login':
              console.log(`Connexion du tracker IMEI: ${decodedMessage.imei}`);
              this.handleLogin(decodedMessage.imei);
              break;

            case 'position':
              console.log('Données de position reçues', decodedMessage);
              await this.savePositionData(decodedMessage);
              break;

            case 'status':
              console.log('Statut du tracker', decodedMessage);
              break;

            case 'heartbeat':
              console.log('Heartbeat reçu', decodedMessage);
              this.handleHeartbeat(decodedMessage);
              break;

            case 'unknown':
              console.log('Message non reconnu détaillé:', decodedMessage);
              this.logUnknownMessage(decodedMessage);
              break;

            default:
              console.log('Message non géré', decodedMessage);
          }

          // Réponse de confirmation (si nécessaire)
          this.sendConfirmation(socket, decodedMessage);
        } catch (error) {
          console.error('Erreur de décodage:', error);
        }
      });

      socket.on('error', err => console.error("Erreur socket :", err));
      socket.on('end', () => console.log("Connexion terminée"));
    });

    return server;
  }

  // Méthode de gestion de la connexion du tracker
  async handleLogin(imei) {
    try {
      console.log(`Tracker ${imei} connecté`);
      // Logique supplémentaire si nécessaire
    } catch (error) {
      console.error('Erreur lors de la gestion du login:', error);
    }
  }

  // Gestion des heartbeats
  handleHeartbeat(heartbeatData) {
    console.log('Heartbeat traité:', heartbeatData);
  }

  // Enregistrement des messages inconnus pour analyse
  logUnknownMessage(messageData) {
    console.log('Détails du message inconnu:', JSON.stringify(messageData, null, 2));
    // Possibilité d'ajouter une logique pour stocker ces messages pour analyse
  }

  // Envoi d'une confirmation au tracker
  sendConfirmation(socket, message) {
    // Implémentation basique de confirmation
    // Le format exact dépend du protocole spécifique du tracker
    try {
      // Exemple de confirmation générique
      const confirmationBuffer = Buffer.from([0x78, 0x78, 0x05, 0x01, 0x00, 0x00, 0x0D, 0x0A]);
      socket.write(confirmationBuffer);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la confirmation:', error);
    }
  }

  // Méthode de sauvegarde des données de position
  async savePositionData(positionData) {
    try {
      const { latitude, longitude, speed, date } = positionData;

      // Vérifier si le deviceId existe déjà
      const existingGpsEntry = await GpsData.findOne({ 
        deviceId: positionData.imei || 'unknown' 
      });

      if (existingGpsEntry) {
        // Mise à jour des données existantes
        await GpsData.updateOne(
          { deviceId: positionData.imei || 'unknown' },
          { 
            latitude, 
            longitude, 
            speed: speed || 0, 
            date: date || new Date(),
            updatedAt: new Date() 
          }
        );
        console.log("Données GPS mises à jour !");
      } else {
        // Création d'un nouvel enregistrement si deviceId n'existe pas
        const gpsEntry = new GpsData({ 
          deviceId: positionData.imei || 'unknown', 
          latitude, 
          longitude, 
          speed: speed || 0,
          date: date || new Date()
        });
        await gpsEntry.save();
        console.log("Nouvelles données GPS enregistrées !");
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des données GPS :", error);
    }
  }

  // Démarrage du serveur
  start(port = process.env.TCP_PORT || 5000) {
    const server = this.createServer();
    server.listen(port, '0.0.0.0', () => {
      console.log(`Serveur TCP GT06N en écoute sur le port ${port}`);
    });
  }
}

// Exportation pour utilisation
module.exports = {
  GT06NDecoder,
  GT06NServer
};

// Démarrage automatique du serveur si le fichier est exécuté directement
if (require.main === module) {
  const server = new GT06NServer();
  server.start();
}
