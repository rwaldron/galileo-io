var Galileo = require("galileo-io");
var board = new Galileo();

var BlinkM = {
  0x09: "ADDRESS",
  0x63: "FADE_TO_RGB",
  0x43: "FADE_TO_RANDOM_RGB",
  0x70: "SCRIPT_PLAY",
  0x6f: "SCRIPT_STOP",
  0x6e: "SET_RGB",
  0x67: "GET_RGB",
};

Object.keys(BlinkM).forEach(function(key) {
  // Turn the value into a key and
  // the key into an int value
  BlinkM[BlinkM[key]] = key | 0;
});

var rgb = {
  red:    [0xff, 0x00, 0x00],
  orange: [0xff, 0x7f, 0x00],
  yellow: [0xff, 0xff, 0x00],
  green:  [0x00, 0xff, 0x00],
  blue:   [0x00, 0x00, 0xff],
  indigo: [0x31, 0x00, 0x62],
  violet: [0x4b, 0x00, 0x82],
  white:  [0xff, 0xff, 0xff],
};

var rainbow = Object.keys(rgb).reduce(function(colors, color) {
  // While testing, I found that the BlinkM produced
  // more vibrant colors when provided a 7 bit value.
  return (colors[color] = rgb[color].map(to7bit), colors);
}, {});

var colors = Object.keys(rainbow);
var index = 0;

board.on("ready", function() {
  console.log("READY");

  // http://thingm.com/fileadmin/thingm/downloads/BlinkM_datasheet.pdf
  this.i2cWrite(BlinkM.ADDRESS, BlinkM.SCRIPT_STOP);

  this.i2cWrite(BlinkM.ADDRESS, BlinkM.SET_RGB, [0, 0, 0]);

  setInterval(function() {
    var color = colors[index++];

    this.i2cWrite(BlinkM.ADDRESS, BlinkM.FADE_TO_RGB, rainbow[color]);

    this.i2cRead(BlinkM.ADDRESS, BlinkM.GET_RGB, 3, function(data) {
      console.log("RGB: [%s]", data);
    });

    if (index === colors.length) {
      index = 0;
    }
  }.bind(this), 1000);
});

function scale(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) * (outMax - outMin) /
    (inMax - inMin) + outMin;
}

function to7bit(value) {
  return scale(value, 0, 255, 0, 127) | 0;
}
