var commands = require("./commands");

var defaultDelay = 130;
var defaultTries = 3;

function getTime() {
    var hrTime = process.hrtime();
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
}

function cutFromString(str, index, length) {
    return (index>0 ? str.substring(0, index) : "") //prefix
        + (index+length<str.length ? str.substring(index+length) : "") //sufix
        ;
}

function Request(code, port, onEndRequest) {
    var start, lastSend, lastRead, command, tries = 0, log="", successful = false, request = this;

    this.execute = function (onFinishTry) {
        start = lastSend = lastRead = getTime();
        command = commands.getCommandByCode(code);
        tries = 1;
        if (command) {
            if (!command.reaction) {
                successful = true;
            }
            processRequest(function () {
                onFinishTry(log);
                onEndRequest(log);
            });
        } else {
            log+="unsupported command";
            onFinishTry(log);
            onEndRequest(log);
        }
    };

    function sendLog(text) {
        var now = getTime();
        var message = (Math.round(100 * (now - start)) / 100) + "ms (" + (Math.round(100 * (now - lastSend)) / 100) + "ms) " + text;
        lastSend = now;
        log += message + "\n";
    }

    function readLog(text) {
        var now = getTime();
        var message = (Math.round(100 * (now - start)) / 100) + "ms {" + (Math.round(100 * (now - lastRead)) / 100) + "ms} " + text;
        lastRead = now;
        log += message + "\n";
    }

    this.sendLog = sendLog;
    this.readLog = readLog;

    function addReaction(fromDra, reaction) {
        if (fromDra) {
            var expectedReaction = command.reaction;
            if (expectedReaction == reaction) {
                successful = true;
            } else {
                var index = expectedReaction.indexOf("-");
                if (index>0 && cutFromString(reaction, index-2, 2)==cutFromString(expectedReaction, index-2,5)) {
                    var interval = expectedReaction.substring(index-2, index+3).split('-');
                    var value = parseInt(reaction.substring(index-3, index));
                    if (value>=parseInt(interval[0]) && value <= parseInt(interval[1])) {
                        successful = true;
                    }
                }
            }
        }
    }

    this.addReaction = addReaction;
    this.addTextReaction = addReaction;

    function processRequest(cb) {
        var dataToSend = "FF 55 " + (command.bytesLength < 18 ? "0" : "") + (command.bytesLength - 2).toString(16) + " 01 00 " + command.code;
        var data = commands.hexToByteArray(dataToSend);
        var sum = commands.checksum(data);
        data.push(sum);
        dataToSend+=(sum<16?" 0":" ")+sum.toString(16);
        sendLog('Preparing to send command ' + command.code + " ( data " + dataToSend+" )");
        sendBRK(function () {
            sendLog('BRK sent, going to send data');
            sendData(data, cb);
        });
    }

    function sendBRK(cb) {
        sendLog('going to send BRK, data should be send after 16.25ms');
        var delay = 10;
        port.set({brk: true}, function () {
            //sendLog('set to true, going to delay');
            setTimeout(function () {
                //sendLog('timeout, going to set to false');
                port.set({brk: false}, function () {
                    cb();
                });
            }, delay);
        });
    }

    function sendData(data, cb) {
        port.write(data, function (err) {
            if (err) {
                sendLog('error sending data ' + err.message);
                cb();
            } else {
                sendLog('sent ' + data.length + ' bytes');
                port.drain(function () {
                    sendLog('data drained');
                    setTimeout(function () {
                        finishRequest(cb);
                    }, defaultDelay);
                });
            }
        });
    }

    function finishRequest(cb) {
        if (successful) {
            sendLog("Request " + command.code + " finished, it has been executed " + tries + " time(s)");
            if (command.delay) {
                setTimeout(cb, command.delay);
            } else {
                cb();
            }
        } else if (tries < defaultTries) {
            tries++;
            processRequest(cb);
        } else {
            request.error = "Communication timeout";
            sendLog("Request timeoted, tried " + tries + " times");
            cb();
        }
    }
}

module.exports = Request;
