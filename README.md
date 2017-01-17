# Denon DRA-F109 remote connector

This is source code for NPM package *denon-f109-remote-controller* written in JavaScript version 6 (ECMAScript 2015).
The package uses serial communication protocol to control [Denon DRA-F109 amplifier](https://www.denon.co.uk/uk/product/compactsystem/mini/df109dab).
It is based on Kamil Figiela's [hacking](http://kfigiela.github.io/2014/06/15/denon-remote-connector/) and [serialport](https://github.com/EmergingTechnologyAdvisors/node-serialport) NPM package.
Thank you [Kamil Figiela](http://kfigiela.github.io) and [Francis Gulotta](https://github.com/reconbot) for this contribution. Those guys helped me a lot with solving many small issues.

## Getting Started

This is only low-level library. You can look at [yamaha-audio-polyfill](https://github.com/lubino/yamaha-audio-polyfill) for more robust solution.

Anyway, this is small example of usage:

```javascript
var denon = require("denon-f109-remote-controller");
var allCommands = denon.Commands.getAllCodes();

var controller = denon.RemoteController.createController();

controller.sendCommand(allCommands.powerOn.code[0], function (result) {
  console.log("Amplifier should be turned on", result);

  controller.sendCommand(allCommands.volume.code[10], function (result) {
    console.log("Amplifier's volume level should be changed", result);
  });

});
```

### Prerequisites

If you want to get this working, you need to have TTL RS-232 connected to 3.8mm jack connector.
![RS-232 to jack connector](http://kfigiela.github.io/img/2014-06-15-denon-remote-connector_circuit.png)

The RX signal is not connected on this scheme but I am sure, you can see where it goes, there is only one not connected part.

### Available commands

* powerOn
* powerOff
* volume: 0-60
* dimmer: 0-3
* muteOff
* muteOn
* sourceFM
* sourceDAB
* sourceCD
* sourceAnalog1
* sourceAnalog2
* sourceDigital
* tunerForward
* tunerBackward
* channelForward
* channelBackward
* sdbOn
* sdbOff
* sdirectOn
* sdirectOff
* bassIncrease
* bassDecrease
* trebleIncrease
* trebleDecrease
* balanceIncrease
* balanceDecrease

## License

This project is licensed under the MIT License and Apache-2.0 license