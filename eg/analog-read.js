// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log("READY");

  this.pinMode("A0", this.MODES.ANALOG);

  this.analogRead("A0", function(data) {
    console.log("A0", data);
  });
});
