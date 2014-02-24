var fs = require("fs");
var Emitter = require("events").EventEmitter;
var GPIO = require("../lib/gpio.js");
var tick = global.setImmediate || process.nextTick;

function scale(x, fromLow, fromHigh, toLow, toHigh) {
  return (x - fromLow) * (toHigh - toLow) /
    (fromHigh - fromLow) + toLow;
}

var modes = Object.freeze({
  INPUT: 0,
  OUTPUT: 1,
  ANALOG: 2,
  PWM: 3,
  SERVO: 4
});

var pins = [
  { modes: [] },
  { modes: [] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 4] },
  { modes: [0, 1, 2], analogChannel: 0 },
  { modes: [0, 1, 2], analogChannel: 1 },
  { modes: [0, 1, 2], analogChannel: 2 },
  { modes: [0, 1, 2], analogChannel: 3 },
  { modes: [0, 1, 2], analogChannel: 4 },
  { modes: [0, 1, 2], analogChannel: 5 }
];

var boards = [];
var reporting = [];



// var lastread = Date.now();

tick(function read() {
  tick(read);

  // var now = Date.now();

  // TODO: Review possible ms-level clamping
  // if (now > lastread + 1) {
    // lastread = now;
    // TODO:
    //  - Review need for multiple board objects?
    //
    if (boards.length) {
      reporting.forEach(function(report, gpio) {
        fs.readFile(report.path, "utf8", function(err, value) {
          if (!err) {
            value = +value;

            if (report.scale) {
              value = report.scale(value);
            }

            this.pins[report.index].value = value;
            this.emit(report.event, value);
          }
        }.bind(this));
      }, boards[0]);
    }
  // }
});


function ToPinIndex(pin) {
  var offset = pin[0] === "A" ? 14 : 0;
  return ((pin + "").replace("A", "") | 0) + offset;
}

function Galileo(opts) {
  Emitter.call(this);

  if (!(this instanceof Galileo)) {
    return new Galileo(opts);
  }

  this.name = "galileo-io";
  this.buffer = [];
  this.isReady = false;

  this.pins = pins.map(function(pin, index) {
    return new GPIO(pin);
  }, this);

  this.analogPins = this.pins.slice(14).map(function(pin, i) {
    return i;
  });

  boards[0] = this;

  // Necessary for compatibility with Johnny-Five Board constructor
  process.nextTick(function() {
    this.isReady = true;
    this.emit("connected");
    this.emit("ready");
  }.bind(this));
}

Galileo.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Galileo
  },
  MODES: {
    value: modes
  },
  HIGH: {
    value: 1
  },
  LOW: {
    value: 0
  }
});


Galileo.prototype.pinMode = function(pin, mode) {
  var pinIndex = ToPinIndex(pin);
  var gpio = GPIO.Pins[pin];

  this.pins[pinIndex].mode = mode;

  fs.writeFile(GPIO.Port("export"), "" + gpio);
  fs.writeFile(GPIO.Port("gpio" + gpio, "direction"), GPIO.Modes[mode]);

  return this;
};

Galileo.prototype.analogRead = function(pin, handler) {
  var pinIndex = ToPinIndex(pin);
  var gpio = GPIO.Pins[pin];
  var num = GPIO.Analog.Nums[pin];
  var event = "analog-read-" + pin;

  // Analog inputs are multiplexed w/
  //  - GPIO: A0, A1, A2, A3
  //  - I2C: A4, A5
  //
  this.analogWrite(pin, 0);

  // The sysfs port will have a 12-bit value of 0-4095
  reporting[+gpio] = {
    event: event,
    index: pinIndex,
    path: "/sys/bus/iio/devices/iio:device0/in_voltage" + num + "_raw",
    scale: function(raw) {
      return raw >>> 2;
    }
  };

  this.on(event, handler);

  return this;
};


Galileo.prototype.digitalRead = function(pin, handler) {
  var pinIndex = ToPinIndex(pin);
  var gpio = GPIO.Pins[pin];
  var path = GPIO.Port("gpio" + gpio, "value");
  var event = "digital-read-" + pin;

  if (this.pins[pinIndex].mode !== this.MODES.INPUT) {
    this.pinMode(pin, this.MODES.INPUT);
  }

  reporting[+gpio] = {
    event: event,
    index: pinIndex,
    path: path
  };

  this.on(event, handler);

  return this;
};


Galileo.prototype.analogWrite = function(pin, value) {
  var pinIndex = ToPinIndex(pin);
  var gpio = GPIO.Pins[pin];
  var port = GPIO.Port("gpio" + gpio, "value");

  if (this.pins[pinIndex].mode !== this.MODES.OUTPUT) {
    this.pinMode(pin, this.MODES.OUTPUT);
  }

  this.write(port, value);
  this.pins[pinIndex].value = value;

  // TODO:
  //  - setup and initialization of PWM capabilies:
  //  - https://github.com/rwaldron/galileo-io/wiki/Galileo-IO#wiki-analogwritepin-value

  return this;
};

Galileo.prototype.digitalWrite = function(pin, value) {
  var pinIndex = ToPinIndex(pin);
  var gpio = GPIO.Pins[pin];
  var port = GPIO.Port("gpio" + gpio, "value");

  if (this.pins[pinIndex].mode !== this.MODES.OUTPUT) {
    this.pinMode(pin, this.MODES.OUTPUT);
  }

  this.write(port, value);
  this.pins[pinIndex].value = value;

  return this;
};

// ["analogWrite", "digitalWrite"].forEach(function(fn) {
//   var isAnalog = fn === "analogWrite";

//   Galileo.prototype[fn] = function(pin, value) {
//     var pinIndex = ToPinIndex(pin);
//     var gpio = GPIO.Pins[pin];
//     var port = GPIO.Port("gpio" + gpio, "value");

//     if (this.pins[pinIndex].mode !== this.MODES.OUTPUT) {
//       this.pinMode(pin, this.MODES.OUTPUT);
//     }

//     this.write(port, value);
//     this.pins[pinIndex].value = value;

//     return this;
//   };
// });

Galileo.prototype.write = function(port, value) {
  fs.writeFile(port, "" + value);
};

// TODO:
//
// - complete implementation:
//    - pinMode 4
//    - create pwm dir
Galileo.prototype.servoWrite = Galileo.prototype.analogWrite;

module.exports = Galileo;

// http://wiki.ros.org/IntelGalileo/IntelGalileoGPIO
