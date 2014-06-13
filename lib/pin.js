require("es6-shim");

var Promise = require("es6-promise").Promise;
var remapped = require("remapped");
var fs = require("graceful-fs");
var Emitter = require("events").EventEmitter;
var tick = global.setImmediate || process.nextTick;

var priv = new Map();
var _ = null;

var EXPORT_PATH = "/sys/class/gpio/export";
var UNEXPORT_PATH = "/sys/class/gpio/unexport";
var PWM_EXPORT_PATH = "/sys/class/pwm/pwmchip0/export";
var PWM_UNEXPORT_PATH = "/sys/class/pwm/pwmchip0/unexport";

var mapping = {
  addr: "addr",
  supportedModes: "modes",
  analogChannel: "analogChannel"
};

var defaults = {
  analogChannel: null
};

var noop = function () {};

function scale(x, aMin, aMax, bMin, bMax) {
  return (x - aMin) * (bMax - bMin) /
    (aMax - aMin) + bMin;
}

function constrain(x, min, max) {
  return x > max ? max : x < min ? min : x;
}

function Mux(gpio, value) {
  priv.set(this, {
    value: 0,
    direction: null,
    drive: null,
    initial: {
      value: value,
      direction: "out",
      drive: "strong"
    }
  });

  this.paths = new Paths({
    id: gpio
  });

  this.gpio = gpio;
}

Mux.prototype.setup = function() {
  var state = priv.get(this);
  return new Promise(function(resolve) {
    if (state.initial !== null) {
      fs.open(this.paths.exported, "w", function(error) {
        if (error && (error.code === "ENOENT" || error.code === "EISDIR")) {
          fs.writeFile(EXPORT_PATH, String(this.gpio), noop);
        }

        // Order matters...
        ["drive", "direction", "value"].forEach(function(key) {
          this[key] = state.initial[key];
        }, this);

        // null the initial state data
        state.initial = null;
        resolve();
      }.bind(this));
    } else {
      resolve();
    }
  }.bind(this));
};

Object.defineProperties(
  Mux.prototype,
  [
    "value",
    "direction",
    "drive"
  ].reduce(function(descriptors, property) {
    descriptors[property] = {
      get: function() {
        return priv.get(this)[property];
      },
      set: function(value) {
        var state = priv.get(this);
        if (state[property] !== value) {
          state[property] = value;
          fs.writeFile(this.paths[property], String(value), noop);
        }
      }
    };
    return descriptors;
  }, {})
);

function PWM(gpio) {
  // 500000ns  = 500μs
  // 2300000ns = 2300μs

  priv.set(this, {
    enable: null,
    period: null,
    duty_cycle: null
  });

  this.paths = new Paths({
    type: "pwm",
    id: gpio
  });

  this.gpio = gpio;
}

PWM.Scales = [
  // 0-180, 500000-2300000
  [[0x00, 0xb4], [0x07a120, 0x231860]],
  // 0-255, 000000-2400000
  [[0x00, 0xff], [0x000000, 0x249f00]]
];

PWM.prototype.setup = function() {
  return new Promise(function(resolve) {
    fs.open(this.paths.exported, "r", function(error, fd) {
      if (error && (error.code === "ENOENT" || error.code === "EISDIR")) {
        fs.writeFile(PWM_EXPORT_PATH, String(this.gpio), noop);
      }
      resolve();
    }.bind(this));
  }.bind(this));
};

PWM.prototype.write = function(value, mode) {
  var state = priv.get(this);
  var scales = PWM.Scales[mode & 1];
  var range = scales[0];
  var period = scales[1];
  // "Destructure" range and period values
  var rlow = range[0];
  var plow = period[0];
  var rhigh = range[1];
  var phigh = period[1];

  var duty = 0;

  // Ensure that the pwm is enabled
  if (state.enable !== 1) {
    this.enable = 1;
    tick(this.write.bind(this, value, mode));
    return this;
  }

  // Ensure that the correct period is set
  if (state.period !== phigh) {
    this.period = phigh;
    tick(this.write.bind(this, value, mode));
    return this;
  }

  // Constrain user input to
  // Scale to the period in ns
  duty = scale(constrain(value, rlow, rhigh), rlow, rhigh, plow, phigh);
  // console.log( "duty before constraint: ", duty );
  // console.log( [duty].concat(period) );

  // Constrain to valid ns duty range
  duty = constrain.apply(null, [duty].concat(period)) | 0;

  this.duty_cycle = duty;

  return this;
};

