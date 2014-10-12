var Galileo = require("galileo-io");
var board = new Galileo();

var address = 0x09;
var FADE_TO_HSB = 0x68;
var FADE_TO_RGB = 0x63;
var FADE_TO_RANDOM_HSB = 0x48;
var FADE_TO_RANDOM_RGB = 0x43;
var SCRIPT_PLAY = 0x70;
var SCRIPT_STOP = 0x6f;
var SET_FADE = 0x66;
var SET_TIME = 0x74;
var SET_RGB = 0x6e;
var GET_RGB = 0x67;

var rainbow = {
  red:    [0xff, 0x00, 0x00],
  orange: [0xff, 0x7f, 0x00],
  yellow: [0xff, 0xff, 0x00],
  green:  [0x00, 0xff, 0x00],
  blue:   [0x00, 0x00, 0xff],
  indigo: [0x31, 0x00, 0x62],
  violet: [0x4b, 0x00, 0x82],
  white:  [0xff, 0xff, 0xff],
};

var colors = Object.keys(rainbow);
var index = 0;

board.on("ready", function() {
  console.log("READY");

  // http://thingm.com/fileadmin/thingm/downloads/BlinkM_datasheet.pdf
  this.i2cWrite(address, SCRIPT_STOP);

  this.i2cWrite(address, SET_RGB, [0, 0, 0]);

  setInterval(function() {
    var color = colors[index++];

    // While testing, I found that the BlinkM produced
    // more vibrant colors when provided a 7 bit value.
    var bytes = rainbow[color].map(function(value) {
      return scale(value, 0, 255, 0, 127) | 0;
    });

    // Fade to color in the rainbow
    this.i2cWrite(address, FADE_TO_RGB, bytes);

    if (index === colors.length) {
      index = 0;
    }
  }.bind(this), 3000);
});

function scale(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) * (outMax - outMin) /
    (inMax - inMin) + outMin;
}
