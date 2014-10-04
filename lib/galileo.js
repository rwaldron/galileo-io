require("es6-shim");

var IS_TEST_MODE = global.IS_TEST_MODE || false;
var fs = require("fs");
var Emitter = require("events").EventEmitter;
var Promise = require("es6-promise").Promise;
var Pin, io, mraa;

try {
  if (IS_TEST_MODE) {
    io = mraa = require("../test/mraa-mock.js");
  } else {
    io = mraa = require("mraa");
  }
  Pin = require("../lib/mraa.js");
} catch (e) {
  IS_TEST_MODE = false;
  Pin = require("../lib/pin.js");
}

var priv = new Map();
var tick = global.setImmediate || process.nextTick;

var modes = Object.freeze({
  INPUT: 0,
  OUTPUT: 1,
  ANALOG: 2,
  PWM: 3,
  SERVO: 4
});

var pinModes = [
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

var platforms = [
  "Intel Galileo 1",
  "Intel Galileo 2",
  "Intel Edison"
];

var boards = [];
var reporting = [];

/**
 * Several approaches where considered and attempted for
 * efficiently reading the value of GPIO or voltage ports
 * whose direction is "in".
 *
 * fs.watch: does not report changes made by the system
 *
 * gaze: does not report changes made by the system
 *
 */
tick(function read() {
  tick(read);
  var board;


  // TODO: Limit to one read cycle per ms?
  // Patches welcome for better approaches
  // that maintain the semantics.

  if (boards.length && reporting.length) {
    board = boards[0];

    reporting.forEach(function(report, gpio) {
      if (mraa) {
        var pin = board.pins[report.index];
        if (pin && pin.read) {
          processRead(board, report, pin.read());
        }
      } else {
        fs.readFile(report.path, "utf8", function(err, value) {
          if (!err) {
            processRead(board, report, value);
          }
        });
      }
    });
  }
});

function processRead(board, report, value) {
  value = +value;

  if (report.scale) {
    value = report.scale(value);
  }

  board.pins[report.index].value = value;
  board.emit(report.event, value);
}

function ToPinIndex(pin) {
  var offset = pin[0] === "A" ? 14 : 0;
  return ((pin + "").replace("A", "") | 0) + offset;
}

function Galileo(opts) {
  Emitter.call(this);

  if (!(this instanceof Galileo)) {
    return new Galileo(opts);
  }
  var awaiting = [];
  var state = {
    i2c: {}
  };

  priv.set(this, state);

  this.name = "Galileo-IO" + (mraa && " (" + platforms[mraa.getPlatformType()] + ")");
  this.isReady = false;

  // TODO:
  //
  // Once raw sysfs/gpio support is dropped, the
  // use of Promises will no longer be necessary
  //
  this.pins = pinModes.map(function(pin, index) {
    pin.addr = typeof pin.analogChannel === "number" ?
      "A" + pin.analogChannel : index;

    var gpio = new Pin(pin);

    awaiting.push(
      new Promise(function(resolve) {
        gpio.on("ready", function() {
          resolve();
        });
      })
    );

    return gpio;
  }, this);

  this.analogPins = this.pins.slice(14).map(function(pin, i) {
    return i;
  });

  boards[0] = this;

  // Connected to the device by default.
  tick(function() {
    this.emit("connect");
  }.bind(this));

  // The "ready event" is needed to signal to Johnny-Five that
  // communication with the Arduino pinouts is ready.
  Promise.all(awaiting).then(function() {
    this.isReady = true;
    this.emit("ready");
  }.bind(this));
}

Galileo.reset = function() {
  reporting.length = 0;
};

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
  var pinIndex;
  var gpioMode;
  var direction;

  gpioMode = mode = +mode;

  // Normalize ANALOG (input) mode to INPUT
  if (mode === 2) {
    gpioMode = 0;

    if (typeof pin === "number") {
      pin = "A" + pin;
    }
  }

  pinIndex = ToPinIndex(pin);

  // For Analog Input, set the GPIO MUX direction to "out"
  // Digital Input is set "in"
  // Digital Output is set "out"
  direction = gpioMode ? "out" : (mode === 2 ? "out" : "in");

  this.pins[pinIndex].mode = mode;
  this.pins[pinIndex].isPwm = mode === 3 || mode === 4;

  if (!mraa) {
    this.pins[pinIndex].direction = direction;

    // For Analog Input, write `0` to the GPIO MUX
    // to connect the analog pin to the ADC chip
    if (mode === 2) {
      this.pins[pinIndex].write(0);
    }
  }

  return this;
};

Galileo.prototype.analogRead = function(pin, handler) {
  var pinIndex;
  var gpio;
  var alias;
  var event;

  // Convert numeric analog pin numbers to "A*" format
  if (typeof pin === "number") {
    pin = "A" + pin;
  }

  pinIndex = ToPinIndex(pin);
  gpio = this.pins[pinIndex].gpio;
  alias = this.pins[pinIndex].analogChannel;
  event = "analog-read-" + alias;

  if (this.pins[pinIndex].mode !== this.MODES.ANALOG) {
    this.pinMode(pin, this.MODES.ANALOG);
  }

  // The sysfs port will have a 12-bit value of 0-4095,
  // the scale function will shift the value two bits to
  // right to produce a 10-bit value which matches Arduino
  // ADC read values.
  reporting[+gpio] = {
    alias: alias,
    event: event,
    index: pinIndex,
    path: mraa ? null : "/sys/bus/iio/devices/iio:device0/in_voltage" + alias + "_raw",
    scale: function(raw) {
      if (mraa) {
        return raw;
      }
      return raw >>> 2;
    }
  };

  this.on(event, handler);

  return this;
};

