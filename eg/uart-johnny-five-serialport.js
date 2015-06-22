var Serialport = require("serialport").SerialPort;
var five = require("johnny-five");
var Edison = require("galileo-io");
var board = new five.Board({
  io: new Edison()
});

board.on("ready", function() {
  var sp = new Serialport("/dev/ttyMFD1", {
    baudRate: 115200
  });

  sp.on("open", function() {
    console.log("Port is open!");

    // Once the port is open, you may read or write to it.
    sp.on("data", function(data) {
      console.log("Received: ", data);
    });

    sp.write(new Buffer([0]));
  });
});
