require("es6-shim");

var IS_TEST_ENV = global.IS_TEST_ENV || false;
var Emitter = require("events").EventEmitter;
var Pin = require("./pin");

var modes = Object.freeze({
  INPUT: 0,
  OUTPUT: 1,
  ANALOG: 2,
  PWM: 3,
  SERVO: 4
});

var aref = 5;
var vref = 5;

// This is the default for:
//   - Galileo 1 (no longer supported)
//   - Galileo 2
//   - Edision Arduino Board
//
var pinModes = [
  { modes: [0, 1] },
  { modes: [0, 1] },
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

var isMiniboard = false;
var isCarrierboard = false;
var platformType = Pin.IO.getPlatformType();
var platformPinMapping = require("./pin-mapping/")[platformType];

if (platformType === 2) {
  // Feature detection for:
  //  - Edison Mini Board
  //  - Edison Arduino Board
  //  - Intel Joule

  if (Pin.IO.getPinCount() > 20) {
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

    aref = null;
    vref = 1.8;

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
} else if (platformType === 13) {
  // Intel Joule

  isCarrierboard = true;

  pinModes = [
    null, // There is no pin with the number 0
    { modes: [0, 1] },
    { modes: [0, 1] },
    null,
    { modes: [0, 1] },
    { modes: [0, 1] },
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
    { modes: [0, 1] },
    { modes: [0, 1] },
    { modes: [0, 1] },
    { modes: [0, 1] },
    { modes: [0, 1] },
    { modes: [0, 1] },
    null,
    { modes: [0, 1] },
    null,
    { modes: [0, 1, 3, 4] },
    { modes: [0, 1] },
    { modes: [0, 1, 3, 4] },
    null,
    { modes: [0, 1, 3, 4] },
    null,
    { modes: [0, 1, 3, 4] },
    null,
    null,
    { modes: [0, 1] },
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    { modes: [0, 1] },
    null,
    { modes: [0, 1] },
    null,
    { modes: [0, 1] },
    null,
    { modes: [0, 1] },
    null,
    { modes: [0, 1] },
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
    { modes: [0, 1] },
    { modes: [0, 1] },
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
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    // These are actually the LEDs
    { modes: [0, 1] },
    { modes: [0, 1] },
    { modes: [0, 1] },
    { modes: [0, 1] },
  ];

  aref = null;
  vref = 1.8;
}

var priv = new Map();
var boards = [];
var reporting = [];

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
  }, read.samplingInterval);
}

read.samplingInterval = 10;

function processRead(board, report, value) {
  value = +value;

  if (report.scale) {
    value = report.scale(value);
  }

  board.pins[report.index].value = value;
  board.emit(report.event, value);
}

function Board(opts) {
  Emitter.call(this);

  if (!(this instanceof Board)) {
    return new Board(opts);
  }

  opts = opts || {};

  var awaiting = [];
  var state = {
    i2c: opts.i2c !== undefined ? Object.assign({}, opts.i2c) : null,
  };

  priv.set(this, state);

  this.name = Pin.IO.getPlatformName();
  this.isReady = false;
  this.aref = aref;
  this.vref = vref;

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
    pin.isCarrierboard = isCarrierboard;
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
}

Board.reset = function() {
  reporting.length = 0;
  read.isReading = false;
  read.samplingInterval = 10;
  clearInterval(read.interval);
};

Board.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Board
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


function ToPinIndex(pin) {
  var offset = pin[0] === "A" ? 14 : 0;
  var index;

  if (isMiniboard || isCarrierboard) {
    offset = 0;

    if (typeof pin === "string") {
      index = platformPinMapping[pin.toUpperCase()];


      if (index !== undefined) {
        return index;
      }
      return pin;
    }
  }

  index = ((pin + "").replace("A", "") | 0) + offset;

  if (pinModes[index] != null) {
    return index;
  }
}

Board.prototype.normalize = function(pin) {
  if (isMiniboard || isCarrierboard) {
    return ToPinIndex(pin);
  }
  // This mirrors the default normalization
  // in Johnny-Five and is necessary for
  // Arduino-based pin mappings.
  if (typeof pin === "string" && pin[0] === "A") {
    return parseInt(pin.slice(1), 10);
  }
  return pin;
};

Board.prototype.pinMode = function(pin, mode) {
  var pinIndex;
  var gpioMode;

  gpioMode = mode = +mode;

  // Normalize ANALOG (input) mode to INPUT
  if (mode === 2) {
    gpioMode = 0;

    if (typeof pin === "number") {
      pin = "A" + pin;
    }
  }

  if (isMiniboard || isCarrierboard) {
    // If attempting to create an analog read pin...
    if (mode === 2) {
      throw new Error(Pin.IO.getPlatformName() + " does not support Analog Input (ADC)");
    }
  }

  pinIndex = ToPinIndex(pin);
  this.pins[pinIndex].mode = mode;
  this.pins[pinIndex].isPwm = mode === 3 || mode === 4;

  return this;
};

