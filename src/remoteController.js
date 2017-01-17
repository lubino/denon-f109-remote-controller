var SerialPort = require("serialport");
var Request = require("./request");
var commands = require("./commands");

function toString(arr) {
    if (typeof arr == "string") {
        return arr;
    }
    var s = "";
    for (var i = 0; i < arr.length; i++) {
        if (s) s+=" ";
        var num = arr[i];
        s+=((num < 16 ? "0" : "") + num.toString(16));
    }
    return s;
}

function push(dataBuffer, data) {
    for (var i = 0; i < data.length; i++) {
        dataBuffer.push(data[i]);
    }
}

function RemoteController(options) {
    var remoteController = this;
    var port = new SerialPort(options.device, {
        baudrate: 115200
        //, parser: SerialPort.parsers.byteLength(10)

    }, function (err) {
        if (err) {
            return console.log('Error opening port: ', err.message);
        }
        sendCommand("48 00 00", function (log) {
            console.log("Port for RemoteController is opened\n"+log);
        });
        port.on('data', onData);
        deviceIsReadyForCommunication();
    });

    var requestInProcess = {};

    function readLog(text) {
        if (requestInProcess) {
            requestInProcess.readLog(text);
        } else {
            console.log(text);
        }
    }

    function onData(data) {
        if (data.length == 1 && data[0] == 0) {
            readLog('received BRK');
            dataBuffer = [];
            return;
        }
        if (data.length == 2 && data[0] == 0xff && data[1] == 0x55) {
            readLog('received head');
            push(dataBuffer, data);
            return;
        }
        readLog('received data (' + data.length + ' bytes) ' + toString(data));
        push(dataBuffer, data);
        if (dataBuffer[0] == 0xff && dataBuffer[1] == 0x55 && dataBuffer[4] == 0) {
            var length = dataBuffer[2] + 2;
            var nextBufferData;
            if (dataBuffer.length > 6 + length) {
                nextBufferData = dataBuffer.splice(6 + length, dataBuffer.length - (6 + length))
            }
            var fromDra = dataBuffer[3] == 0;
            if (dataBuffer.length == 6 + length) {
                var sum = commands.checksum(dataBuffer, 0, 5 + length);
                if (dataBuffer[5 + length] != sum) {
                    readLog('data should has checksum ' + sum + ', but it has ' + dataBuffer[5 + length]);
                }
                var cmd = [], i;
                for (i = 0; i < length; i++) {
                    cmd.push(dataBuffer[5 + i]);
                }
                if (cmd.length > 4 && cmd[0] == 0x80 && cmd[1] == 0 && cmd[cmd.length - 1] == 0x0d) {
                    var textCmd = "";
                    for (i = 0; i < cmd.length - 3; i++) {
                        textCmd += String.fromCharCode(cmd[i + 2]);
                    }
                    cmd = textCmd;
                }
                var cmdStr = typeof cmd == "string" ? cmd : toString(cmd);
                if (typeof cmd != "string") {
                    if (requestInProcess) {
                        requestInProcess.addReaction(fromDra, cmdStr);
                    }
                    var command = commands.getCommandByCode(cmdStr);
                    if (command && command.listener && (fromDra || !command.reaction)) {
                        command.listener(remoteController);
                    }
                } else {
                    if (requestInProcess) {
                        requestInProcess.addTextReaction(fromDra, cmdStr);
                    }
                    commands.onTextCommand(remoteController, cmdStr);
                }
                if (fromDra) {
                    readLog('command to device is ' + cmdStr);
                } else {
                    readLog('COMMAND FROM DEVICE === ' + cmdStr);
                }
            } else if (dataBuffer.length > 6 + length) {
                readLog('data should be ' + (6 + length) + ' bytes long, but it has ' + dataBuffer.length + ' bytes');
            }
            if (nextBufferData) {
                if (nextBufferData[0] == 0) {
                    readLog('received BRK');
                    nextBufferData.splice(0, 1);
                }
                dataBuffer = nextBufferData;
            }
        }
    }

    var dataBuffer;

    var poolOfRequests = [];

    function deviceIsReadyForCommunication() {
        requestInProcess = null;
        doPooledCommunication();
    }

    function doPooledCommunication() {
        if (!requestInProcess && poolOfRequests.length) {
            requestInProcess = poolOfRequests.splice(0, 1)[0];
            requestInProcess.execute(deviceIsReadyForCommunication);
        }
    }

    function sendCommand(code, cb) {
        poolOfRequests.push(new Request(toString(commands.hexToByteArray(code)), port, cb));
        doPooledCommunication();
    }

    this.sendCommand = sendCommand;
}

var allControllers = {};

function processDefaults(options) {
    var defaults = {
        device: "/dev/ttyUSB0"
    };
    if (options) {
        for (var k in options) {
            var key = "" + k;
            defaults[key] = options[key];
        }
    }
    return defaults;
}

function createController(options) {
    options = processDefaults(options);
    var controller = allControllers[options.device];
    if (!controller) {
        controller = new RemoteController(options);
        allControllers[options.device] = controller;
    }
    return controller;
}

function stopAllControllers() {
    for (var k in allControllers) {
        var key = "" + k;
        allControllers[key].stop();
    }
}

module.exports = {
    createController: createController,
    stopAllControllers: stopAllControllers
};