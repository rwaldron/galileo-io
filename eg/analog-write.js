var argv = require("optimist").default({ anode: false }).argv;
// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log("READY");

  this.pinMode(3, this.MODES.PWM);

  var level = 0;
  var direction = 1;

  setInterval(function() {

    if (level > 255) {
      direction = -1;
      level = 255;
    }

    if (level < 0) {
      direction = 1;
      level = 0;
    }

    level += direction;
  }, 100);
});
