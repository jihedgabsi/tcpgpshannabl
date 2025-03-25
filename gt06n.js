module.exports.gt06 = (function(){
    const eventTypes = {
        '01' : 'Login Message',
        '12' : 'Location Data',
        '13' : 'Status information',
        '15' : 'String information',
        '16' : 'Alarm data',
        '1A' : 'GPS, query address information by phone number',
        '80' : 'Command information sent by the server to the terminal',
    };

    // Décodage du message de login
    const parseLogin = (data) => {
        return {
            'eventType': eventTypes['01'],
            'imei': parseInt(data.substr(8,16), 16),
            'serialNumber': data.substr(22,4),
            'errorCheck': data.substr(26,4),
        };
    };

    // Conversion d'une date/heure encodée en hexadécimal en format lisible
    const parseDatetime = (data) => {
        const parts = {
            'year': data.substr(0,2),
            'month': data.substr(2,2),
            'day': data.substr(4,2),
            'hour': data.substr(6,2),
            'minute': data.substr(8,2),
            'second': data.substr(10,2),
        };

        const y = parseInt(parts.year, 16);
        const m = parseInt(parts.month, 16);
        const d = parseInt(parts.day, 16);
        const h = parseInt(parts.hour, 16);
        const i = parseInt(parts.minute, 16);
        const s = parseInt(parts.second, 16);
        return `${y}-${m}-${d} ${h}:${i}:${s}`;
    };

    // Conversion hexadécimal vers binaire
    const hex2bin = (hex) => {
        let bin = (parseInt(hex, 16)).toString(2);
        const hexLen = hex.length / 2 * 8;
        while(bin.length < hexLen){
            bin = '0' + bin;
        }
        return bin;
    };

    // Conversion d'une coordonnée hexadécimale en degré décimal
    const parseCoordinate = (hex, direction) => {
        let value = parseInt(hex, 16) / 1800000; // Conversion adaptée selon le protocole
        if (direction === 'S' || direction === 'W') {
            value *= -1;
        }
        return value;
    };

    // Décodage des messages de localisation
    const parseLocation = (data) => {
        const datasheet = {
            'datetime': data.substr(8,12),
            'quantity': data.substr(20,2),
            'lat': data.substr(22,8),
            'lon': data.substr(30,8),
            'speed': data.substr(38,2),
            'course': data.substr(40,4),
            'mcc': data.substr(44,4),
            'mnc': data.substr(48,2),
            'lac': data.substr(50,4),
            'cell_id': data.substr(54,6),
            'serial_number': data.substr(60,4),
            'error_check': data.substr(64,4),
            'stop_bit': data.substr(68,4),
        };

        const courseBin = hex2bin(datasheet.course);
        // Le bit indiquant la direction (latitude et longitude) se trouve dans courseBin
        const northLatitude = courseBin.substr(5, 1) === '1'; // 1 = Nord, 0 = Sud
        const eastLongitude  = courseBin.substr(4, 1) === '1'; // 1 = Est,  0 = Ouest

        return {
            'datetime': parseDatetime(datasheet.datetime),
            'satellites': parseInt(datasheet.quantity.substr(0,1), 16),
            'latitude': parseCoordinate(datasheet.lat, northLatitude ? 'N' : 'S'),
            'longitude': parseCoordinate(datasheet.lon, eastLongitude ? 'E' : 'W'),
            'speed': parseInt(datasheet.speed, 16),
            'direction': parseInt(courseBin.substr(6,10), 2),
            'mcc': datasheet.mcc,
            'mnc': datasheet.mnc,
            'lac': datasheet.lac,
            'cell_id': datasheet.cell_id,
            'serial_number': datasheet.serial_number,
            'error_check': datasheet.error_check,
            'stop_bit': datasheet.stop_bit,
        };
    };

    // Décodage des messages d'alarme
    const parseAlarm = (data) => {
        const datasheet = {
            'start_bit': data.substr(0,4),
            'protocol_length': data.substr(4,2),
            'protocol_number': data.substr(6,2),
            'datetime': data.substr(8,12),
            'quantity': data.substr(20,2),
            'lat': data.substr(22,8),
            'lon': data.substr(30,8),
            'speed': data.substr(38,2),
            'course': data.substr(40,4),
            'mcc': data.substr(46,4),
            'mnc': data.substr(50,2),
            'lac': data.substr(52,4),
            'cell_id': data.substr(56,6),
            'terminal_information': data.substr(62,2),
            'voltage_level': data.substr(64,2),
            'gps_signal': data.substr(66,2),
            'alarm_lang': data.substr(68,4),
            'error_check': data.substr(72,4),
            'stop_bit': data.substr(76,4),
        };

        const courseBin = hex2bin(datasheet.course);
        return {
            'datetime': parseDatetime(datasheet.datetime),
            'satellites': parseInt(datasheet.quantity.substr(0,1), 16),
            'latitude': parseCoordinate(datasheet.lat, courseBin.substr(5,1) === '1' ? 'N' : 'S'),
            'longitude': parseCoordinate(datasheet.lon, courseBin.substr(4,1) === '1' ? 'E' : 'W'),
            'speed': parseInt(datasheet.speed, 16),
            'direction': parseInt(courseBin.substr(6,10), 2),
            'mcc': datasheet.mnc,
            'cell_id': datasheet.cell_id,
            'serial_number': datasheet.serial_number,
            'error_check': datasheet.error_check,
            'stop_bit': datasheet.stop_bit,
        };
    };

    // Décodage du statut
    const parseStatusPackage = (courseBin) => {
        return {
            'real_time_gps': courseBin.substr(2,1),
            'gps_positioned': courseBin.substr(3,1),
            'east_longitude': courseBin.substr(4,1),
            'north_latitude': courseBin.substr(5,1),
            'course': parseInt(courseBin.substr(6,10),2)
        };
    };

    const parseStatus = (data) => {
        const statusBin = hex2bin(data.substr(8,6));
        return parseStatusPackage(statusBin);
    };

    // Sélection de l'événement à partir des données
    const selectEvent = (data) => {
        return data.substr(6,2);
    };

    // Fonction principale de parsing
    const parse = (data) => {
        let response;
        const event = selectEvent(data);
        switch (event) {
            case '01':
                response = parseLogin(data);
                break;
            case '12':
                response = parseLocation(data);
                break;
            case '13':
                response = parseStatus(data);
                break;
            case '15':
                // À implémenter si nécessaire
                break;
            case '16':
                response = parseAlarm(data);
                break;
            case '1A':
                // À implémenter si nécessaire
                break;
            case '80':
                // À implémenter si nécessaire
                break;
            default:
                response = undefined;
                break;
        }
        return {
            'data_packet': data,
            'event': event,
            'parsed': response
        };
    };

    return { parse: parse };
})();
