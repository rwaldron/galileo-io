// System Objects
var cp = require("child_process");
var path = require("path");

// Third Party Dependencies
var tags = require("common-tags");
var glob = require("glob");


module.exports = function(grunt) {

  var task = grunt.task;
  var file = grunt.file;
  var log = grunt.log;
  var verbose = grunt.verbose;
  var fail = grunt.fail;
  var option = grunt.option;
  var config = grunt.config;
  var template = grunt.template;
  var _ = grunt.util._;


  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    nodeunit: {
      tests: [
        "test/index.js",
        "test/joule.js",
        "test/pin.js",
        "test/not-implemented.js"
      ]
    },
    jshint: {
      options: {
        latedef: false,
        curly: true,
        eqeqeq: true,
        immed: true,
        newcap: false,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true,
        strict: false,
        esnext: true,
        globals: {
          rewire: true,
          exports: true,
          document: true,
          Promise: true,
          WeakMap: true,
          Map: true,
          window: true,
          IS_TEST_MODE: true
        }
      },
      files: {
        src: [
          "Gruntfile.js",
          "lib/**/*.js",
          "test/**/*.js",
          "eg/**/*.js"
        ]
      }
    },

    jsbeautifier: {
      files: ["lib/**/*.js", "eg/**/*.js", "test/**/*.js"],
      options: {
        js: {
          braceStyle: "collapse",
          breakChainedMethods: false,
          e4x: false,
          evalCode: false,
          indentChar: " ",
          indentLevel: 0,
          indentSize: 2,
          indentWithTabs: false,
          jslintHappy: false,
          keepArrayIndentation: false,
          keepFunctionIndentation: false,
          maxPreserveNewlines: 10,
          preserveNewlines: true,
          spaceBeforeConditional: true,
          spaceInParen: false,
          unescapeStrings: false,
          wrapLineLength: 0
        }
      }
    },
    watch: {
      src: {
        files: [
          "Gruntfile.js",
          "lib/**/!(johnny-five)*.js",
          "test/**/*.js",
          "eg/**/*.js"
        ],
        tasks: ["default"],
        options: {
          interrupt: true,
        },
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-nodeunit");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-jsbeautifier");

  grunt.registerTask("default", ["jshint", "nodeunit"]);
  grunt.registerTask('nodeunit:file', 'Run a subset of tests by specifying a file name or glob expression. Usage: "grunt nodeunit:file:<file.ext>" or "grunt nodeunit:file:<expr>"', (input) => {

    var config = [];

    if (input) {
      if (!input.endsWith('.js')) {
        if (!input.endsWith('*') || !input.endsWith('**/*')) {
          input = `{${path.normalize(input + '*')},${path.normalize(input + '**/*')}}`;
        }
      }

      var expr = 'test/' + input;
      var inputs = glob.sync(expr).filter((file) => file.endsWith('.js'));

      if (inputs) {
        inputs.forEach(input => config.push(input));
        grunt.config('nodeunit.tests', config);
      }
    }

    grunt.task.run('nodeunit');
  });


  grunt.registerTask('nodeunit:files', 'Run a subset of tests by specifying a file name, bracket list of file names, or glob expression. Usage: "grunt nodeunit:file:<file.ext>" or "grunt nodeunit:file:<expr>"', (file) => {
    grunt.task.run('nodeunit:file:' + file);
  });
};


