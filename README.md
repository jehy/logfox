#LogFox

[![Build Status](https://travis-ci.org/jehy/logfox.svg?branch=master)](https://travis-ci.org/jehy/logfox)

##Installation
```bash
npm install logfox
```

##Usage
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
    addRequestId = require('express-request-id')();
    
    

logWriter.start();
logWriter.on('fatal', function () {
  app.terminate();
});
app.log = logWriter.getLogger();

process.on('exit', function () {
  logWriter.stop(true);
});


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

app.use(addRequestId);
//writing application wide logs:
app.log.i('Express is up on port ' + config.port + ' in ' + app.settings.env + ' mode');

app.use(function (req, res, next) {
  //get or set request id
  if (_.has(req.headers, 'x-my-id'))
    req.id = req.headers['x-my-id'];
  else
    req.id = "moduleName1:" + req.id;  
  req.passHeaders = {'x-my-id': req.id};//do not forget to pass this header to other services!
  req.log = LogWriter.getLogger({requestId: req.id});//will be passed to every route
});

//writing request wide logs
app.post('/login', function (req, res) {
  req.log.i('Processing route /login');
});
```

To force log writer to update file (for example if you rotated it),
 send it `kill -1 PID` (SIGHUP).
