// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log( "CONNECTED" );

  this.pinMode(3, this.MODES.SERVO);

  var positions = [0, 45, 90, 135, 180];
  var position = 0;

  setInterval(function() {
    var degrees = positions[position];

    this.servoWrite(3, degrees);
    console.log( "Moving to %d", degrees );

    position++;

    if (position === positions.length) {
      position = 0;
    }
  }.bind(this), 2000);
});