Object.defineProperties(
  PWM.prototype,
  [
    "enable",
    "period",
    "duty_cycle"
  ].reduce(function(descriptors, property) {
    descriptors[property] = {
      get: function() {
        return priv.get(this)[property];
      },
      set: function(value) {
        var state = priv.get(this);
        if (state[property] !== value) {
          state[property] = value;
          fs.writeFile(this.paths[property], String(value), noop);
        }
      }
    };
    return descriptors;
  }, {})
);

function Paths(opts) {
  /**
   * opts.id number
   * opts.isAnalog true|false
   * opts.type: gpio (gpio, mux) | pwm
   */

  var type = typeof opts.type === "undefined" ?
    "gpio" : opts.type;

  var isAnalog = typeof opts.isAnalog === "undefined" ?
    false : opts.isAnalog;

  var id = opts.id;

  /*
    type = gpio | mux

    {
      exported: "/sys/class/gpio/gpio{id}/",
      drive: "/sys/class/gpio/gpio{id}/drive",
      direction: "/sys/class/gpio/gpio{id}/direction",
      value: "/sys/class/gpio/gpio{id}/value"
    }
  */
  if (type === "gpio" || type === "mux") {
    this.exported = "/sys/class/gpio/gpio" + id + "/";

    this.drive = isAnalog ? null :
      this.exported + "drive";

    this.direction = isAnalog ? null :
      this.exported + "direction";

    this.value = isAnalog ?
      "/sys/bus/iio/devices/iio:device0/in_voltage" + id + "_raw" :
      this.exported + "value";
  }
  /*
    type = pwm

    {
      exported: "/sys/class/pwm/pwmchip0/pwm{id}/",
      enable: "/sys/class/pwm/pwmchip0/pwm{id}/enable",
      period: "/sys/class/pwm/pwmchip0/pwm{id}/period",
      duty_cycle: "/sys/class/pwm/pwmchip0/pwm{id}/duty_cycle"
    }
  */
  if (type === "pwm") {
    this.exported = "/sys/class/pwm/pwmchip0/pwm" + id + "/";
    this.enable = this.exported + "enable";
    this.period = this.exported + "period";
    this.duty_cycle = this.exported + "duty_cycle";
  }
}

var digital = {
  pins: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
  ],
  gpio: [
  // 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13
    50, 51, 32, 18, 28, 17, 24, 27, 26, 19, 16, 25, 38, 39
  ],
  alias: {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8,
    9: 9, 10: 10, 11: 11, 12: 12, 13: 13
  },
  mux: [
    {
      gpio: [
    //   0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13
    //  50, 51, 32, 18, 28, 17, 24, 27, 26, 19, 16, 25, 38, 39
        40, 41, 31, 30,  _,  _,  _,  _,  _,  _, 42, 43, 54, 55
      ],
      value: [
        1,  1,  1,  1,  _,  _,  _,  _,  _,  _,  1,  1,  1,  1
      ]
    },
    {
      gpio: [
        _, _, 1, _, _, _, _, _, _, _, _, _, _, _
      ],
      value: [
        1, 1, 1, _, _, _, _, _, _, _, 1, 1, 1, 1
      ]
    }
  ]
};

var pwm = {
  pins: [
    3, 5, 6, 9, 10, 11
  ],
  alias: {
    3: 3, 5: 5, 6: 6, 9: 1, 10: 7, 11: 4
  }
};

