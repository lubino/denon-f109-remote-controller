
function hexToByteArray(s) {
    var hexArray = s.split(" ");
    var result = [];
    for (var i = 0; i < hexArray.length; i++) {
        var hex = hexArray[i];
        if (hex && hex.length < 3) {
            result.push(parseInt(hex, 16));
        } else {
            throw "Can't convert " + s + " to array of bytes because of '" + hex + "' is not byte";
        }
    }
    return result;
}

function checksum(arr, offset, length) {
    if (!offset) offset = 0;
    if (!length) length = arr.length;
    else length += offset;
    var sum = 0;
    for (var i = offset || 0; i < length; i++) {
        sum += arr[i];
    }
    return sum & 0xff;
}

function poweredOn(remoteController) {
    console.log("power on");
    remoteController._isOn = true
}
function poweredOff(remoteController) {
    console.log("power off");
    remoteController._isOn = false
}
function muteOn(remoteController) {
    console.log("mute on");
    remoteController._muteOn = true
}
function muteOff(remoteController) {
    console.log("mute off");
    remoteController._muteOn = false
}
function sdbOn(remoteController) {
    console.log("SDB on");
    remoteController._sdbOn = true
}
function sdbOff(remoteController) {
    console.log("SDB off");
    remoteController._sdbOn = false
}
function volumeChanged(remoteController, value) {
    console.log("changing volume "+value);
    remoteController._volume = value;
}
function dimmer(remoteController, value) {
    console.log("changing dimmer "+value);
    remoteController._dimmer = value;
}

function onTextCommand(remoteController, text) {
    if (text.substring(0,2)=="MV") {
        volumeChanged(remoteController, parseInt(text.substring(2)));
    } else if (text == "MUON") {
        muteOn(remoteController);
    } else if (text == "MUOFF") {
        muteOff(remoteController);
    } else if (text == "PSSDB ON") {
        sdbOn(remoteController);
    } else if (text == "PSSDB OFF") {
        sdbOff(remoteController);
    } else if (text == "PWON") {
        poweredOn(remoteController);
    } else if (text == "PWSTANDBY") {
        poweredOff(remoteController);
    }
}

var commands = {
    powerOn: {
        code: "01 02 00",
        delay: 4000,
        reaction: "01 03 00",
        followed: [
            "43 00 00" //dimmer to 0 .. 03
            , "33 13 00" //source was changed to network/usb
            , "01 03 00" //device is powered on
            , "PWON" //PWON
            , "SINETWORK" //SINETWORK
        ]
    }
    , poweredOn: {
        code: "01 03 00"
        //, listener: poweredOn
    }
    , powerOff: {
        code: "02 01 00",
        reaction: "02 01 00"
        , follower: ["02 01 00","PWSTANDBY"]
        //, listener: poweredOff
    }
    , volume: {
        code: "40 00 00-3c"
        ,reaction: "MV00-60"
    }
    , dimmer: {
        code: "43 00 00-03",
        listener: dimmer
    }
    , muteOff: {code: "41 00 00", reaction: "MUON"}
    , muteOn: {code: "41 00 01", reaction: "MUOFF"}
    , sourceFM: {code: "20 00 00", reaction: "33 08 00"
        ,followed:["43 00 00", "33 08 00", "SITUNER", "TMANFM", "TPANOFF", "TMANFM"]}
    , sourceDAB: {code: "22 00 00", reaction: "33 08 00"
        ,followed:["43 00 00", "33 08 00", "SITUNER", "TPANOFF", "TMDA"]}
    , sourceCD: {code: "23 00 00", reaction: "SICD"
        , followed:["43 00 00", "33 14 00", "01 04 00", "SICD"]}
    , sourceAnalog1: {code: "25 00 00", reaction: "33 15 00"
        , followed:["43 00 00", "33 15 00", "01 05 00", "SIAUX1"]}
    , sourceAnalog2: {code: "26 00 00", reaction: "33 16 00"
        , followed:["43 00 00", "33 16 00", "01 06 00", "SIAUX2"]}
    , sourceDigital: {code: "27 00 00", reaction: "33 17 00"
        , followed:["43 00 00", "33 17 00", "01 07 00", "SIDIGITAL_IN"]}
    , tunerForward: {code: "68 30 00", reaction: "33 08 00"
        ,followed:["33 08 00", "SITUNER", "TPANOFF", "TMDA", "TFDA11A"]}
    , tunerBackward: {code: "68 30 01", reaction: "33 08 00"
        ,followed:["33 08 00", "SITUNER", "TPANOFF", "TMDA", "TFDA11A"]}
    , channelForward: {code: "67 30 00", reaction: "TFDA12C"}
    , channelBackward: {code: "67 30 01", reaction: "TFDA12C"}
    , sdbOn: {code: "42 00 00 00", reaction: "PSSDB ON"}
    , sdbOff: {code: "42 00 00 01", reaction: "PSSDB OFF"}
    , sdirectOn: {code: "42 00 04 00", reaction: "PSSDI ON"}
    , sdirectOff: {code: "42 00 04 01", reaction: "PSSDI OFF"}
    , bassIncrease: {code: "42 00 01 00", reaction: "PSBAS 00-20"}
    , bassDecrease: {code: "42 00 01 01", reaction: "PSBAS 00-20"}
    , trebleIncrease: {code: "42 00 02 00", reaction: "PSTRE 00-20"}
    , trebleDecrease: {code: "42 00 02 01", reaction: "PSTRE 00-20"}
    , balanceIncrease: {code: "42 00 03 00", reaction: "PSBAL 00-12"}
    , balanceDecrease: {code: "42 00 03 01", reaction: "PSBAL 00-12"}

};

