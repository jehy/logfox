'use strict';
var cliColor      = require('colors/safe'),
    fs            = require('fs'),
    safeStringify = require('json-stringify-safe'),
    Promise       = require('bluebird'),
    objectAssign  = require('object-assign');
EventEmitter = require('events');


/**
 * Log module - Module for writing logs to console with cool colors
 * @module Log
 */


var has = function (obj, key) {
  return obj != null && hasOwnProperty.call(obj, key);
};

var isObject = function (obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
};

var Logger = function (logWriter, additionalData) {
  /**
   * This is for when bad stuff happens. Use this tag in places like inside a catch statement.
   * You know that an error has occurred and therefore you're config an error.
   * @name e
   * @param data
   * @return {Promise} success or fail
   */
  this.e = function () {
    var data = Array.prototype.slice.call(arguments);
    return logWriter.log('error', data, additionalData);
  };
  /**
   * Use this when you suspect something shady is going on. You may not be completely in full on error mode,
   * but maybe you recovered from some unexpected behavior. Basically, use this to log stuff you didn't expect
   * to happen but isn't necessarily an error. Kind of like a 'hey, this happened, and it's weird, we should look into it.'
   * @name w
   * @param data
   * @return {Promise} success or fail
   */
  this.w = function () {
    var data = Array.prototype.slice.call(arguments);
    return logWriter.log('warn', data, additionalData);
  };
  /**
   * Use this to post useful information to the log. For example: that you have successfully connected to a server.
   * Basically use it to report successes.
   * @name i
   * @param data
   * @return {Promise} success or fail
   */
  this.i = function () {
    var data = Array.prototype.slice.call(arguments);
    return logWriter.log('info', data, additionalData);
  };
  /**
   * Use this for debugging purposes. If you want to print out a bunch of messages so you can log the exact flow of
   * your program, use this. If you want to keep a log of variable values, use this.
   * @name d
   * @param data
   * @return {Promise} success or fail
   */
  this.d = function () {
    var data = Array.prototype.slice.call(arguments);
    return logWriter.log('debug', data, additionalData);
  };
  /**
   * Use this when you want to go absolutely nuts with your config.
   * If for some reason you've decided to log every little thing in a particular part of your app, use the Log.v tag.
   * @name v
   * @param data
   * @return {Promise} success or fail
   */
  this.v = function () {
    var data = Array.prototype.slice.call(arguments);
    return logWriter.log('verbose', data, additionalData);
  };
  /**
   * Use this when you want to log things which should not be logged - like user cridentials, crazy data amounts, etc.
   * This config should be removed before pushing to production.
   * @name silly
   * @param data
   * @return {Promise} success or fail
   */
  this.silly = function () {
    var data = Array.prototype.slice.call(arguments);
    return logWriter.log('silly', data, additionalData);
  }
};


