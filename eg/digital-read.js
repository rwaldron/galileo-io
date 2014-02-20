var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  this.pinMode(9, this.MODES.INPUT);

  this.digitalRead(9, function(data) {
    console.log( 9,  data );
  });
});
