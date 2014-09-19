require("es6-shim");

var mraa = require("mraa");
var Promise = require("es6-promise").Promise;
var remapped = require("remapped");
var Emitter = require("events").EventEmitter;
var tick = global.setImmediate || process.nextTick;
var priv = new Map();

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
  analogChannel: "analogChannel"
};

var defaults = {
  analogChannel: null
};

function Pin(setup) {
  Emitter.call(this);

  Object.assign(this, remapped(setup, pinRemapping, defaults));

  this.isAnalog = setup.addr[0] === "A";
  this.report = 0;
  this.value = 0;

  var state = {
    isPwm: false,
    direction: null,
    mode: null,
    mraa: null,
  };

  priv.set(this, state);

  // Initialize as basic analog and ditigal pins.
  // pinMode will update this property if the
  // pin is later needed for other purposes.
  if (this.isAnalog) {
    this.gpio = this.analogChannel;
    state.mraa = new mraa.Aio(this.analogChannel);
  } else {
    this.gpio = this.addr;
    state.mraa = new mraa.Gpio(this.addr);
    // Default pin state to output + LOW
    state.mraa.dir(mraa.DIR_OUT);
    state.mraa.write(0);
  }

  tick(function() {
    this.emit("ready");
  }.bind(this));
}

Pin.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Pin
  },
  mode: {
    set: function(value) {
      var state = priv.get(this);

      state.mode = value;

      this.isPwm = value === 3 || value === 4;

      if (this.isPwm) {
        state.period = 700;
        state.mraa = new mraa.Pwm(this.addr);
        state.mraa.enable(true);
      } else {
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
      priv.get(this).isPwm = value;
    },
    get: function() {
      return priv.get(this).isPwm;
    }
  },
  direction: {
    set: function(value) {
      var state = priv.get(this);
      var direction = dirRemapping[value];

      if (state.direction !== value && direction) {
        state.mraa.dir(mraa[direction]);
        state.direction = value;
      }
    },
    get: function() {
      return priv.get(this).direction;
    }
  }
});

Pin.prototype.write = function(value) {
  var state = priv.get(this);

  // if (this.direction !== "out") {
  //   this.direction = "out";
  // }

  if (state.isPwm) {

    var min = this.mode === 3 ? 0 : 544;
    var max = this.mode === 3 ? 700 : 2400;
    var period = this.mode === 3 ? 700 : 7968;

    // TODO:
    // Experiment with this:
    //
    // https://github.com/intel-iot-devkit/upm/blob/master/src/servo/servo.cxx#L82-L85
    // var cycles = (100 * (Math.abs(state.angle - angle) / MAX_ANGLE)) | 0 ;

    if (state.period !== period) {
      state.mraa.period_us(period);
    }

    state.mraa.write(scale(value, min, max, 0, 1));
    state.period = period;
  } else {
    state.mraa.write(value);
  }

  this.value = value;
};

Pin.prototype.read = function(value) {
  var state = priv.get(this);
  this.value = state.mraa.read();
  return this.value;
};

module.exports = Pin;
