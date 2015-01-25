// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log("READY");
  var byte = 0;



  setInterval(function() {
    board.digitalWrite(13, (byte ^= 1));
  }, 500);
});
