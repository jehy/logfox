'use strict';
var cliColor      = require('colors/safe'),
    fs            = require('fs'),
    safeStringify = require('json-stringify-safe');
/**
 * Log module - Module for writing logs to console with cool colors
 * @module Log
 */
var Logger = function (logWriter, additionalData) {
  /**
   * This is for when bad stuff happens. Use this tag in places like inside a catch statement.
   * You know that an error has occurred and therefore you're config an error.
   * @name e
   * @param data
   */
  this.e = function () {
    var data = Array.prototype.slice.call(arguments);
    logWriter.log("error", data, additionalData);
  };
  /**
   * Use this when you suspect something shady is going on. You may not be completely in full on error mode,
   * but maybe you recovered from some unexpected behavior. Basically, use this to log stuff you didn't expect
   * to happen but isn't necessarily an error. Kind of like a "hey, this happened, and it's weird, we should look into it."
   * @name w
   * @param data
   */
  this.w = function () {
    var data = Array.prototype.slice.call(arguments);
    logWriter.log("warn", data, additionalData);
  };
  /**
   * Use this to post useful information to the log. For example: that you have successfully connected to a server.
   * Basically use it to report successes.
   * @name i
   * @param data
   */
  this.i = function () {
    var data = Array.prototype.slice.call(arguments);
    logWriter.log("info", data, additionalData);
  };
  /**
   * Use this for debugging purposes. If you want to print out a bunch of messages so you can log the exact flow of
   * your program, use this. If you want to keep a log of variable values, use this.
   * @name d
   * @param data
   */
  this.d = function () {
    var data = Array.prototype.slice.call(arguments);
    logWriter.log("debug", data, additionalData);
  };
  /**
   * Use this when you want to go absolutely nuts with your config.
   * If for some reason you've decided to log every little thing in a particular part of your app, use the Log.v tag.
   * @name v
   * @param data
   */
  this.v = function () {
    var data = Array.prototype.slice.call(arguments);
    logWriter.log("verbose", data, additionalData);
  };
  /**
   * Use this when you want to log things which should not be logged - like user cridentials, crazy data amounts, etc.
   * This config should be removed before pushing to production.
   * @name silly
   * @param data
   */
  this.silly = function () {
    var data = Array.prototype.slice.call(arguments);
    logWriter.log("silly", data, additionalData);
  }
};


var LogWriter = function (config) {
  this.writeStream = null;
  this.started = false;
  this.processEventsHooked = false;
  this.orderId = 1;
  this.selfLogger = null;

  this.rotate = function () {
    this.selfLogger.i('got SIGHUP, restarting logging system');
    this.restart();
    this.orderId = 1;
    this.selfLogger.i('Logging system restarted');
  };

  this.start = function () {
    this.selfLogger = this.getLogger();
    var thisLogger = this.selfLogger;
    var thisLogWriter = this;
    if (this.started) {
      this.selfLogger.e("Can not start once more - already started!");
      return;
    }
    this.started = true;
    if (config.logToFile) {
      this.writeStream = fs.createWriteStream(config.logFile, {
        flags: 'a',
        autoClose: true
      });
      this.writeStream.on('open', function () {
        thisLogger.i("Logger started");
      });
      this.writeStream.on('error', function (err) {
        console.log(cliColor.red.bold("createWriteStream error:" + err));
        process.exit(1);
      });
    }
    if (!this.processEventsHooked) {
      this.processEventsHooked = true;
      process.on('SIGHUP', function () {
        thisLogWriter.rotate();
      });
      process.on('uncaughtException', function (err) {
        thisLogger.e(err);
        setTimeout(function () {
          process.exit(1);
        }, 1000);
      });
      process.on('exit', function () {
        thisLogWriter.stop();
      });
    }
  };

  this.restart = function () {
    this.stop();
    this.start();
  };

  this.stop = function () {
    if (!this.started) {
      console.log(cliColor.red.bold("Can not stop - logger service not started"));
      return;
    }
    this.writeStream.end();
    this.started = false;
  };

  this.colorize = function (type, data) {
    switch (type) {
      case "error":
        return cliColor.red.bold(data);
        break;
      case "warn":
        return cliColor.yellow(data);
        break;
      case "info":
        return cliColor.blue(data);
        break;
      case "debug":
        return cliColor.green(data);
        break;
      case "verbose":
        return cliColor.white(data);
        break;
      case "silly":
        return cliColor.rainbow(data);
        break;
    }
  };

  this.shouldLog = function (level, configMinLvl) {
    var priority = ["error", "warn", "info", "debug", "verbose", "silly"];
    var NeedLog = priority.indexOf(configMinLvl);
    var myLog = priority.indexOf(level);
    if (myLog <= NeedLog)
      return true;
    return false;
  };

  this.isObject = function (obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  this.log = function (level, data, additionalData) {
    var recordId = this.orderId;
    this.orderId++;
    var record = {"data": [], "msg": ""};
    for (var i = 0, len = data.length; i < len; i++) {

      if (data[i] instanceof Error) {
        record.data.push({"Error": data[i].toString()});// Error in not correctly serialized to JSON otherwise
        //and it must be an object for kibana better understanding
      }
      else if (this.isObject(data[i]))
        record.data.push(data[i]);
      else {
        if (record.msg.length > 0)
          record.msg += " " + data[i];
        else
          record.msg = data[i];
      }
    }
    var logData = {
      "level": level,
      "@timestamp": (new Date()).toISOString(),
      "@message": record.msg,
      "orderId": recordId
    };
    if (additionalData != null)
      logData = Object.assign(logData, additionalData);
    if (record.data.length != 0)
      logData.data = record.data;
    if (config.logToConsole && this.shouldLog(level, config.logLevel.console)) {
      console.log(this.colorize(level, safeStringify(logData, null, 4)));
    }
    if (config.logToFile && this.shouldLog(level, config.logLevel.file) && (level != "silly")) {
      //never log silly things to file!
      logData = safeStringify(logData) + "\n";
      this.writeStream.write(logData);
    }
  };

  this.getLogger = function (additionalData) {
    return new Logger(this, additionalData);
  }
};
module.exports = LogWriter;