var color = require("randomcolor");
// Use require("galileo-io") when running from an npm installation
var Galileo = require("../lib/galileo");
var board = new Galileo();

board.on("ready", function() {
  console.log("READY");

  // http://thingm.com/fileadmin/thingm/downloads/BlinkM_datasheet.pdf

  // Stop running blinkM script
  this.i2cWrite(0x09, 0x6f);

  setInterval(function() {
    // Fade to random BlinkM RGB

    var bytes = [0x43].concat(color({ format: "rgbArray" }));
    this.i2cWrite(0x09, bytes);

    // Can also be written as:
    // this.i2cWrite(0x09, 0x43, color({ format: "rgbArray" }));

    // Read the RGB
    this.i2cRead(0x09, 0x67, 3, function(rgb) {
      console.log("rgb", rgb);
    });
  }.bind(this), 2000);
});

