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
I2c.prototype.readBytesReg = function() {};
I2c.prototype.write = function() {
  return 0;
};
I2c.prototype.writeByte = function() {
  return 0;
};

I2c.prototype.writeReg = function() {
  return 0;
};
I2c.prototype.address = function(address) {};
I2c.prototype.frequency = function(frequency) {};

module.exports = {
  INTEL_GALILEO_GEN1: 0,
  INTEL_GALILEO_GEN2: 1,
  INTEL_EDISON_FAB_C: 2,
  INTEL_DE3815: 3,
  INTEL_MINNOWBOARD_MAX: 4,
  RASPBERRY_PI_B: 5,
  UNKNOWN_PLATFORM: 99,
  INTEL_EDISON_MINIBOARD_J17_1: 0,
  INTEL_EDISON_MINIBOARD_J17_5: 4,
  INTEL_EDISON_MINIBOARD_J17_7: 6,
  INTEL_EDISON_MINIBOARD_J17_8: 7,
  INTEL_EDISON_MINIBOARD_J17_9: 8,
  INTEL_EDISON_MINIBOARD_J17_10: 9,
  INTEL_EDISON_MINIBOARD_J17_11: 10,
  INTEL_EDISON_MINIBOARD_J17_12: 11,
  INTEL_EDISON_MINIBOARD_J17_14: 13,
  INTEL_EDISON_MINIBOARD_J18_1: 14,
  INTEL_EDISON_MINIBOARD_J18_2: 15,
  INTEL_EDISON_MINIBOARD_J18_6: 19,
  INTEL_EDISON_MINIBOARD_J18_7: 20,
  INTEL_EDISON_MINIBOARD_J18_8: 21,
  INTEL_EDISON_MINIBOARD_J18_10: 23,
  INTEL_EDISON_MINIBOARD_J18_11: 24,
  INTEL_EDISON_MINIBOARD_J18_12: 25,
  INTEL_EDISON_MINIBOARD_J18_13: 26,
  INTEL_EDISON_MINIBOARD_J19_4: 31,
  INTEL_EDISON_MINIBOARD_J19_5: 32,
  INTEL_EDISON_MINIBOARD_J19_6: 33,
  INTEL_EDISON_MINIBOARD_J19_8: 35,
  INTEL_EDISON_MINIBOARD_J19_9: 36,
  INTEL_EDISON_MINIBOARD_J19_10: 37,
  INTEL_EDISON_MINIBOARD_J19_11: 38,
  INTEL_EDISON_MINIBOARD_J19_12: 39,
  INTEL_EDISON_MINIBOARD_J19_13: 40,
  INTEL_EDISON_MINIBOARD_J19_14: 41,
  INTEL_EDISON_MINIBOARD_J20_3: 44,
  INTEL_EDISON_MINIBOARD_J20_4: 45,
  INTEL_EDISON_MINIBOARD_J20_5: 46,
  INTEL_EDISON_MINIBOARD_J20_6: 47,
  INTEL_EDISON_MINIBOARD_J20_7: 48,
  INTEL_EDISON_MINIBOARD_J20_8: 49,
  INTEL_EDISON_MINIBOARD_J20_9: 50,
  INTEL_EDISON_MINIBOARD_J20_10: 51,
  INTEL_EDISON_MINIBOARD_J20_11: 52,
  INTEL_EDISON_MINIBOARD_J20_12: 53,
  INTEL_EDISON_MINIBOARD_J20_13: 54,
  INTEL_EDISON_MINIBOARD_J20_14: 55,
  INTEL_EDISON_GP182: 0,
  INTEL_EDISON_GP135: 4,
  INTEL_EDISON_GP27: 6,
  INTEL_EDISON_GP20: 7,
  INTEL_EDISON_GP28: 8,
  INTEL_EDISON_GP111: 0,
  INTEL_EDISON_GP109: 10,
  INTEL_EDISON_GP115: 11,
  INTEL_EDISON_GP128: 13,
  INTEL_EDISON_GP13: 14,
  INTEL_EDISON_GP165: 15,
  INTEL_EDISON_GP19: 19,
  INTEL_EDISON_GP12: 20,
  INTEL_EDISON_GP183: 21,
  INTEL_EDISON_GP110: 23,
  INTEL_EDISON_GP114: 24,
  INTEL_EDISON_GP129: 25,
  INTEL_EDISON_GP130: 26,
  INTEL_EDISON_GP44: 31,
  INTEL_EDISON_GP46: 32,
  INTEL_EDISON_GP48: 33,
  INTEL_EDISON_GP131: 35,
  INTEL_EDISON_GP14: 36,
  INTEL_EDISON_GP40: 37,
  INTEL_EDISON_GP43: 38,
  INTEL_EDISON_GP77: 39,
  INTEL_EDISON_GP82: 40,
  INTEL_EDISON_GP83: 41,
  INTEL_EDISON_GP134: 44,
  INTEL_EDISON_GP45: 45,
  INTEL_EDISON_GP47: 46,
  INTEL_EDISON_GP49: 47,
  INTEL_EDISON_GP15: 48,
  INTEL_EDISON_GP84: 49,
  INTEL_EDISON_GP42: 50,
  INTEL_EDISON_GP41: 51,
  INTEL_EDISON_GP78: 52,
  INTEL_EDISON_GP79: 53,
  INTEL_EDISON_GP80: 54,
  INTEL_EDISON_GP81: 55,
  SUCCESS: 0,
  ERROR_FEATURE_NOT_IMPLEMENTED: 1,
  ERROR_FEATURE_NOT_SUPPORTED: 2,
  ERROR_INVALID_VERBOSITY_LEVEL: 3,
  ERROR_INVALID_PARAMETER: 4,
  ERROR_INVALID_HANDLE: 5,
  ERROR_NO_RESOURCES: 6,
  ERROR_INVALID_RESOURCE: 7,
  ERROR_INVALID_QUEUE_TYPE: 8,
  ERROR_NO_DATA_AVAILABLE: 9,
  ERROR_INVALID_PLATFORM: 10,
  ERROR_PLATFORM_NOT_INITIALISED: 11,
  ERROR_PLATFORM_ALREADY_INITIALISED: 12,
  ERROR_UNSPECIFIED: 99,
  PIN_VALID: 0,
  PIN_GPIO: 1,
  PIN_PWM: 2,
  PIN_FAST_GPIO: 3,
  PIN_SPI: 4,
  PIN_I2C: 5,
  PIN_AIO: 6,
  PIN_UART: 7,
  I2C_STD: 0,
  I2C_FAST: 1,
  I2C_HIGH: 2,
  MODE_STRONG: 0,
  MODE_PULLUP: 1,
  MODE_PULLDOWN: 2,
  MODE_HIZ: 3,
  DIR_OUT: 0,
  DIR_IN: 1,
  DIR_OUT_HIGH: 2,
  DIR_OUT_LOW: 3,
  EDGE_NONE: 0,
  EDGE_BOTH: 1,
  EDGE_RISING: 2,
  EDGE_FALLING: 3,
  SPI_MODE0: 0,
  SPI_MODE1: 1,
  SPI_MODE2: 2,
  SPI_MODE3: 3,
  getVersion: function() {},
  setPriority: function() {},
  getPlatformType: function() {
    // Return value must be set by test
  },
  printError: function() {},
  pinModeTest: function() {},
  adcRawBits: function() {},
  adcSupportedBits: function() {},
  getPlatformName: function() {
    return [
      "Intel Galileo Gen 1",
      "Intel Galileo Gen 2",
      "Intel Edison",
    ][this.getPlatformType()];
  },
  getPinCount: function() {
    return 20;
  },
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
