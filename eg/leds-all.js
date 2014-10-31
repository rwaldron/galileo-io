var Galileo = require("galileo-io");
var board = new Galileo();

board.on("ready", function() {
  console.log("Leds on pins 2-13 should be blinking.");

  for (var i = 2; i < 14; i++) {
    this.pinMode(i, this.MODES.OUTPUT);
  }

  var state = 0;

  setInterval(function() {
    state ^= 1;
    for (var i = 2; i < 14; i++) {
      this.digitalWrite(i, state);
    }
  }.bind(this), 500);
});
