var assert    = require('assert'),
    fsp       = require('fs-promise'),
    Promise   = require('bluebird'),
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
    logWriter.start().catch(function () {
    });
    logWriter.on('fatal', function () {
      done()
    });
    logWriter.on('started', function () {
      logWriter.stop()
        .then(function () {
          fsp.unlink(config.logFile);
          done('fail');
        })
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
      logWriter.stop()
        .then(function () {
          return fsp.unlink(config.logFile);
        })
        .then(function () {
          done();
        })
        .catch(function (err) {
          done(err)
        })
    });
  });

  it('should log text', function (done) {
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
      Promise.all(logPromises)
        .then(function () {
          return logWriter.stop();
        })
        .then(function () {
          return fsp.unlink(config.logFile);
        })
        .then(function () {
          done();
        })
        .catch(function (err) {
          done(err)
        })
    });
  });


  it('should log objects', function (done) {
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
      logger.i(sampleObject)
        .then(function () {
          return logWriter.stop();
        })
        .then(function () {
          return fsp.unlink(config.logFile);
        })
        .then(function () {
          done();
        })
        .catch(function (err) {
          done(err)
        })
    });
  });


  it('should log text AND objects', function (done) {
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
      logger.i("wow, what is this?", sampleObject)
        .then(function () {
          return logWriter.stop();
        })
        .then(function () {
          return fsp.unlink(config.logFile);
        })
        .then(function () {
          done();
        })
        .catch(function (err) {
          done(err)
        })
    });
  });

  it('should be able to rotate logs', function (done) {
    this.timeout(1000 * 4);
    var config = {
      "logFile": "test5.log",
      "logToConsole": false,
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

      logger.i("data old")
        .then(function () {
          return fsp.rename(config.logFile, logFile2)
        })
        .then(function () {
          var LogWriterNew = new LogWriter(config);
          LogWriterNew.start();
          LogWriterNew.on('fatal', function () {
            done('fail');
          });
          LogWriterNew.on('started', function () {
            var logWriterOld = logWriter;
            logWriter = LogWriterNew;
            logger = logWriter.getLogger();
            Promise.resolve()
              .timeout(1000 * 2)
              .then(function () {
                logWriterOld.stop();
                return logger.i("data new");
              })
              .then(function () {
                return fsp.readFile(config.logFile, 'utf8');
              })
              .then(function (data) {
                if (data.indexOf("data new") === -1) {
                  throw("New file has no new data");
                }
                //console.log('New file data:' + "\n" + data);
                return fsp.readFile(logFile2, 'utf8');
              })
              .then(function (data2) {
                if (data2.indexOf("data old") === -1) {
                  throw("old file as no old data");
                }
                //console.log('Old file data:' + "\n" + data2);
                return Promise.all([fsp.unlink(config.logFile), fsp.unlink(logFile2)]);
              })
              .then(function () {
                  done();
                }
              )
              .catch(function (err) {
                done(err)
              });
          });
        })
        .catch(function (err) {
          done(err)
        });
    });
  });


  it('should not log silly log level text', function (done) {
    var config = {
      "logFile": "test6.log",
      "logToConsole": false,
      "logToFile": true,
      "logLevel": {
        "file": "silly",
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
      logger.silly('try logging silly %)')
        .then(function () {
          return logWriter.stop()
        })
        .then(function () {
          return fsp.readFile(config.logFile, 'utf8');
        })
        .then(function (data) {
          if (data.indexOf("silly") !== -1) {
            throw("Silly things were logged");
          }
        })
        .then(function () {
          done();
        })
        .catch(function (err) {
          done(err)
        })
        .finally(function () {
          fsp.unlink(config.logFile);
        })

    });
  });


  it('should throw error if writing when log writer stopped', function (done) {
    var config = {
      "logFile": "test7.log",
      "logToConsole": false,
      "logToFile": true,
      "logLevel": {
        "file": "silly",
        "console": "silly"
      }
    };
    var logWriter = new LogWriter(config);
    logWriter.start()
      .then(function () {
        return logWriter.stop();
      })
      .then(function () {
        var logger = logWriter.getLogger();
        return logger.w("try log smth");
      })
      .then(function () {
        done('did not throw!');
      })
      .catch(function () {

      })
      .finally(function () {
        fsp.unlink(config.logFile);
      });
    logWriter.on('fatal', function () {
      done()
    });
  });

  it('should throw error if writing when log writer not started', function (done) {
    var config = {
      "logFile": "test8.log",
      "logToConsole": false,
      "logToFile": true,
      "logLevel": {
        "file": "silly",
        "console": "silly"
      }
    };
    var logWriter = new LogWriter(config);
    var logger = logWriter.getLogger();
    logWriter.on('fatal', function () {
      done();
    });
    logger.w("try log smth")
      .then(function () {
        done('did not throw');
      })
      .catch(function () {

      });
  });
})
;