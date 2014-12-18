require("es6-shim");

var IS_TEST_ENV = global.IS_TEST_ENV || false;
var fs = require("fs");
var Emitter = require("events").EventEmitter;
var Promise = require("es6-promise").Promise;
var Pin, io, mraa;

try {
  if (IS_TEST_ENV) {
    io = mraa = require("../test/mraa-mock.js");
  } else {
    io = mraa = require("mraa");
  }
  Pin = require("../lib/mraa.js");
} catch (e) {
  IS_TEST_ENV = false;
  Pin = require("../lib/pin.js");
}

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

// mraa does not support PWM on pin 10 and 11
// on the Edison (which only has 4 PWM channels),
// so we need to redefine those supported modes
// without PWM or SERVO.
// See discussion here:
// https://github.com/intel-iot-devkit/mraa/issues/52#issuecomment-65370890
//
if (mraa && mraa.getPlatformType() === 2) {
  pinModes[10].modes = [0, 1];
  pinModes[11].modes = [0, 1];
}

var platforms = [
  "Intel Galileo 1",
  "Intel Galileo 2",
  "Intel Edison"
];

var priv = new Map();
var boards = [];
var reporting = [];
// Experimental
// var i2cQueue = [];

/**
 * Several approaches where considered and attempted for
 * efficiently reading the value of GPIO and AIO pins.
 *
 * fs.watch: does not report changes made by the system
 *
 * gaze: does not report changes made by the system
 *
 * setImmediate: hogs the CPU
 *
 */
function read() {
  if (read.isReading) {
    return;
  }
  read.isReading = true;
  read.interval = setInterval(function() {
    var board, request, state;

    // TODO: Limit to one read cycle per ms?
    // Patches welcome for better approaches
    // that maintain the semantics.

    if (boards.length) {
      board = boards[0];

      if (reporting.length) {
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

      // Experimental
      // if (i2cQueue.length) {
      //   state = priv.get(board);
      //   request = i2cQueue.shift();
      //   state.i2c.address(request.address);
      //   state.i2c.write(request.buffer.toString("ascii"));
      // }
    }
  }, 1);
}


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
    i2c: null
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
  process.nextTick(function() {
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
  read.isReading = false;
  clearInterval(read.interval);
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

  read();

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

  read();

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

if (mraa) {

  // Bus determination inferred via
  // https://github.com/intel-iot-devkit/mraa/commit/995565b2e1c3489810c66953e30ca07a83718c51
  // https://github.com/intel-iot-devkit/mraa/commit/dd89adc47b75e3d0f237d07884e0c69faecc6d9c
  //
  // 0 => 0
  // 1 => 0
  // 2 => 6
  //
  var bus = [0, 0, 6][mraa.getPlatformType()];

  // Map to Board.prototype.sendI2CConfig
  Galileo.prototype.i2cConfig = function(delay) {
    var state = priv.get(this);
    // Initialize the I2C interface if none currently exists
    if (!state.i2c) {
      state.i2c = new mraa.I2c(bus);
      state.i2c.delay = delay;
    }
  };

  // Map to Board.prototype.sendI2CWriteRequest
  Galileo.prototype.i2cWrite = function(address, cmdRegOrData, inBytes) {
    /**
     * cmdRegOrData:
     * [... arbitrary bytes]
     *
     * or
     *
     * cmdRegOrData, inBytes:
     * command [, ...]
     *
     */
    var state = priv.get(this);
    var buffer;

    if (state.i2c === null) {
      this.i2cConfig();
    }


    // If i2cWrite was used for an i2cWriteReg call...
    if (arguments.length === 3 &&
        !Array.isArray(cmdRegOrData) &&
        !Array.isArray(inBytes)) {

      return this.i2cWriteReg(address, cmdRegOrData, inBytes);
    }

    // Fix arguments if called with Firmata.js API
    if (arguments.length === 2) {
      if (Array.isArray(cmdRegOrData)) {
        inBytes = cmdRegOrData.slice();
        cmdRegOrData = inBytes.shift();
      } else {
        inBytes = [];
      }
    }

    buffer = new Buffer([cmdRegOrData].concat(inBytes));

    // Only write if bytes provided
    if (buffer.length) {
      // Experimental:
      //
      //  - Throttling writes by making them async
      //
      // i2cQueue.push({
      //   address: address,
      //   buffer: buffer
      // });

      state.i2c.address(address);
      state.i2c.write(buffer.toString("ascii"));

      // Certain devices may not allow a batch value write.
      // for (var i = 0; i < buffer.length; i++) {
      //   state.i2c.write(buffer.toString("ascii", i, i + 1));
      // }
    }

    return this;
  };

  Galileo.prototype.i2cWriteReg = function(address, register, value) {
    var state = priv.get(this);

    if (state.i2c === null) {
      this.i2cConfig();
    }

    state.i2c.address(address);
    state.i2c.writeReg(register, value);

    return this;
  };


  // TODO: Refactor i2cRead and i2cReadOnce
  //      to share most operations.


  Galileo.prototype.i2cRead = function(address, register, bytesToRead, callback) {
    var state = priv.get(this);
    var event = "I2C-reply" + address + "-";

    if (state.i2c === null) {
      this.i2cConfig();
    }

    // Fix arguments if called with Firmata.js API
    if (arguments.length === 3 &&
        typeof register === "number" &&
        typeof bytesToRead === "function") {
      callback = bytesToRead;
      bytesToRead = register;
      register = null;
    }

    callback = typeof callback === "function" ? callback : function() {};

    if (register !== null) {
      this.i2cWrite(address, register);
    } else {
      register = 0;
    }

    event += register;

    this.on(event, callback);

    setInterval(function() {
      state.i2c.address(address);

      var data = new Buffer(state.i2c.read(bytesToRead));
      var values = [];

      for (var i = 0; i < bytesToRead; i++) {
        values.push(data.readUInt8(i));
      }

      this.emit(event, values);
    }.bind(this), state.i2c.delay);

    return this;
  };

  // Map to Board.prototype.sendI2CReadRequest
  Galileo.prototype.i2cReadOnce = function(address, register, bytesToRead, callback) {
    var state = priv.get(this);
    var event = "I2C-reply" + address + "-";

    if (state.i2c === null) {
      this.i2cConfig();
    }

    // Fix arguments if called with Firmata.js API
    if (arguments.length === 3 &&
        typeof register === "number" &&
        typeof bytesToRead === "function") {
      callback = bytesToRead;
      bytesToRead = register;
      register = null;
    }

    callback = typeof callback === "function" ? callback : function() {};

    if (register !== null) {
      this.i2cWrite(address, register);
    } else {
      register = 0;
    }

    event += register;

    this.once(event, callback);

    setTimeout(function() {
      state.i2c.address(address);

      var data = new Buffer(state.i2c.read(bytesToRead));
      var values = [];

      for (var i = 0; i < bytesToRead; i++) {
        values.push(data.readUInt8(i));
      }

      this.emit(event, values);
    }.bind(this), state.i2c.delay);


    return this;
  };
  // Necessary for Firmata.js compatibility.
  Galileo.prototype.sendI2CWriteRequest = Galileo.prototype.i2cWrite;
  Galileo.prototype.sendI2CReadRequest = Galileo.prototype.i2cReadOnce;
  Galileo.prototype.sendI2CConfig = Galileo.prototype.i2cConfig;
}


if (IS_TEST_ENV) {
  Galileo.__io = io;
  Galileo.__reporting = reporting;
}

read();

module.exports = Galileo;
// http://wiki.ros.org/IntelGalileo/IntelGalileoPin
