// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  var byte = 0;

  setInterval(function() {
    board.digitalWrite(9, (byte ^= 1));
  }, 500);
});
