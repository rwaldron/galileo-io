function Gpio(pin) {}
Gpio.prototype.read = function() {
  return this.read.override !== null ?
    this.read.override :
    Math.round(Math.random() * 1);

};
Gpio.prototype.read.override = null;
Gpio.prototype.write = function() {};
Gpio.prototype.useMmap = function(bool) {};
Gpio.prototype.dir = function(dir) {
  // MRAA_SUCCESS: 0,
  return 0;
};

function Aio(pin) {}
Aio.prototype.read = function() {
  return this.read.override !== null ?
    this.read.override :
    Math.round(Math.random() * 1023);
};
Aio.prototype.read.override = null;
Aio.prototype.write = function() {};

function Pwm(pin) {}
Pwm.prototype.read = function() {};
Pwm.prototype.write = function() {};
Pwm.prototype.period = function(period) {};
Pwm.prototype.period_ms = function(ms) {};
Pwm.prototype.period_us = function(us) {};
Pwm.prototype.pulsewidth = function(seconds) {};
Pwm.prototype.pulsewidth_ms = function(ms) {};
Pwm.prototype.pulsewidth_us = function(us) {};
Pwm.prototype.enable = function(enable) {};

function I2c(bus) {}
I2c.prototype.read = function() {};
I2c.prototype.write = function() {
  return 0;
};
I2c.prototype.writeReg = function() {
  return 0;
};
I2c.prototype.address = function(address) {};
I2c.prototype.frequency = function(frequency) {};

module.exports = {
  MRAA_INTEL_GALILEO_GEN1: 0,
  MRAA_INTEL_GALILEO_GEN2: 1,
  MRAA_INTEL_EDISON_FAB_C: 2,
  MRAA_UNKNOWN_PLATFORM: 99,
  MRAA_SUCCESS: 0,
  MRAA_ERROR_FEATURE_NOT_IMPLEMENTED: 1,
  MRAA_ERROR_FEATURE_NOT_SUPPORTED: 2,
  MRAA_ERROR_INVALID_VERBOSITY_LEVEL: 3,
  MRAA_ERROR_INVALID_PARAMETER: 4,
  MRAA_ERROR_INVALID_HANDLE: 5,
  MRAA_ERROR_NO_RESOURCES: 6,
  MRAA_ERROR_INVALID_RESOURCE: 7,
  MRAA_ERROR_INVALID_QUEUE_TYPE: 8,
  MRAA_ERROR_NO_DATA_AVAILABLE: 9,
  MRAA_ERROR_INVALID_PLATFORM: 10,
  MRAA_ERROR_PLATFORM_NOT_INITIALISED: 11,
  MRAA_ERROR_PLATFORM_ALREADY_INITIALISED: 12,
  MRAA_ERROR_UNSPECIFIED: 99,
  MODE_STRONG: 0,
  MODE_PULLUP: 1,
  MODE_PULLDOWN: 2,
  MODE_HIZ: 3,
  DIR_OUT: 0,
  DIR_IN: 1,
  EDGE_NONE: 0,
  EDGE_BOTH: 1,
  EDGE_RISING: 2,
  EDGE_FALLING: 3,
  getVersion: function() {},
  setPriority: function() {},
  getPlatformType: function() {},
  printError: function() {},
  pinModeTest: function() {},
  adcRawBits: function() {},
  adcSupportedBits: function() {},
  setLogLevel: function() {},
  mraa_set_priority: function() {},
  mraa_get_version: function() {},
  mraa_result_print: function() {},
  mraa_get_platform_type: function() {},
  Gpio: Gpio,
  I2c: I2c,
  Pwm: Pwm,
  Aio: Aio
};
