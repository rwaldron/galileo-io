require("es6-shim");

var exec = require("child_process").exec;
var os = require("os");
var isGalileo = (function() {
  var release = os.release();
  return release.includes("yocto") ||
    release.includes("edison");
})();

if (isGalileo) {
  exec("npm install mraa@0.5.4-110-g459ecc0");
}