var analog = {
  pins: [
    "A0", "A1", "A2", "A3", "A4", "A5"
  ],
  gpio: [
    44, 45, 46, 47, 48, 49
  ],
  alias: {
    "A0": 0, "A1": 1, "A2": 2, "A3": 3, "A4": 4, "A5": 5
  },
  offset: {
    "A0": 14, "A1": 15, "A2": 16, "A3": 17, "A4": 18, "A5": 19
  },
  mux: [
    {
      gpio: [
        37, 36, 23, 22, 21, 20
      ],
      value: [
        0, 0, 0, 0, 0, 0
      ]
    },
    {
      gpio: [
        _, _, _, _, 29, 29
      ],
      value: [
        _, _, _, _, 1, 1
      ]
    }
  ]
};

var ports = [];
var indices = {};
var index = -1;

[digital, analog].forEach(function(type, i) {
  var isAnalog = false;

  if (i > 13) {
    isAnalog = true;
  }

  type.pins.forEach(function(pin, j) {
    var ppin = isAnalog ? null : pwm.alias[pin];
    var gpio = type.gpio[j];
    var alias = type.alias[pin];
    var mux = [];

    var p = {
      pin: pin,
      gpio: gpio,
      alias: alias,
      mux: null,
      pwm: null,
      paths: new Paths({
        id: isAnalog ? alias : gpio,
        isAnalog: isAnalog
      })
    };

    if (type.mux[0].gpio[j] !== null) {
      mux[0] = new Mux(type.mux[0].gpio[j], type.mux[0].value[j]);
    }

    if (type.mux[1].gpio[j] !== null) {
      mux[1] = new Mux(type.mux[1].gpio[j], type.mux[1].value[j]);
    }

    if (mux.length) {
      p.mux = mux;
    }

    if (ppin) {
      p.pwm = new PWM(ppin);
    }

    ports.push(p);
    indices[pin] = ++index;
  });
});

/*

  The above code will produce two items:

    - ports: an array of "port" data objects:

      Analog:
      {
        paths: {
          direction: "/sys/class/gpio/gpio44/direction",
          drive: "/sys/class/gpio/gpio44/drive",
          exported: "/sys/class/gpio/gpio44/",
          value: "/sys/class/gpio/gpio44/value"
        },
        pin: "A0",
        mux: [{
            paths: [Object],
            direction: "out",
            drive: "strong",
            value: 0,
            gpio: 37
          },
          [length]: 1
        ],
        alias: 0,
        pwm: null,
        gpio: 44
      }

      Digital (w/ mux, pwm):
      {
        pin: 3,
        alias: 3,
        gpio: 18,
        mux: [{
            direction: "out",
            value: 1,
            drive: "strong",
            gpio: 30,
            paths: [Object]
          }, {
            direction: "out",
            value: 1,
            drive: "strong",
            gpio: 0,
            paths: [Object]
          },
          [length]: 2
        ],
        paths: {
          direction: "/sys/class/gpio/gpio18/direction",
          value: "/sys/class/gpio/gpio18/value",
          drive: "/sys/class/gpio/gpio18/drive",
          exported: "/sys/class/gpio/gpio18/"
        },
        pwm: {
          duty_cycle: 0,
          gpio: 3,
          paths: {
            duty_cycle: "/sys/class/pwm/pwmchip0/pwm3/duty_cycle",
            exported: "/sys/class/pwm/pwmchip0/pwm3/",
            enable: "/sys/class/pwm/pwmchip0/pwm3/enable",
            period: "/sys/class/pwm/pwmchip0/pwm3/period"
          },
          enable: 1,
          period: 0
        }
      }

      Digital (w/o mux, pwm):
      {
        gpio: 28,
        alias: 4,
        mux: null,
        paths: {
          value: "/sys/class/gpio/gpio28/value",
          drive: "/sys/class/gpio/gpio28/drive",
          exported: "/sys/class/gpio/gpio28/",
          direction: "/sys/class/gpio/gpio28/direction"
        },
        pin: 4,
        pwm: null
      }

    - indices: an object whose keys are Arduino pins and values
                are the corresponding index in the "ports" array.

      eg.
      {
        "0": 0,
        "1": 1,
        "2": 2,
        "3": 3,
        "4": 4,
        "5": 5,
        "6": 6,
        "7": 7,
        "8": 8,
        "9": 9,
        "10": 10,
        "11": 11,
        "12": 12,
        "13": 13,
        "A0": 14,
        "A1": 15,
        "A2": 16,
        "A3": 17,
        "A4": 18,
        "A5": 19
      }
*/
function Pin(setup) {
  Emitter.call(this);

  var port = ports[indices[setup.addr]];
  var state = {};

  Object.assign(this, remapped(setup, mapping, defaults), port);

  this.isAnalog = setup.addr[0] === "A";

  // Firmata compatibility properties and values
  this.report = 0;
  this.value = 0;

  state = {
    isSetup: false,
    isPwm: false,
    direction: "out",
    mode: null
  };

  priv.set(this, state);

  this.setup();
}

