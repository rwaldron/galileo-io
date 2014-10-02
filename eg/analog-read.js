// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log("READY");
  var last = 0;

  this.pinMode(3, this.MODES.PWM);
  this.pinMode("A0", this.MODES.ANALOG);

  this.analogRead("A0", function(data) {
    var value = scale(data, 0, 1023, 0, 255) | 0;
    if (last !== value) {
      this.analogWrite(3, value);
    }
    last = value;
  });
});


function scale(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) * (outMax - outMin) /
    (inMax - inMin) + outMin;
}
