/* eslint-disable no-console*/

const cliColor      = require('colors/safe'),
      fs            = require('fs'),
      safeStringify = require('json-stringify-safe'),
      Promise       = require('bluebird'),
      EventEmitter  = require('events');


/**
 * Log module - Module for writing logs to console with cool colors
 * @module Log
 */


const has = (obj, key)=>obj != null && hasOwnProperty.call(obj, key);
const isObject = (obj)=> {
  const type = typeof obj;
  return type === 'function' || (type === 'object' && !!obj);
};
const logLevels = {error: 'error', warn: 'warn', info: 'info', debug: 'debug', verbose: 'verbose', silly: 'silly'};
const priority = [logLevels.error, logLevels.warn, logLevels.info, logLevels.debug, logLevels.verbose, logLevels.silly];

const colorize = (type, data)=> {
  switch (type) {
    case 'error':
      return cliColor.red.bold(data);
    case 'warn':
      return cliColor.yellow(data);
    case 'info':
      return cliColor.blue(data);
    case 'debug':
      return cliColor.green(data);
    case 'verbose':
      return cliColor.white(data);
    case 'silly':
      return cliColor.rainbow(data);
    /* istanbul ignore next */
    default:
      throw new Error(`Wrong logging type ${type}`);
  }
};

const shouldLog = (level, configMinLvl)=> {
  const NeedLog = priority.indexOf(configMinLvl);
  const myLog = priority.indexOf(level);
  return (myLog <= NeedLog);
};


class Logger {
  constructor(logWriter, additionalData) {
    this.logWriter = logWriter;
    this.additionalData = additionalData;
  }

  /**
   * This is for when bad stuff happens. Use this tag in places like inside a catch statement.
   * You know that an error has occurred and therefore you're config an error.
   * @name e
   * @param args
   * @return {Promise} success or fail
   */
  e(...args) {
    return this.logWriter.log(logLevels.error, args, this.additionalData);
  }

  /**
   * Use this when you suspect something shady is going on. You may not be completely in full on error mode,
   * but maybe you recovered from some unexpected behavior. Basically, use this to log stuff you didn't expect
   * to happen but isn't necessarily an error.
   * Kind of like a 'hey, this happened, and it's weird, we should look into it.'
   * @name w
   * @param args
   * @return {Promise} success or fail
   */
  w(...args) {
    return this.logWriter.log(logLevels.warn, args, this.additionalData);
  }

  /**
   * Use this to post useful information to the log. For example: that you have successfully connected to a server.
   * Basically use it to report successes.
   * @name i
   * @param args
   * @return {Promise} success or fail
   */
  i(...args) {
    return this.logWriter.log(logLevels.info, args, this.additionalData);
  }

  /**
   * Use this for debugging purposes. If you want to print out a bunch of messages so you can log the exact flow of
   * your program, use this. If you want to keep a log of variable values, use this.
   * @name d
   * @param args
   * @return {Promise} success or fail
   */
  d(...args) {
    return this.logWriter.log(logLevels.debug, args, this.additionalData);
  }

  /**
   * Use this when you want to go absolutely nuts with your config.
   * If for some reason you've decided to log every little thing in a particular part of your app, use the Log.v tag.
   * @name v
   * @param args
   * @return {Promise} success or fail
   */
  v(...args) {
    return this.logWriter.log(logLevels.verbose, args, this.additionalData);
  }

  /**
   * Use this when you want to log things which should not be logged - like user cridentials, crazy data amounts, etc.
   * This config should be removed before pushing to production.
   * @name silly
   * @param args
   * @return {Promise} success or fail
   */
  silly(...args) {
    return this.logWriter.log(logLevels.silly, args, this.additionalData);
  }
}


class LogWriter extends EventEmitter {
  constructor(config = {}) {
    super();
    this.writeStream = null;
    this.started = false;
    this.orderId = 1;
    this.selfLogger = null;


    if (!isObject(config)) {
      this.emit('fatal');
      throw new Error('Invalid config for logfox (not an object)');
    }
    if (config === undefined) {
      this.emit('fatal');
      throw new Error('Invalid config for logfox (undefined)');
    }
    if (config === null) {
      this.emit('fatal');
      throw new Error('Invalid config for logfox (null)');
    }
    if (config.logToFile && (!config.logFile || !has(config, 'logLevel') || !config.logLevel.file)) {
      this.emit('fatal');
      throw new Error('Invalid config for logfox (wrong file logging config)');
    }
    if (config.logToConsole && (!has(config, 'logLevel') || !config.logLevel.console)) {
      this.emit('fatal');
      throw new Error('Invalid config for logfox (wrong console logging config)');
    }

    if (config.logToFile && (priority.indexOf(config.logLevel.file) === -1)) {
      this.emit('fatal');
      throw new Error(`Invalid config for logfox (logging level can not be ${
        config.logLevel.file}, it should be one of [${priority.toString()}])`);
    }

    if (config.logToConsole && (priority.indexOf(config.logLevel.console) === -1)) {
      this.emit('fatal');
      throw new Error(`Invalid config for logfox (logging level can not be ${
        config.logLevel.console}, it should be one of [${priority.toString()}])`);
    }
    this.config = config;
  }

