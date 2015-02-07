require("es6-shim");

var IS_TEST_ENV = global.IS_TEST_ENV || false;
var Emitter = require("events").EventEmitter;
var isMiniboard = false;
var Pin = require("../lib/mraa");

var modes = Object.freeze({
  INPUT: 0,
  OUTPUT: 1,
  ANALOG: 2,
  PWM: 3,
  SERVO: 4
});

// This is the default for:
//   - Galileo 1
//   - Galileo 2
//   - Edision Arduino Board
//
var pinModes = [
  { modes: [] },
  { modes: [] },
  { modes: [0, 1] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1] },
  { modes: [0, 1] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1, 3, 4] },
  { modes: [0, 1] },
  { modes: [0, 1] },
  { modes: [0, 1, 2], analogChannel: 0 },
  { modes: [0, 1, 2], analogChannel: 1 },
  { modes: [0, 1, 2], analogChannel: 2 },
  { modes: [0, 1, 2], analogChannel: 3 },
  { modes: [0, 1, 2], analogChannel: 4 },
  { modes: [0, 1, 2], analogChannel: 5 }
];


if (Pin.IO.getPlatformType() === 2) {
  // Feature detection for:
  //  - Edison Mini Board
  //  - Edison Arduino Board

  try {
    // Use pin 1 as a test to determine if
    // this is running on an Edison Mini Board.
    // Pin 1 is not connected, so this will fail
    // and throw an exception.
    new Pin.IO.Gpio(1);
  } catch (e) {
    isMiniboard = true;
  }

  if (isMiniboard) {
    // Edison Mini Board
    // --------------------
    //
    // The Mini Board requires a completely unique
    // pin capabilities definition.
    //
    pinModes = [
      { modes: [0, 1, 3, 4] },
      null,
      null,
      null,
      { modes: [0, 1] },
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      null,
      { modes: [0, 1] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1] },
      null,
      null,
      null,
      { modes: [0, 1] },
      { modes: [0, 1, 3, 4] },
      { modes: [0, 1, 3, 4] },
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      null,
      null,
      null,
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      null,
      null,
      null,
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
      { modes: [0, 1] },
    ];
  } else {
    // Edison Arduino Board
    // --------------------
    //
    // mraa does not support PWM on pin 10 and 11
    // on the Edison Arduino Board (which only has 4 PWM channels),
    // so we need to redefine those supported modes
    // without PWM or SERVO.
    // See discussion here:
    // https://github.com/intel-iot-devkit/mraa/issues/52#issuecomment-65370890
    //
    pinModes[10].modes = [0, 1];
    pinModes[11].modes = [0, 1];
  }
}

var priv = new Map();
var boards = [];
var reporting = [];

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
          var pin = board.pins[report.index];
          if (pin && pin.read) {
            processRead(board, report, pin.read());
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

  if (isMiniboard) {
    offset = 0;
  }

  var index = ((pin + "").replace("A", "") | 0) + offset;

  if (pinModes[index] != null) {
    return index;
  }

  throw new Error("Edison Mini Board has no connection at pin " + pin);
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

  this.name = Pin.IO.getPlatformName();
  this.isReady = false;

  // TODO:
  //
  // Once raw sysfs/gpio support is dropped, the
  // use of Promises will no longer be necessary
  //
  this.pins = pinModes.map(function(pin, index) {
    if (pin === null) {
      return;
    }

    pin.isMiniboard = isMiniboard;
    pin.addr = typeof pin.analogChannel === "number" ?
      "A" + pin.analogChannel : index;

    // EXPERIMENTAL
    //
    // var gpio = new Pin(pin);
    // awaiting.push(
    //   new Promise(function(resolve) {
    //     gpio.on("ready", function() {
    //       resolve();
    //     });
    //   })
    // );
    // return gpio;

    return new Pin(pin);
  }, this);

  this.analogPins = this.pins.slice(14).map(function(pin, i) {
    return i;
  });

  boards[0] = this;

  // Connected to the device implicitly.
  process.nextTick(this.emit.bind(this, "connect"));

  // The "ready event" is needed to signal to Johnny-Five that
  // communication with the Arduino pinouts is ready.
  process.nextTick(function() {
    this.isReady = true;
    this.emit("ready");
  }.bind(this));

  // EXPERIMENTAL
  // The "ready event" is needed to signal to Johnny-Five that
  // communication with the Arduino pinouts is ready.
  // Promise.all(awaiting).then(function() {
  //   this.isReady = true;
  //   this.emit("ready");
  // }.bind(this));
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

  if (isMiniboard) {
    // If attempting to create an analog read pin...
    if (mode === 2) {
      throw new Error("Edison Mini Board does not support analog IO");
    }
  }

  // For Analog Input, set the GPIO MUX direction to "out"
  // Digital Input is set "in"
  // Digital Output is set "out"
  direction = gpioMode ? "out" : (mode === 2 ? "out" : "in");

  this.pins[pinIndex].mode = mode;
  this.pins[pinIndex].isPwm = mode === 3 || mode === 4;

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

  reporting[+gpio] = {
    alias: alias,
    event: event,
    index: pinIndex,
    scale: function(raw) {
      return raw;
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

// Bus determination inferred via
// https://github.com/intel-iot-devkit/mraa/commit/995565b2e1c3489810c66953e30ca07a83718c51
// https://github.com/intel-iot-devkit/mraa/commit/dd89adc47b75e3d0f237d07884e0c69faecc6d9c
//
// 0 => 0 (Galileo Gen 1)
// 1 => 0 (Galileo Gen 2)
// 2 => 6 (Edison)
//
var bus = [0, 0, 6][Pin.IO.getPlatformType()];

// Map to Board.prototype.sendI2CConfig
Galileo.prototype.i2cConfig = function(delay) {
  var state = priv.get(this);
  // Initialize the I2C interface if none currently exists
  if (!state.i2c) {
    state.i2c = new Pin.IO.I2c(bus);
    state.i2c.delay = delay || 0;
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
    state.i2c.address(address);
    state.i2c.write(buffer);

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


if (IS_TEST_ENV) {
  Galileo.__io = Pin.IO;
  Galileo.__miniboard = function(enable) {
    isMiniboard = enable;
  };
  Galileo.__pinmodes = function(temp) {
    if (Galileo.__pinmodes.original == null) {
      Galileo.__pinmodes.original = pinModes.slice();
      pinModes = temp;
    } else {
      pinModes = Galileo.__pinmodes.original.slice();
      Galileo.__pinmodes.original = null;
    }
  };

}

read();

module.exports = Galileo;
// http://wiki.ros.org/IntelGalileo/IntelGalileoPin
