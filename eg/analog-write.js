var argv = require("optimist").default({ anode: false }).argv;
var Galileo = require("../lib/galileo");
var board = new Galileo();
var pins = {
  red: 11,
  green: 10,
  blue: 9
};
var names = Object.keys(pins);

board.on("ready", function() {
  console.log( "CONNECTED" );

  this.pinMode(pins.red, this.MODES.OUTPUT);
  this.pinMode(pins.green, this.MODES.OUTPUT);
  this.pinMode(pins.blue, this.MODES.OUTPUT);

  var colors = [
    [0xff, 0x00, 0x00], // red hex code:   ff0000
    [0x00, 0xff, 0x00], // green hex code: 00ff00
    [0x00, 0x00, 0xff], // blue hex code:  0000ff
  ];

  var color = 0;

  setInterval(function() {
    setColor(colors[color], names[color]);
    color++;
    if (color === colors.length) {
      color = 0;
    }
  }, 500);
});

function setColor(rgb, name) {
  var r = argv.anode ? 255 - rgb[0] : rgb[0];
  var g = argv.anode ? 255 - rgb[1] : rgb[1];
  var b = argv.anode ? 255 - rgb[2] : rgb[2];

  board.analogWrite(pins.red, r);
  board.analogWrite(pins.green, g);
  board.analogWrite(pins.blue, b);

  console.log("Set to: %s ", name, argv.anode ? [r, g, b] : rgb);
}
