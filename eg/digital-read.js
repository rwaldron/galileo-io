// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log("READY");
  this.digitalRead(9, function(data) {
    console.log(9, data);
  });
});
