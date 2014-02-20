var Galileo = rewire("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  var byte = 0;
  this.pinMode(9, this.MODES.OUTPUT);

  setInterval(function() {
    board.digitalWrite(9, (byte ^= 1));
  }, 500);
});