Board.prototype.analogRead = function(pin, handler) {
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

Board.prototype.digitalRead = function(pin, handler) {
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

Board.prototype.analogWrite = function(pin, value) {
  var pinIndex = ToPinIndex(pin);

  if (this.pins[pinIndex].mode !== this.MODES.PWM) {
    this.pinMode(pin, this.MODES.PWM);
  }

  this.pins[pinIndex].write(value);

  return this;
};

Board.prototype.digitalWrite = function(pin, value) {
  var pinIndex = ToPinIndex(pin);

  if (this.pins[pinIndex].mode !== this.MODES.OUTPUT) {
    this.pinMode(pin, this.MODES.OUTPUT);
  }

  this.pins[pinIndex].write(value);

  return this;
};

Board.prototype.servoConfig = function(pin, min, max) {
  var pinIndex = ToPinIndex(pin);

  if (this.pins[pinIndex].mode !== this.MODES.SERVO) {
    this.pinMode(pin, this.MODES.SERVO);
  }

  this.pins[pinIndex].servoConfig = {
    min: min,
    max: max,
  };

  return this;
};

Board.prototype.servoWrite = function(pin, value) {
  var pinIndex = ToPinIndex(pin);

  if (this.pins[pinIndex].mode !== this.MODES.SERVO) {
    this.pinMode(pin, this.MODES.SERVO);
  }

  this.pins[pinIndex].write(value);

  return this;
};

[
  "pulseIn",
  "pulseOut",
  "queryPinState",
  "stepperConfig",
  "stepperStep",

  // TODO: Use UartOW to implement these
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
].forEach(function(method) {
  Board.prototype[method] = function() {
    throw new Error(method + " is not yet implemented.");
  };
});

var i2cBus = Pin.IO.getDefaultI2cBus();

if (isMiniboard) {
  i2cBus = 1;
}

// Map to Board.prototype.sendI2CConfig
Board.prototype.i2cConfig = function(opts) {
  var state = priv.get(this);
  var bus = i2cBus;

  // An explicit bus was provided.
  if (state.i2c !== null && typeof state.i2c.bus === "number") {
    bus = state.i2c.bus;
  }

  // Initialize the I2C interface if none currently exists
  if (!(state.i2c instanceof Pin.IO.I2c)) {
    state.i2c = new Pin.IO.I2c(bus);

    if (typeof opts === "number" || typeof opts === "undefined") {
      opts = { delay: Number(opts) };
    }

    state.i2c.delay = opts.delay || 5;
  }
};

// Map to Board.prototype.sendI2CWriteRequest
Board.prototype.i2cWrite = function(address, cmdRegOrData, inBytes) {
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

Board.prototype.i2cWriteReg = function(address, register, value) {
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


Board.prototype.i2cRead = function(address, register, bytesToRead, callback) {
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

  event += register !== null ? register : 0;

  this.on(event, callback);

  setInterval(function() {
    var data;

    try {
      state.i2c.address(address);

      if (register !== null) {
        data = state.i2c.readBytesReg(register, bytesToRead);
      } else {
        data = state.i2c.read(bytesToRead);
      }
    } catch (error) {
      console.warn("I2C: Could not read %d Bytes from peripheral with address 0x%s", bytesToRead, address.toString(16));
    }

    var values = [];

    if (data && data.length === bytesToRead) {
      for (var i = 0; i < bytesToRead; i++) {
        values.push(data.readUInt8(i));
      }
    } else {
      console.warn("I2C: Could not read %d Bytes from peripheral with address 0x%s", bytesToRead, address.toString(16));
    }

    this.emit(event, values);
  }.bind(this), read.samplingInterval);

  return this;
};

// Map to Board.prototype.sendI2CReadRequest
Board.prototype.i2cReadOnce = function(address, register, bytesToRead, callback) {
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

  event += register !== null ? register : 0;

  this.once(event, callback);

  setTimeout(function() {
    var data;

    try {
      state.i2c.address(address);

      if (register !== null) {
        data = state.i2c.readBytesReg(register, bytesToRead);
      } else {
        data = state.i2c.read(bytesToRead);
      }
    } catch (error) {
      console.warn("I2C: Could not read %d Bytes from peripheral with address 0x%s", bytesToRead, address.toString(16));
    }

    var values = [];

    if (data && data.length === bytesToRead) {
      for (var i = 0; i < bytesToRead; i++) {
        values.push(data.readUInt8(i));
      }
    } else {
      console.warn("I2C: Could not read %d Bytes from peripheral with address 0x%s", bytesToRead, address.toString(16));
    }

    this.emit(event, values);
  }.bind(this), 1);

  return this;
};

// Necessary for Firmata.js compatibility.
Board.prototype.sendI2CWriteRequest = Board.prototype.i2cWrite;
Board.prototype.sendI2CReadRequest = Board.prototype.i2cReadOnce;
Board.prototype.sendI2CConfig = Board.prototype.i2cConfig;


Board.prototype.setSamplingInterval = function(ms) {
  read.samplingInterval = Math.min(Math.max(ms, 0), 65535);
  clearInterval(read.interval);
  read();
};

Board.Uart = Pin.IO.Uart;
Board.Spi = Pin.IO.Spi;
// This is pretty sucky naming, but it makes more
// sense on the dev/author end.
Board.Boards = {
  Xadow: {
    i2c: {
      bus: 0x00
    },
  },
  DFRobotRomeo: {
    i2c: {
      bus: 0x00
    },
  },
  DFRobotIO: {
    i2c: {
      bus: 0x00
    },
  }
};

if (IS_TEST_ENV) {
  Board.__carrierboard = function(enable) {
    isCarrierboard = enable;
  };
  Board.__i2cBus = function(value) {
    i2cBus = value;
  };
  Board.__io = Pin.IO;
  Board.__miniboard = function(enable) {
    isMiniboard = enable;
  };
  Board.__pinmodes = function(temp) {
    if (Board.__pinmodes.original == null) {
      Board.__pinmodes.original = pinModes.slice();
      pinModes = temp;
    } else {
      pinModes = Board.__pinmodes.original.slice();
      Board.__pinmodes.original = null;
    }
  };
  Board.__platformPinMapping = function(temp) {
    if (Board.__platformPinMapping.original == null) {
      Board.__platformPinMapping.original = platformPinMapping;
      platformPinMapping = temp;
    } else {
      platformPinMapping = Board.__platformPinMapping.original;
      Board.__platformPinMapping.original = null;
    }
  };
  Board.__read = read;
}

read();

module.exports = Board;
