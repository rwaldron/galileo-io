var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log("READY");

  this.pinMode(3, this.MODES.PWM);

  var level = 0;
  var step = 5;

  setInterval(function() {
    if (level > 255 || level < 0) {
      step *= -1;
    }

    level += step;

    this.analogWrite(3, level);
  }.bind(this), 1000/(255/step));
});
