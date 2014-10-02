// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log("READY!");

  var value = 0;
  this.digitalRead(4, function(data) {
    if (value !== data) {
      if (data) {
        console.log("Pressed");
        this.digitalWrite(3, 1);
      } else {
        console.log("Released");
        this.digitalWrite(3, 0);
      }
    }
    value = data;
  });
});