var LogWriter = function (config) {
  this.writeStream = null;
  this.started = false;
  this.orderId = 1;
  this.selfLogger = null;


  if (!isObject(config)) {
    this.emit('fatal');
    throw new Error('Invalid config for logfox (not an object)');
  }
  if (config.logToFile && (!config.logFile || !has(config, 'logLevel') || !config.logLevel.file)) {
    this.emit('fatal');
    throw new Error('Invalid config for logfox (wrong file logging config)');
  }
  if (config.logToConsole && (!has(config, 'logLevel') || !config.logLevel.console)) {
    this.emit('fatal');
    throw new Error('Invalid config for logfox (wrong console logging config)');
  }


  this.start = function () {
    this.selfLogger = this.getLogger();
    var thisLogger = this.selfLogger;
    var thisLogWriter = this;

    return new Promise(function (resolve, reject) {
      if (thisLogWriter.started) {
        thisLogWriter.selfLogger.e('Can not start once more - already started!');
        reject();
        return;
      }
      console.log(cliColor.blue('Starting logging system'));
      if (config.logToFile) {
        thisLogWriter.writeStream = fs.createWriteStream(config.logFile, {
          flags: 'a',
          autoClose: true
        });
        thisLogWriter.writeStream.on('open', function () {
          thisLogger.i('Logger started');
          thisLogWriter.started = true;
          thisLogWriter.emit('started');
          resolve();
        });
        thisLogWriter.writeStream.on('error', function (err) {
          console.log(cliColor.red.bold('createWriteStream error:' + err));
          thisLogWriter.emit('fatal');
          reject();
        });
      }
    });
  };

  this.stop = function (quiet) {
    var thisLogWriter = this;
    return new Promise(function (resolve, reject) {
      console.log(cliColor.blue('Stopping Logging system'));
      if (!thisLogWriter.started) {
        if (!quiet) {
          console.log(cliColor.red.bold('Can not stop - logger service not started'));
        }
        resolve();
        return;
      }
      thisLogWriter.writeStream.end();
      thisLogWriter.started = false;
      thisLogWriter.writeStream.on('finish', function () {
        console.log(cliColor.blue('Logging system stopped'));
        resolve();
      });
    });
  };

  this.colorize = function (type, data) {
    switch (type) {
      case 'error':
        return cliColor.red.bold(data);
        break;
      case 'warn':
        return cliColor.yellow(data);
        break;
      case 'info':
        return cliColor.blue(data);
        break;
      case 'debug':
        return cliColor.green(data);
        break;
      case 'verbose':
        return cliColor.white(data);
        break;
      case 'silly':
        return cliColor.rainbow(data);
        break;
    }
  };

  this.shouldLog = function (level, configMinLvl) {
    var priority = ['error', 'warn', 'info', 'debug', 'verbose', 'silly'];
    var NeedLog = priority.indexOf(configMinLvl);
    var myLog = priority.indexOf(level);
    if (myLog <= NeedLog)
      return true;
    return false;
  };


  this.log = function (level, data, additionalData) {

    var thisLogWriter = this;
    return new Promise(function (resolve, reject) {
      if (!config.logToFile && !config.logToConsole) {
        reject('Not configured for logging');
        return;
      }
      var recordId = thisLogWriter.orderId;
      thisLogWriter.orderId++;
      var record = {'data': [], 'msg': ''};
      for (var i = 0, len = data.length; i < len; i++) {

        if (data[i] instanceof Error) {
          record.data.push({'Error': data[i].toString(), 'Stack': data[i].stack});// Error in not correctly serialized to JSON otherwise
          //and it must be an object for kibana better understanding
        }
        else if (data[i] instanceof Array) {//for logstash whuch does not like arrays o_O
          record.data.push(objectAssign({}, data[i]));
        }
        else if (isObject(data[i]))
          record.data.push(data[i]);
        else {
          if (record.msg.length > 0)
            record.msg += ' ' + data[i];
          else
            record.msg = data[i];
        }
      }
      if (record.msg.length === 0)
        record.msg = 'No message';
      var logData = {
        'level': level,
        '@timestamp': (new Date()).toISOString(),
        '@message': record.msg,
        'orderId': recordId
      };
      if (additionalData != null)
        logData = Object.assign(logData, additionalData);
      if (record.data.length != 0)
        logData.data = record.data;
      if (config.logToConsole && thisLogWriter.shouldLog(level, config.logLevel.console)) {
        console.log(thisLogWriter.colorize(level, safeStringify(logData, null, 4)));
      }
      if (config.logToFile && thisLogWriter.shouldLog(level, config.logLevel.file) && (level != 'silly')) {
        //never log silly things to file!
        logData = safeStringify(logData) + "\n";
        thisLogWriter.writeStream.write(logData);
        resolve();
      }
      else resolve();
    });
  };

  this.getLogger = function (additionalData) {
    return new Logger(this, additionalData);
  }
};
LogWriter.prototype.__proto__ = EventEmitter.EventEmitter.prototype;

module.exports = LogWriter;