function generateCodes(fromTo) {
    var result = [], from = fromTo[0] || 0, to = fromTo[1] ||0;
    for (var i = from; i <= to; i++) {
        result.push((i<16 ? "0" :"")+i.toString(16));
    }
    return result;
}

var allCodes = {};
var commandsByCode = (function () {
    var result = {};
    for (var k in commands) {
        var key = "" + k;
        var command = commands[key];
        command.bytesLength = command.code.split(' ').length;
        if (command.code.indexOf("-") == -1) {
            result[command.code] = command;
            allCodes[key] = {code:[command.code]};
        } else {
            var codes = command.code.split(' '),
                i,
                count = 1,
                indexes = [];
            for (i = 0; i < codes.length; i++) {
                codes[i] = codes[i].split('-');
                if (codes[i].length==2) {
                    codes[i] = generateCodes(hexToByteArray(codes[i].join(' ')));
                }
                count = count * (codes[i].length);
                indexes.push(0);
            }
            var multipleCode = [];
            for (var value = 0; value < count; value++) {
                var code = "", incremented = false;
                for (i = 0; i < codes.length; i++) {
                    if (code) code = code + " ";
                    code = code + codes[i][indexes[i]];
                    if (!incremented && indexes[i] + 1 < codes[i].length) {
                        indexes[i] = indexes[i] + 1;
                        incremented = true;
                    }
                }
                result[code] = {
                    value: value,
                    code: code,
                    delay: command.delay,
                    reaction: command.reaction,
                    followed: command.followed,
                    bytesLength: command.bytesLength,
                    listener: command.listener ? (function (listener, value) {
                        return function (remoteController) {
                            listener(remoteController, value)
                        }
                    })(command.listener, value) : undefined
                };
                multipleCode.push(code);
            }
            allCodes[key] = {code:multipleCode};
        }
    }
    return result;
})();

function getCommandByCode(code) {
    var command = commandsByCode[code];
    if (command) return command;
    return {code: code, bytesLength:code.split(' ').length}
}

function getAllCodes() {
    return allCodes;
}

module.exports = {
    getCommandByCode: getCommandByCode,
    getAllCodes: getAllCodes,
    onTextCommand: onTextCommand,
    hexToByteArray: hexToByteArray,
    checksum: checksum
};