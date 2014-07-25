// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  this.analogRead("A0", function(data) {
    console.log("A0", data);
  });
});
