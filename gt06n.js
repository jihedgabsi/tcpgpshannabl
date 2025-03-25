// gt06_parser.js
const eventTypes = {
    '01' : 'Login Message',
    '12' : 'Location Data',
    '13' : 'Status information ',
    '15' : 'String information',
    '16' : 'Alarm data',
    '1A' : 'GPS, query address information by phone number',
    '80' : 'Command information sent by the server to the terminal',
};

function parseLogin(data) {
    return {
        'eventType': eventTypes['01'],
        'imei': parseInt(data.substr(8,16),16),
        'serialNumber': data.substr(22,4),
        'errorCheck': data.substr(26,4),
    };
}

function parseDatetime(data) {
    const parse = {
        'year': data.substr(0,2),
        'month': data.substr(2,2),
        'day': data.substr(4,2),
        'hour': data.substr(6,2),
        'minute': data.substr(8,2),
        'second': data.substr(10,2),
    };

    const y = parseInt(parse.year, 16);
    const m = parseInt(parse.month, 16);
    const d = parseInt(parse.day, 16);
    const h = parseInt(parse.hour, 16);
    const i = parseInt(parse.minute, 16);
    const s = parseInt(parse.second, 16);
    return [y,m,d].join('-') + ' ' +  [h,i,s].join(':');
}

function hex2bin(hex) {
    let bin = (parseInt(hex, 16)).toString(2);
    const hexLen = hex.length/2*8;

    while(bin.length < hexLen){
        bin = '0' + bin;
    }
    return bin;
}

function parseLocation(data) {
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
        'mcc': data.substr(44,4),
        'mnc': data.substr(48,2),
        'lac': data.substr(50,4),
        'cell_id': data.substr(54,6),
        'serial_number': data.substr(60,4),
        'error_check': data.substr(64,4),
        'stop_bit': data.substr(68,4),
    };

    const courseBin = hex2bin(datasheet.course);

    return {
        'datetime': parseDatetime(datasheet.datetime),
        'satelites': parseInt(datasheet.quantity.substr(0,1),16),
        'satelitesActive': parseInt(datasheet.quantity.substr(1,1),16),
        'lat': datasheet.lat,
        'lon': datasheet.lon,
        'speed': parseInt(datasheet.speed,16),
        'real_time_gps': courseBin.substr(2,1),
        'gps_positioned': courseBin.substr(3,1),
        'east_longitude': courseBin.substr(4,1),
        'north_latitude': courseBin.substr(5,1),
        'course': parseInt(courseBin.substr(6,10),2),
        'mmc': datasheet.mnc,
        'cell_id': datasheet.cell_id,
        'serial_number': datasheet.serial_number,
        'error_check': datasheet.error_check,
        'stop_bit': datasheet.stop_bit,
    };
}

function parseAlarm(data) {
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
        'satelites': parseInt(datasheet.quantity.substr(0,1),16),
        'satelitesActive': parseInt(datasheet.quantity.substr(1,1),16),
        'lat': datasheet.lat,
        'lon': datasheet.lon,
        'speed': parseInt(datasheet.speed,16),
        'real_time_gps': courseBin.substr(2,1),
        'gps_positioned': courseBin.substr(3,1),
        'east_longitude': courseBin.substr(4,1),
        'north_latitude': courseBin.substr(5,1),
        'course': parseInt(courseBin.substr(6,10),2),
        'mmc': datasheet.mnc,
        'cell_id': datasheet.cell_id,
        'serial_number': datasheet.serial_number,
        'error_check': datasheet.error_check,
        'stop_bit': datasheet.stop_bit,
    };
}

function parseStatusPackage(courseBin) {
    return {
        'real_time_gps': courseBin.substr(2,1),
        'gps_positioned': courseBin.substr(3,1),
        'east_longitude': courseBin.substr(4,1),
        'north_latitude': courseBin.substr(5,1),
        'course': parseInt(courseBin.substr(6,10),2)
    };
}

function parseStatus(data) {
    const statusBin = hex2bin(data.substr(8,6));
    return parseStatusPackage(statusBin);
}

function selectEvent(data) {
    return data.substr(6,2);
}

function parse(data) {
    let response;
    const event = selectEvent(data);
    
    switch (event){
        case '01':
            response = parseLogin(data);
            break;
        case '12':
            response = parseLocation(data);
            break;
        case '13':
            response = parseStatus(data);
            break;
        case '16':
            response = parseAlarm(data);
            break;
        case '15':
        case '1A':
        case '80':
            // Placeholder for future implementation
            response = null;
            break;
    }
    
    return {
        'data_packet': data,
        'event': event,
        'parsed': response
    };
}

module.exports = { parse };
