#yodel

##Installation
```bash
npm install git+https://git@github.com/jehy/yodel.git
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
    LogWriter    = new (require('yodel'))(config.Logging),
    log          = LogWriter.getLogger(),
    addRequestId = require('express-request-id')();
    
    
LogWriter.start();

app.use(addRequestId);
//writing application wide logs:
log.i('Express is up on port ' + config.port + ' in ' + app.settings.env + ' mode');

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
