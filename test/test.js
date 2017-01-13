var assert    = require('assert'),
    fs        = require('fs'),
    LogWriter = require('../Log.js');

describe('logger', function () {

  it('should not accept wrong config (non object)', function () {

    var config = null;
    var thrown = false;
    try {
      var logWriter = new LogWriter(config);
    }
    catch (e) {
      thrown = true;
    }
    assert.equal(thrown, true);
  });


  it('should not accept wrong console config (no logLevel)', function () {

    var config = {
      "logToConsole": true,
      "logLevel": {}
    };
    var thrown = false;
    try {
      var logWriter = new LogWriter(config);
    }
    catch (e) {
      thrown = true;
    }
    assert.equal(thrown, true);
  });

  it('should not accept wrong file config (no logLevel)', function () {
    var config = {
      "logFile": "test.log",
      "logToFile": true,
      "logLevel": {}
    };
    var thrown = false;
    try {
      var logWriter = new LogWriter(config);
    }
    catch (e) {
      thrown = true;
    }
    assert.equal(thrown, true);
  });


  it('should not accept wrong file config (no file)', function () {
    var config = {
      "logToFile": true,
      "logLevel": {
        "file": "verbose"
      }
    };
    var thrown = false;
    try {
      var logWriter = new LogWriter(config);
    }
    catch (e) {
      thrown = true;
    }
    assert.equal(thrown, true);
  });


  it('should fail if log file not writable', function (done) {
    var config = {
      "logFile": "/nothing-here/nonono",
      "logToConsole": true,
      "logToFile": true,
      "logLevel": {
        "file": "verbose",
        "console": "silly"
      }
    };
    var logWriter = new LogWriter(config);
    logWriter.start();
    logWriter.on('fatal', function () {
      done()
    });
    logWriter.on('started', function () {
      logWriter.stop();
      fs.unlink(config.logFile);
      done('fail');
    });
  });


  it('should start if file is writable', function (done) {
    var config = {
      "logFile": "test1.log",
      "logToConsole": true,
      "logToFile": true,
      "logLevel": {
        "file": "verbose",
        "console": "silly"
      }
    };
    var logWriter = new LogWriter(config);
    logWriter.start();
    logWriter.on('fatal', function () {
      done('fail')
    });
    logWriter.on('started', function () {
      logWriter.stop().then(function () {
        fs.unlink(config.logFile);
        done();
      })
    });
  });

  it('log some text', function (done) {
    var config = {
      "logFile": "test2.log",
      "logToConsole": true,
      "logToFile": true,
      "logLevel": {
        "file": "verbose",
        "console": "silly"
      }
    };
    var logWriter = new LogWriter(config);
    logWriter.start();
    logWriter.on('fatal', function () {
      done('fail')
    });
    logWriter.on('started', function () {
      var logger = logWriter.getLogger();
      var logPromises = [];
      logPromises.push(logger.e('try logging error'));
      logPromises.push(logger.i('try logging info'));
      logPromises.push(logger.v('try logging verbose'));
      logPromises.push(logger.d('try logging debug'));
      logPromises.push(logger.w('try logging warning'));
      logPromises.push(logger.silly('try logging silly %)'));
      Promise.all(logPromises).then(function () {
        logWriter.stop().then(function () {
          fs.unlink(config.logFile);
          done();
        });
      });
    });
  });


  it('log some objects', function (done) {
    var config = {
      "logFile": "test3.log",
      "logToConsole": true,
      "logToFile": true,
      "logLevel": {
        "file": "verbose",
        "console": "silly"
      }
    };
    var logWriter = new LogWriter(config);
    logWriter.start();
    logWriter.on('fatal', function () {
      done('fail')
    });
    logWriter.on('started', function () {
      var logger = logWriter.getLogger();
      var sampleObject =
          {
            1: [2, 3, 4], 2: "text", 3: function () {
            return 1;
          }
          };
      logger.i(sampleObject).then(function () {
        logWriter.stop().then(function () {
          fs.unlink(config.logFile);
          done();
        })
      });
    });
  });


  it('log some text AND objects', function (done) {
    var config = {
      "logFile": "test4.log",
      "logToConsole": true,
      "logToFile": true,
      "logLevel": {
        "file": "verbose",
        "console": "silly"
      }
    };
    var logWriter = new LogWriter(config);
    logWriter.start();
    logWriter.on('fatal', function () {
      done('fail')
    });
    logWriter.on('started', function () {
      var logger = logWriter.getLogger();
      var sampleObject =
          {
            1: [2, 3, 4], 2: "text", 3: function () {
            return 1;
          }
          };
      logger.i("wow, what is this?", sampleObject).then(function () {
        logWriter.stop().then(function () {
          fs.unlink(config.logFile);
          done();
        })
      });
    });
  });

  it('check log rotate', function (done) {
    this.timeout(1000 * 4);
    var config = {
      "logFile": "test5.log",
      "logToConsole": true,
      "logToFile": true,
      "logLevel": {
        "file": "verbose",
        "console": "silly"
      }
    };
    var logWriter = new LogWriter(config);
    logWriter.start();
    logWriter.on('fatal', function () {
      done('fail')
    });
    logWriter.on('started', function () {
      var logger = logWriter.getLogger();
      var logFile2 = config.logFile + '.old';

      logger.i("data old").then(function () {
        fs.rename(config.logFile, logFile2, function (err) {
          if (err) {
            done(err);
            return;
          }

          var LogWriterNew = new LogWriter(config);
          LogWriterNew.start();
          LogWriterNew.on('fatal', function () {
            done('fail');
          });
          LogWriterNew.on('started', function () {
            setTimeout(function () {
              logWriter.stop();
              logWriter = LogWriterNew;
              logger = logWriter.getLogger();
              logger.i("data new").then(function () {
                fs.readFile(config.logFile, 'utf8', function (err, data) {
                  if (err) {
                    done(err);
                    return;
                  }
                  if (data.indexOf("data new") === -1) {
                    done("New file has no new data");
                    return;
                  }
                  console.log('New file data:' + "\n" + data);
                  fs.readFile(logFile2, 'utf8', function (err, data2) {
                    if (err) {
                      done(err);
                      return;
                    }
                    if (data2.indexOf("data old") === -1) {
                      done("old file as no old data");
                      return;
                    }
                    console.log('Old file data:' + "\n" + data2);
                    done();
                    fs.unlink(config.logFile);
                    fs.unlink(logFile2);
                  });
                });
              })
            }, 1000 * 2);
          });
        });
      });
    });
  });
});