Pin.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Pin
  },
  mode: {
    get: function() {
      return priv.get(this).mode;
    },
    set: function(value) {
      priv.get(this).mode = value;

      this.isPwm = value === 3 || value === 4;
    }
  },
  isPwm: {
    set: function(value) {
      priv.get(this).isPwm = value;

      // Shut down digital pin value reading
      fs.writeFile(this.paths.value, "0", noop);
    },
    get: function() {
      return priv.get(this).isPwm;
    }
  },
  direction: {
    set: function(value) {
      // TODO: throw on invalid values.
      //
      var state = priv.get(this);

      if (state.direction === value) {
        return;
      }

      var isOuput = value === "out";
      var drive = isOuput ? "strong" : "pullup";
      var direction = isOuput ? "out" : "in";

      fs.writeFile(this.paths.drive, drive, noop);
      fs.writeFile(this.paths.direction, direction, noop);
    },
    get: function() {
      return priv.get(this).direction;
    }
  }
});

Pin.prototype.write = function(value) {
  var state = priv.get(this);

  this.direction = "out";

  if (state.isPwm) {

    // if (this.mux[0] && !this.mux[0].value) {
    //   this.mux[0].value = 0;
    //   this.write(value);
    //   return;
    // }

    // if (this.mux[1] && this.mux[1].value) {
    //   this.mux[1].value = 0;
    //   this.write(value);
    //   return;
    // }

    if (this.value === 0) {
      fs.writeFile(this.paths.value, "1", noop);
    }

    this.pwm.write(value, this.mode);

  } else {
    fs.writeFile(this.paths.value, String(value), noop);
  }

  this.value = value;
};

Pin.prototype.setup = function() {
  var state = priv.get(this);
  var awaiting = [];

  if (!state.isSetup) {

    // If this pin has corresponding MUX pins
    if (this.mux) {
      this.mux.forEach(function(mux) {
        awaiting.push(mux.setup());
      }, this);
    }

    // If this pin has a corresponding PWM channel
    if (this.pwm) {
      awaiting.push(this.pwm.setup());
    }

    // If this pin is a digital pin...
    if (this.pin === this.alias) {
      awaiting.push(
        new Promise(function(resolve) {
          fs.open(this.paths.exported, "w", function(error) {
            if (error && (error.code === "ENOENT" || error.code === "EISDIR")) {
              fs.writeFile(EXPORT_PATH, String(this.gpio));
            }

            fs.writeFile(this.paths.drive, "strong", noop);
            fs.writeFile(this.paths.direction, "out", noop);
            fs.writeFile(this.paths.value, "0", noop);

            resolve();

          }.bind(this));
        }.bind(this))
      );
    }

    Promise.all(awaiting).then(function() {
      state.isSetup = true;
      this.emit("ready");
    }.bind(this));
  }

  return this;
};

module.exports = Pin;
