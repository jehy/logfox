/* eslint-disable no-console*/
/* eslint-disable no-unused-vars*/

const assert    = require('assert'),
      fsp       = require('fs-promise'),
      Promise   = require('bluebird'),
      LogWriter = require('../Log.js');

const majorVersion = parseInt(process.versions.node.split('.')[0], 10);
if (majorVersion <= 5) {
  console.log(`Using transpiled version of code and tests for your node version (${majorVersion})`);
} else {
  console.log(`Using non transpiled version of code and tests for your node version (${majorVersion})`);
}

describe('logger', () => {

  it('should not accept wrong config (non object)', () => {

    const config = null;
    return new Promise((resolve, reject)=> {
      try {
        const logWriter = new LogWriter(config);
      } catch (e) {
        resolve();
      }
      reject();
    });
  });


  it('should not accept wrong console config (no logLevel)', () => {

    const config = {
      logToConsole: true,
      logLevel: {},
    };
    return new Promise((resolve, reject)=> {
      try {
        const logWriter = new LogWriter(config);
      } catch (e) {
        resolve();
      }
      reject();
    });
  });

  it('should not accept wrong file config (no logLevel)', () => {
    const config = {
      logFile: 'test.log',
      logToFile: true,
      logLevel: {},
    };
    return new Promise((resolve, reject)=> {
      try {
        const logWriter = new LogWriter(config);
      } catch (e) {
        resolve();
      }
      reject();
    });
  });


  it('should not accept wrong file config (no file)', () => {
    const config = {
      logToFile: true,
      logLevel: {
        file: 'verbose',
      },
    };
    return new Promise((resolve, reject)=> {
      try {
        const logWriter = new LogWriter(config);
      } catch (e) {
        resolve();
      }
      reject();
    });
  });


  it('should not accept wrong file config (wrong file log level)', () => {
    const config = {
      logToFile: true,
      logLevel: {
        file: 'omg',
      },
    };
    return new Promise((resolve, reject)=> {
      try {
        const logWriter = new LogWriter(config);
      } catch (e) {
        resolve();
      }
      reject();
    });
  });

  it('should not accept wrong file config (wrong console log level)', () => {
    const config = {
      logToConsole: true,
      logLevel: {
        console: 'omg',
      },
    };
    return new Promise((resolve, reject)=> {
      try {
        const logWriter = new LogWriter(config);
      } catch (e) {
        resolve();
      }
      reject();
    });
  });


  it('should fail if log file not writable', () => {
    const config = {
      logFile: '/nothing-here/nonono',
      logToConsole: true,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start().catch(() => {
      });
      logWriter.on('fatal', () => {
        resolve();
      });
      logWriter.on('started', () => {
        logWriter.stop()
          .then(() => {
            fsp.unlink(config.logFile);
            reject('fail');
          });
      });
    });
  });


  it('should start if file is writable', () => {
    const config = {
      logFile: 'test1.log',
      logToConsole: true,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        logWriter.stop()
          .then(() => fsp.unlink(config.logFile))
          .then(() => {
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });
    });
  });

  it('should log text', () => {
    const config = {
      logFile: 'test2.log',
      logToConsole: true,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        const logger = logWriter.getLogger();
        const logPromises = [];
        logPromises.push(logger.e('try logging error'));
        logPromises.push(logger.i('try logging info'));
        logPromises.push(logger.v('try logging verbose'));
        logPromises.push(logger.d('try logging debug'));
        logPromises.push(logger.w('try logging warning'));
        logPromises.push(logger.silly('try logging silly %)'));
        Promise.all(logPromises)
          .then(() => logWriter.stop())
          .then(() => fsp.unlink(config.logFile))
          .then(() => resolve());
      });
    });
  });


  it('should log objects', () => {
    const config = {
      logFile: 'test3.log',
      logToConsole: true,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        const logger = logWriter.getLogger();
        const sampleObject =
              {
                1: [2, 3, 4],
                2: 'text',
                3() {
                  return 1;
                },
              };
        logger.i(sampleObject)
          .then(() => logWriter.stop())
          .then(() => fsp.unlink(config.logFile))
          .then(() => resolve());
      });
    });
  });


  it('should log text AND objects', () => {
    const config = {
      logFile: 'test4.log',
      logToConsole: true,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        const logger = logWriter.getLogger();
        const sampleObject =
              {
                1: [2, 3, 4],
                2: 'text',
                3() {
                  return 1;
                },
              };
        logger.i('wow, what is this?', sampleObject)
          .then(() => logWriter.stop())
          .then(() => fsp.unlink(config.logFile))
          .then(() => resolve());
      });
    });
  });

  it('should be able to rotate logs', function testRotate() {
    this.timeout(1000 * 4);
    const config = {
      logFile: '/tmp/test5.log',
      logToConsole: false,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      let logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        let logger = logWriter.getLogger();
        const logFile2 = `${config.logFile}.old`;

        logger.i('data old')
          .then(() => fsp.rename(config.logFile, logFile2))
          .then(() => {
            const LogWriterNew = new LogWriter(config);
            LogWriterNew.start();
            LogWriterNew.on('fatal', () => {
              reject('fatal');
            });
            LogWriterNew.on('started', () => {
              const logWriterOld = logWriter;
              logWriter = LogWriterNew;
              logger = logWriter.getLogger();
              Promise.resolve()
                .delay(1000)
                .then(() => {
                  logWriterOld.stop();
                  return logger.i('data new');
                })
                .then(() => fsp.readFile(config.logFile, 'utf8'))
                .then((data) => {
                  if (data.indexOf('data new') === -1) {
                    throw new Error('New file has no new data');
                  }
                  // console.log('New file data:' + "\n" + data);
                  return fsp.readFile(logFile2, 'utf8');
                })
                .then((data2) => {
                  if (data2.indexOf('data old') === -1) {
                    throw new Error('old file as no old data');
                  }
                  // console.log('Old file data:' + "\n" + data2);
                  return Promise.all([fsp.unlink(config.logFile), fsp.unlink(logFile2)]);
                })
                .then(() => resolve());
            });
          })
          .catch(err => reject(err));
      });
    });
  });


  it('should not log silly log level text', () => {
    const config = {
      logFile: 'test6.log',
      logToConsole: false,
      logToFile: true,
      logLevel: {
        file: 'silly',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        const logger = logWriter.getLogger();
        logger.silly('try logging silly %)')
          .then(() => logWriter.stop())
          .then(() => fsp.readFile(config.logFile, 'utf8'))
          .then((data) => {
            if (data.indexOf('silly') !== -1) {
              throw new Error('Silly things were logged');
            }
          })
          .then(() => resolve())
          .catch(err => reject(err))
          .finally(() => fsp.unlink(config.logFile));
      });
    });
  });


  it('should throw error if writing when log writer stopped', () => {
    const config = {
      logFile: 'test7.log',
      logToConsole: false,
      logToFile: true,
      logLevel: {
        file: 'silly',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start()
        .then(() => logWriter.stop())
        .then(() => {
          const logger = logWriter.getLogger();
          return logger.w('try log smth');
        })
        .then(() => reject('did not throw!'))
        .catch(() => {
        })
        .finally(() => fsp.unlink(config.logFile));
      logWriter.on('fatal', () => {
        resolve();
      });
    });
  });

  it('should throw error if writing when log writer not started', () => {
    const config = {
      logFile: 'test8.log',
      logToConsole: false,
      logToFile: true,
      logLevel: {
        file: 'silly',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      const logger = logWriter.getLogger();
      logWriter.on('fatal', () => {
        resolve();
      });
      logger.w('try log smth')
        .then(() => reject('did not throw'))
        .catch(() => {
        });
    });
  });


  it('should reject double starting', () => {
    const config = {
      logFile: 'test9.log',
      logToConsole: false,
      logToFile: true,
      logLevel: {
        file: 'silly',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start()
        .then(() => logWriter.start())
        .then(()=>reject('double start succeeded, this in an error!'))
        .catch(()=> {
        })
        .then(()=>logWriter.stop())
        .then(()=> {
          fsp.unlink(config.logFile);
          resolve();
        });
    });
  });


  it('should reject wrong log levels starting', () => {
    const config = {
      logFile: 'test10.log',
      logToConsole: false,
      logToFile: true,
      logLevel: {
        file: 'very silly',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      try {
        const logWriter = new LogWriter(config);
      } catch (e) {
        resolve();
      }
      reject();
    });
  });


  it('should reject logging if no logging source enabled', () => {
    const config = {
      logFile: 'test11.log',
      logToConsole: false,
      logToFile: false,
      logLevel: {
        file: 'silly',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      const logger = logWriter.getLogger();
      logWriter.start()
        .then(()=>logger.w('try log smth'))
        .then(() => reject('did not throw'))
        .catch(() => {
          resolve();
        });
    });
  });

  it('should stop quietly', () => {
    const config = {
      logFile: 'test12.log',
      logToConsole: false,
      logToFile: true,
      logLevel: {
        file: 'silly',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start()
        .then(()=>logWriter.stop())
        .then(()=>logWriter.stop())
        .then(()=>logWriter.stop(true))
        .then(() => fsp.unlink(config.logFile))
        .then(() => resolve())
        .catch(err => reject(err));
    });
  });


  it('should log multiple text messages', () => {
    const config = {
      logFile: 'test13.log',
      logToConsole: false,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        const logger = logWriter.getLogger();
        logger.i('try logging info', 'more info', 'even more info')
          .then(()=>logWriter.stop())
          .then(()=> {
            fsp.unlink(config.logFile);
          })
          .then(() => resolve());
      });
    });
  });

  it('should log errors', () => {
    const config = {
      logFile: 'test14.log',
      logToConsole: true,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        const logger = logWriter.getLogger();
        logger.i(new Error('sample error'))
          .then(()=>logWriter.stop())
          .then(()=> {
            fsp.unlink(config.logFile);
          })
          .then(() => resolve());
      });
    });
  });


  it('should log arrays', () => {
    const config = {
      logFile: 'test15.log',
      logToConsole: true,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        const logger = logWriter.getLogger();
        logger.i([1, 2, 3, 4, 5])
          .then(()=>logWriter.stop())
          .then(()=> {
            fsp.unlink(config.logFile);
          })
          .then(() => resolve());
      });
    });
  });

  it('should log additional info', () => {
    const config = {
      logFile: 'test16.log',
      logToConsole: false,
      logToFile: true,
      logLevel: {
        file: 'verbose',
        console: 'silly',
      },
    };
    return new Promise((resolve, reject)=> {
      const logWriter = new LogWriter(config);
      logWriter.start();
      logWriter.on('fatal', () => {
        reject('not started');
      });
      logWriter.on('started', () => {
        const logger = logWriter.getLogger({moreData: 'someData'});
        logger.i('try logging info')
          .then(()=>logWriter.stop())
          .then(()=> {
            fsp.unlink(config.logFile);
          })
          .then(() => resolve());
      });
    });
  });
});
