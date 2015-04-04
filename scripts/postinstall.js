require("es6-shim");

var exec = require("child_process").exec;
var os = require("os");
var useMraa = (function() {
  var release = os.release();
  return release.includes("yocto") ||
    release.includes("edison");
})();

if (useMraa) {
  exec("npm install mraa@0.6.1-36-gbe4312e");
}
