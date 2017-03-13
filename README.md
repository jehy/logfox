# LogFox

[![Build Status](https://travis-ci.org/jehy/logfox.svg?branch=master)](https://travis-ci.org/jehy/logfox)
[![Coverage Status](https://coveralls.io/repos/github/jehy/logfox/badge.svg?branch=master)](https://coveralls.io/github/jehy/logfox?branch=master)
[![dependencies Status](https://david-dm.org/jehy/logfox/status.svg)](https://david-dm.org/jehy/logfox)
[![devDependencies Status](https://david-dm.org/jehy/logfox/dev-status.svg)](https://david-dm.org/jehy/logfox?type=dev)

## Installation
```bash
npm install logfox
```

## Usage
**config.json**
```json
{
  "Logging": {
    "logFile": "/var/log/app.log",
    "logToConsole": true,
    "logToFile": true,
    "logLevel": {
      "file": "verbose",
      "console": "silly"
    }
 }
}
```

Express app file:
```javascript
var 
    express      = require('express'),
    app          = express(),
    config       = require('./config.json'),
    logWriter    = new (require('logfox'))(config.Logging),
    log          = LogWriter.getLogger(),
    expressPassId = require('express-pass-id')(config.expressPassId);
    
    
//stop app when something bad happened to logger
logWriter.start();
logWriter.on('fatal', function () {
  app.terminate();
});
app.log = logWriter.getLogger();

//stop writing logs when app exits
process.on('exit', function () {
  logWriter.stop(true);
});


app.use(expressPassId);
//writing application logs:
app.log.i('Express is up on port ' + config.port + ' in ' + app.settings.env + ' mode');

app.use(function (req, res, next) {  
  req.log = logWriter.getLogger({requestId: req.id});
});

//writing request logs
app.post('/login', function (req, res) {
  req.log.i('Processing route /login');
});
```
## Rotating logs
App should handle it by itself, to force log writer to update file (for example if you rotated it),
 send it `kill -1 PID` (`SIGHUP`) and add code like this:
 
```javascript
process.on('SIGHUP', function () {
  var LogWriterNew = new logWriter(config.Logging);
  LogWriterNew.start();
  LogWriterNew.on('fatal', function () {
    app.terminate();
  });

  LogWriterNew.on('started', function () {
    var logWriterOld = logWriter;
    logWriter = LogWriterNew;
    app.log = logWriter.getLogger();
    setTimeout(function () {
      logWriterOld.stop();
    })
  }, 1000 * 60);
});
```
## What can we log?
You can log any number of string and objects. String will be concatinated in `message`,
objects will be joined as array `data` and serialized to JSON.

## Loggings statuses

### e (error)
This is for when bad stuff happens. Use this tag in places like inside a catch statement.
You know that an error has occurred and therefore you're config an error.

### w (warning)
Use this when you suspect something shady is going on. You may not be completely in full on error mode,
but maybe you recovered from some unexpected behavior. Basically, use this to log stuff you didn't expect
to happen but isn't necessarily an error. Kind of like a 'hey, this happened, and it's weird, we should look into it.'

### i (info)
Use this to post useful information to the log. For example: that you have successfully connected to a server.
Basically use it to report successes.

### d (debug)
Use this for debugging purposes. If you want to print out a bunch of messages so you can log the exact flow of
your program, use this. If you want to keep a log of variable values, use this.

### v (verbose)
Use this when you want to go absolutely nuts with your config.
If for some reason you've decided to log every little thing in a particular part of your app, use the Log.v tag.

### silly
Use this when you want to log things which should not be logged - like user cridentials, crazy data amounts, etc.
This config should be removed before pushing to production.
