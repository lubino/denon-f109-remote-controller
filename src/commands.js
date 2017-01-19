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

function powered(remoteController, value) {
    console.log("power " + value);
    remoteController._isOn = value
}
function mute(remoteController, value) {
    console.log("mute " + value);
    remoteController._muteOn = value
}
function sdb(remoteController, value) {
    console.log("SDB " + value);
    remoteController._sdbOn = value
}
function sDirect(remoteController, value) {
    console.log("sDirect " + value);
    remoteController._sDirect = value
}
function volumeChanged(remoteController, value) {
    console.log("changing volume " + value);
    remoteController._volume = value;
}
function inputChanged(remoteController, value) {
    console.log("changing input " + value);
    remoteController._input = value;
}
function alarmChanged(remoteController, once, every) {
    console.log("changing alarm once " + once + ", every " + every);
    remoteController._alarmOnce = once;
    remoteController._alarmEvery = every;
}
function fmPreset(remoteController, value) {
    console.log("changing FM preset " + value);
    remoteController._fmPreset = value;
}
function sleepChanged(remoteController, value) {
    console.log("changing sleep " + value);
    remoteController._sleep = value;
}
function bass(remoteController, value) {
    console.log("changing bass " + value);
    remoteController._bass = value;
}
function treble(remoteController, value) {
    console.log("changing treble " + value);
    remoteController._treble = value;
}
function balance(remoteController, value) {
    console.log("changing balance " + value);
    remoteController._balance = value;
}
function fmFrequency(remoteController, value) {
    console.log("changing FM frequency " + value);
    remoteController._fm = value;
}
function fmMode(remoteController, value) {
    console.log("changing FM mode " + value);
    remoteController._fmMode = value;
}
function fmChannel(remoteController, value) {
    console.log("changing FM Channel " + value);
    remoteController._dab = value;
}
function dimmer(remoteController, value) {
    console.log("changing dimmer " + value);
    remoteController._dimmer = value;
}

