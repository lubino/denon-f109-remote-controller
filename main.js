var RemoteController = require("./src/remoteController");
var Commands = require("./src/commands");
var Request = require("./src/request");

module.exports = {
    createController: RemoteController.createController,
    stopAllControllers: RemoteController.stopAllControllers,
    getCommands: Commands.getAllCodes,
    RemoteController: RemoteController, Commands: Commands, Request: Request
};