require("es6-shim");

var IS_TEST_ENV = global.IS_TEST_ENV || false;
var remapped = require("remapped");
var Emitter = require("events").EventEmitter;
var priv = new Map();
var IO;

try {
  var IO = IS_TEST_ENV ?
    require("../test/mraa-mock.js") :
    require("mraa");

} catch (e) {
  IS_TEST_ENV = false;

  console.log("  NOTICE");
  console.log("  --------------------------------");
  console.log("  This OS image is no longer supported.");
  console.log("  Please upgrade to IoTKit Image with libmraa0 support.");
  console.log("  https://github.com/intel-iot-devkit/mraa/#installing-on-your-board");
  console.log("  --------------------------------");

  return;
}


function scale(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) * (outMax - outMin) /
    (inMax - inMin) + outMin;
}

function constrain(value, min, max) {
  return value > max ? max : value < min ? min : value;
}

var dirRemapping = {
  out: "DIR_OUT",
  in: "DIR_IN",
};

var pinRemapping = {
  addr: "addr",
  supportedModes: "modes",
  analogChannel: "analogChannel",
  isMiniboard: "isMiniboard"
};

var defaults = {
  analogChannel: null
};

function Pin(setup) {
  Emitter.call(this);

  Object.assign(this, remapped(setup, pinRemapping, defaults));

  this.isAnalog = setup.addr[0] === "A";
  this.gpio = this.isAnalog ? this.analogChannel : this.addr;
  this.report = 0;
  this.value = 0;

  var state = {
    isPwm: false,
    direction: null,
    mode: null,
    period: null,
    io: null,
    pwm: null
  };

  priv.set(this, state);

  // this.emit.bind(this, "ready");
  // process.nextTick(this.emit.bind(this, "ready"));
}

Pin.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Pin
  },
  mode: {
    set: function(value) {
      var state = priv.get(this);

      state.mode = value;
      state.isPwm = value === 3 || value === 4;

      if (state.isPwm) {
        if (state.pwm === null) {
          state.pwm = new IO.Pwm(this.addr);
        }
        state.pwm.enable(true);
      } else {

        // Disable a previously enabled pwm
        if (state.pwm) {
          state.pwm.enable(false);
        }

        if (!this.isAnalog) {
          this.direction = value ? "out" : "in";
        }
      }
    },
    get: function() {
      return priv.get(this).mode;
    }
  },
  isPwm: {
    set: function(value) {
      // ... no op?
    },
    get: function() {
      return priv.get(this).isPwm;
    }
  },
  direction: {
    set: function(value) {
      var state = priv.get(this);
      var direction = dirRemapping[value];

      if (state.io === null) {
        this.initialize();
      }

      state.io.dir(IO[direction]);
      state.direction = value;
    },
    get: function() {
      return priv.get(this).direction;
    }
  }
});

Pin.prototype.initialize = function() {
  var state = priv.get(this);

  if (this.supportedModes.length) {
    if (this.isAnalog) {
      state.io = new IO.Aio(this.gpio);
    } else {
      state.io = new IO.Gpio(this.gpio);

      // Use memory mapped IO instead of sysfs
      state.io.useMmap(true);

      // Physical pin state:
      //    - dir: OUT (0)
      //    - state: LOW (0)
      //
      // Internal pin state:
      //    - direction: out

      state.io.dir(0);
      state.io.write(0);
      state.direction = "out";
    }
  } else {
    throw new Error("Pin: " + this.gpio + " does not support this action");
  }
};

var MIN_PULSE_WIDTH = 600;
var MAX_PULSE_WIDTH = 2600;
var MAX_SERVO_PERIOD = 7968;
var MAX_PWM_PERIOD = 700;

Pin.prototype.write = function(value) {
  var state = priv.get(this);

  if (state.isPwm) {
    var isServo = this.mode === 4;
    var period = isServo ? MAX_SERVO_PERIOD : MAX_PWM_PERIOD;

    if (!state.pwm) {
      state.pwm = new IO.Pwm(this.addr);
      state.pwm.enable(true);
    }

    if (state.period !== period) {
      state.pwm.period_us(period);
      state.period = period;
    }

    if (isServo) {
      // Convert degrees to pulse
      state.pwm.pulsewidth_us(pulse(value));
    } else {
      // Convert 8 bit value to % of 1
      state.pwm.write(scale(value, 0, 255, 0, 1));
    }
  } else {

    if (state.io === null) {
      this.initialize();
    }

    if (this.direction !== "out") {
      this.direction = "out";
    }

    state.io.write(value);
  }

  this.value = value;
};

Pin.prototype.read = function(value) {
  var state = priv.get(this);

  if (state.io === null) {
    this.initialize();
  }

  this.value = state.isPwm && state.pwm !== null ?
    state.pwm.read() :
    state.io.read();

  return this.value;
};

function pulse(value) {
  if (value > 180) {
    return MAX_PULSE_WIDTH;
  }

  if (value < 0) {
    return MIN_PULSE_WIDTH;
  }

  return (MIN_PULSE_WIDTH + (value / 180) * (MAX_PULSE_WIDTH - MIN_PULSE_WIDTH));
}

Pin.IO = IO;


module.exports = Pin;