function onTextCommand(remoteController, text) {
    var f2 = text.substring(0, 2);
    if (f2 == "MV") {
        volumeChanged(remoteController, parseInt(text.substring(2)));
    } else if (f2 == "SI") {
        inputChanged(remoteController, text.substring(2));
    } else if (f2 == "TP") {
        fmPreset(remoteController, text != "TPANOFF" ? parseInt(text.substring(4)) : null);
    } else if (f2 == "MU") {
        mute(remoteController, text.substring(2) != "OFF");
    } else if (f2 == "TC") {
        if (text == "TCON") {
            //time is set
        }
    } else if (f2 == "TO") {
        var alarm = text.substring(2).split(" ");
        alarmChanged(remoteController, alarm[0] != "OFF", alarm[1] != "OFF");
        if (text == "TCON") {
            //time is set
        }
    } else if (f2 == "TS") {
        /*
         TS(ONCE|EVERY) 2(\d\d)(\d\d)-2(\d\d)(\d\d) (..)(\d\d): Alarm of type $1 set to turn on the device at $2:$3 and turn it off at $4:$5 at function $6 with preset $7, where function is:

         NW: Internet Radio,
         NU: iPad/USB (Network),
         CD: CD,
         CU: iPad/USB (CD),
         TU: Tuner,
         A1: Analog In 1,
         A2: Analog In 2,
         DI: Digital.
       */
    } else if (f2 == "TF") {
        var f22 = text.substring(2, 4);
        if (f22 == "AN") {
            fmFrequency(remoteController, parseInt(text.substring(4)) / 100 + "Mhz");
        } else if (f22 == "DA") {
            fmChannel(remoteController, text.substring(4));
        }
    } else {
        var f3 = text.substring(0, 3);
        if (f3 == "SLP") {
            sleepChanged(remoteController, text != "SLPOFF" ? parseInt(text.substring(3)) : null);
        } else {
            var f5 = text.substring(0, 5);
            if (f5 == "PSBAS") {
                bass(remoteController, (parseInt(text.substring(6)) - 10) + "dB");
            } else if (f5 == "PSTRE") {
                treble(remoteController, (parseInt(text.substring(6)) - 10) + "dB");
            } else if (f5 == "PSBAL") {
                balance(remoteController, (parseInt(text.substring(6)) - 6));
            } else if (f5 == "PSSDB") {
                sdb(remoteController, text.substring(6) != "OFF");
            } else if (f5 == "PSSDI") {
                sDirect(remoteController, text.substring(6) != "OFF");
            } else if (text.substring(0, 4) == "TFAN") {
                fmFrequency(remoteController, parseInt(text.substring(4)) / 100 + "Mhz");
            } else if (text == "TMANMANUAL") {
                fmMode(remoteController, "mono");
            } else if (text == "TMANAUTO") {
                fmMode(remoteController, "auto");
            } else if (text == "PWON") {
                powered(remoteController, true);
            } else if (text == "PWSTANDBY") {
                powered(remoteController, false);
            }
        }
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
    /*
    , poweredOn: {
        code: "01 03 00"
        //, listener: poweredOn
    }
    */
    , powerOff: {
        code: "02 01 00",
        reaction: "02 01 00"
        , follower: ["02 01 00", "PWSTANDBY"]
        //, listener: powered
    }
    , volume: {
        code: "40 00 00-3c"
        , reaction: "MV00-60"
    }
    , dimmer: {
        code: "43 00 00-03",
        listener: dimmer
    }
    , muteOff: {code: "41 00 00", reaction: "MUON"}
    , muteOn: {code: "41 00 01", reaction: "MUOFF"}
    , sourceFM: {
        code: "20 00 00", reaction: "33 08 00"
        , followed: ["43 00 00", "33 08 00", "SITUNER", "TMANFM", "TPANOFF", "TMANFM"]
    }
    , sourceDAB: {
        code: "22 00 00", reaction: "33 08 00"
        , followed: ["43 00 00", "33 08 00", "SITUNER", "TPANOFF", "TMDA"]
    }
    , sourceCD: {
        code: "23 00 00", reaction: "SICD"
        , followed: ["43 00 00", "33 14 00", "01 04 00", "SICD"]
    }
    , sourceAnalog1: {
        code: "25 00 00", reaction: "33 15 00"
        , followed: ["43 00 00", "33 15 00", "01 05 00", "SIAUX1"]
    }
    , sourceAnalog2: {
        code: "26 00 00", reaction: "33 16 00"
        , followed: ["43 00 00", "33 16 00", "01 06 00", "SIAUX2"]
    }
    , sourceDigital: {
        code: "27 00 00", reaction: "33 17 00"
        , followed: ["43 00 00", "33 17 00", "01 07 00", "SIDIGITAL_IN"]
    }
    , tunerForward: {
        code: "68 30 00", reaction: "33 08 00"
        , followed: ["33 08 00", "SITUNER", "TPANOFF", "TMDA", "TFDA11A"]
    }
    , tunerBackward: {
        code: "68 30 01", reaction: "33 08 00"
        , followed: ["33 08 00", "SITUNER", "TPANOFF", "TMDA", "TFDA11A"]
    }
    , channelForward: {code: "67 30 00", reaction: "TFDA*"}
    , channelBackward: {code: "67 30 01", reaction: "TFDA*"}
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
    var result = [], from = fromTo[0] || 0, to = fromTo[1] || 0;
    for (var i = from; i <= to; i++) {
        result.push((i < 16 ? "0" : "") + i.toString(16));
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
            allCodes[key] = {code: [command.code]};
        } else {
            var codes = command.code.split(' '),
                i,
                count = 1,
                indexes = [];
            for (i = 0; i < codes.length; i++) {
                codes[i] = codes[i].split('-');
                if (codes[i].length == 2) {
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
            allCodes[key] = {code: multipleCode};
        }
    }
    return result;
})();

function getCommandByCode(code) {
    var command = commandsByCode[code];
    if (command) return command;
    return {code: code, bytesLength: code.split(' ').length}
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