  start() {
    this.selfLogger = this.getLogger();
    const thisLogger = this.selfLogger;
    const thisLogWriter = this;

    return new Promise((resolve, reject) => {
      if (thisLogWriter.started) {
        const msg = 'Can not start once more - already started!';
        thisLogWriter.selfLogger.e(msg);
        reject(msg);
        return;
      }
      // console.log(cliColor.blue('Starting logging system'));
      if (!this.config.logToFile) {
        thisLogWriter.started = true;
        resolve();
        return;
      }
      thisLogWriter.writeStream = fs.createWriteStream(this.config.logFile, {
        flags: 'a',
        autoClose: true,
      });
      thisLogWriter.writeStream.on('open', () => {
        thisLogWriter.started = true;
        thisLogger.i('Logger started');
        thisLogWriter.emit('started');
        resolve();
      });
      thisLogWriter.writeStream.on('error', (err) => {
        const msg = `createWriteStream error: ${err}`;
        console.log(cliColor.red.bold(msg));
        thisLogWriter.emit('fatal');
        reject(msg);
      });

    });
  }

  stop(quiet) {
    const thisLogWriter = this;
    return new Promise((resolve) => {
      // console.log(cliColor.blue('Stopping Logging system'));
      if (!thisLogWriter.started) {
        if (!quiet) {
          console.log(cliColor.red.bold('Can not stop - logger service not started'));
        }
        resolve();
        return;
      }
      thisLogWriter.writeStream.on('finish', () => {
        // console.log(cliColor.blue('Logging system stopped'));
        resolve();
      });
      thisLogWriter.writeStream.end();
      thisLogWriter.started = false;
    });
  }


  log(level, data, additionalData) {

    const thisLogWriter = this;
    return new Promise((resolve, reject) => {


      if (thisLogWriter.started === false) {
        thisLogWriter.emit('fatal');
        const msg = `logfox can not write log with stopped logwriter(${level}:${safeStringify(data)})`;
        reject(msg);
        throw new Error(msg);
      }

      if (!this.config.logToFile && !this.config.logToConsole) {
        reject('Not configured for logging');
        return;
      }
      const recordId = thisLogWriter.orderId;
      thisLogWriter.orderId++;
      const record = {data: [], msg: ''};
      for (let i = 0, len = data.length; i < len; i++) {

        if (data[i] instanceof Error) {
          // Error in not correctly serialized to JSON otherwise
          record.data.push({Error: data[i].toString(), Stack: data[i].stack});
          // and it must be an object for kibana better understanding
        } else if (data[i] instanceof Array) { // for logstash which does not like arrays o_O
          record.data.push({Array: data[i]});
        } else if (isObject(data[i])) {
          record.data.push(data[i]);
        } else if (record.msg.length > 0) {
          record.msg += ` ${data[i]}`;
        } else {
          record.msg = data[i];
        }
      }
      if (record.msg.length === 0) {
        record.msg = 'No message';
      }
      let logData = {
        level,
        '@timestamp': (new Date()).toISOString(),
        '@message': record.msg,
        orderId: recordId,
      };
      if (additionalData != null) {
        logData = Object.assign(logData, additionalData);
      }
      if (record.data.length !== 0) {
        logData.data = record.data;
      }
      if (this.config.logToConsole && shouldLog(level, this.config.logLevel.console)) {
        console.log(colorize(level, safeStringify(logData, null, 4)));
      }
      if (this.config.logToFile && shouldLog(level, this.config.logLevel.file) && (level !== 'silly')) {
        // never log silly things to file!
        logData = `${safeStringify(logData)}\n`;
        thisLogWriter.writeStream.write(logData);
        resolve();
      } else resolve();
    });
  }

  /**
   *
   * @param additionalData some data to add to request (user ip, for example)
   * @return {Logger} new logger object which you can you use for logging itself
   */
  getLogger(additionalData) {
    return new Logger(this, additionalData);
  }
}

module.exports = LogWriter;