Galileo.prototype.digitalRead = function(pin, handler) {
  var pinIndex = ToPinIndex(pin);
  var gpio = this.pins[pinIndex].gpio;
  var event = "digital-read-" + pin;

  if (this.pins[pinIndex].mode !== this.MODES.INPUT) {
    this.pinMode(pin, this.MODES.INPUT);
  }

  reporting[+gpio] = {
    event: event,
    index: pinIndex,
    path: mraa ? null : this.pins[pinIndex].paths.value
  };

  this.on(event, handler);

  return this;
};

Galileo.prototype.analogWrite = function(pin, value) {
  var pinIndex = ToPinIndex(pin);

  if (this.pins[pinIndex].mode !== this.MODES.PWM) {
    this.pinMode(pin, this.MODES.PWM);
  }

  this.pins[pinIndex].write(value);

  return this;
};

Galileo.prototype.digitalWrite = function(pin, value) {
  var pinIndex = ToPinIndex(pin);

  if (this.pins[pinIndex].mode !== this.MODES.OUTPUT) {
    this.pinMode(pin, this.MODES.OUTPUT);
  }

  this.pins[pinIndex].write(value);

  return this;
};

Galileo.prototype.servoWrite = function(pin, value) {
  var pinIndex = ToPinIndex(pin);

  if (this.pins[pinIndex].mode !== this.MODES.SERVO) {
    this.pinMode(pin, this.MODES.SERVO);
  }

  this.pins[pinIndex].write(value);

  return this;
};

// By default, these parts are not supported
// by the fs based implementation. This will
// soon be deprecated.
[
  "pulseIn",
  "pulseOut",
  "queryPinState",
  "_sendOneWireRequest",
  "_sendOneWireSearch",
  "sendI2CWriteRequest",
  "sendI2CReadRequest",
  "sendI2CConfig",
  "sendOneWireWriteAndRead",
  "sendOneWireDelay",
  "sendOneWireDelay",
  "sendOneWireReset",
  "sendOneWireRead",
  "sendOneWireSearch",
  "sendOneWireAlarmsSearch",
  "sendOneWireConfig",
  "stepperConfig",
  "stepperStep"
].forEach(function(method) {
  Galileo.prototype[method] = function() {
    throw method + " is not yet implemented.";
  };
});

// When mraa is present, provide I2C interfaces
if (mraa) {

  // Map to Board.prototype.sendI2CConfig
  Galileo.prototype.i2cConfig = function(delay) {
    // There is no corresponding mechanism,
    // so treat this as a no-op
  };

  // Map to Board.prototype.sendI2CWriteRequest
  Galileo.prototype.i2cWrite = function(address, bytes) {
    /**
     * bytes:
     * command [, ... arbitrary bytes]
     */
    var state = priv.get(this);

    if (!Array.isArray(bytes)) {
      bytes = [bytes];
    }

    if (arguments.length === 3) {
      bytes = bytes.concat(arguments[2]);
    }

    // Create a unique I2C object for each address
    if (!state.i2c[address]) {
      // Determine bus, inferred via
      // https://github.com/intel-iot-devkit/mraa/commit/995565b2e1c3489810c66953e30ca07a83718c51
      // https://github.com/intel-iot-devkit/mraa/commit/dd89adc47b75e3d0f237d07884e0c69faecc6d9c
      //
      // 0 => 0
      // 1 => 0
      // 2 => 6
      //
      state.i2c[address] = new mraa.I2c([0, 0, 6][mraa.getPlatformType()]);
      state.i2c[address].address(address);
    }

    if (bytes.length) {
      state.i2c[address].write(new Buffer(bytes).toString());
    }

    return this;
  };

  Galileo.prototype.i2cWriteReg = function(address, reg, value) {
    return this.i2cWrite(address, [reg, value]);
  };

  // Map to Board.prototype.sendI2CReadRequest
  Galileo.prototype.i2cRead = function(address, bytes, length, callback) {
    var state = priv.get(this);

    callback = typeof callback === "function" ? callback : function() {};

    this.i2cWrite(address, bytes);
    this.once("I2C-reply-" + address, callback);

    tick(function() {
      var data = new Buffer(state.i2c[address].read(length), "ascii");
      var values = [];

      for (var i = 0; i < length; i++) {
        values.push(data.readUInt8(i));
      }

      this.emit("I2C-reply-" + address, values);
    }.bind(this));

    return this;
  };

  // Necessary for Firmata.js compatibility.
  Galileo.prototype.sendI2CWriteRequest = Galileo.prototype.i2cWrite;
  Galileo.prototype.sendI2CReadRequest = Galileo.prototype.i2cRead;
}


if (IS_TEST_MODE) {
  Galileo.__io = io;
}

module.exports = Galileo;

// http://wiki.ros.org/IntelGalileo/IntelGalileoPin
