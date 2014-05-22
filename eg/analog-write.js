var argv = require("optimist").default({ anode: false }).argv;
var Galileo = require("../lib/galileo");
var board = new Galileo();
var pins = {
  red: 11,
  green: 10,
  blue: 9
};
var names = Object.keys(pins);

// if --anode=false is passed, it will appear
// to be "truthy"
argv.anode = argv.anode === "true";

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
  rgb = rgb.map(function(eightbit) {
    return argv.anode ? eightbit ^ 0xff : eightbit;
  });

  board.analogWrite(pins.red, rgb[0]);
  board.analogWrite(pins.green, rgb[1]);
  board.analogWrite(pins.blue, rgb[2]);

  console.log("Set to: %s ", name, rgb);
}
