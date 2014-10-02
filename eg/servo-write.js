// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log("READY");

  this.pinMode(3, this.MODES.SERVO);

  var positions = [0, 45, 90, 135, 180];
  var index = 0;

  setInterval(function() {
    var degrees = positions[index];

    this.servoWrite(3, degrees);
    console.log( "Moving to %d", degrees );

    index++;

    if (index === positions.length) {
      index = 0;
    }
  }.bind(this), 2000);
});
