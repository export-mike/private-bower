var path = require('path');
var mkdirp = require('mkdirp');
var utils = require('./../utils');
var Promise = require('bluebird');
var logger = require('./../logger');
var exec = require('child_process').exec;

var RepoCacheBase = require('./repoCacheBase');

module.exports = function SvnRepoCache(options) {
    var base = new RepoCacheBase(options);
    var _daemon;

    _init();
    function _init() {
        return _createDirectory(options.repoCacheRoot)
            .then(_checkSvnInstalled)
            .then(function() {
                setInterval(_getLatestForRepos, options.refreshTimeout * 60 * 1000);
            })
            .then(_startSvnDaemon)
            .catch(function(err) {
                logger.error('Failed to initialize public repository cache');
                process.nextTick(function() {
                    throw err;
                });
            });
    }

    function _cacheRepo(repoName, repoUrl) {
        return new Promise(function(resolve, reject) {
            var packageDirectory = path.join(options.repoCacheRoot, repoName);

            _createDirectory(packageDirectory)
                .then(function() {
                    return _cloneSvnRepo(repoUrl, packageDirectory, repoName);
                })
                .then(function() {
                    var repoAccessAddress = base.getRepoAccessAddress();
                    var repo = 'svn://{0}/{1}'.format(repoAccessAddress, repoName);

                    resolve({
                        name: repoName,
                        repo: repo
                    });
                })
                .catch(function(err) {
                    logger.error('Failed to clone (maybe folder exists)' + repoUrl);
                    logger.error(err);

                    reject();
                });
        });
    }

    function _checkSvnInstalled() {
        return utils.exec('svnserve --version');
    }

    function _createDirectory(dir) {
        return new Promise(function(resolve, reject) {
            mkdirp(dir, function(err) {
                if(err) {
                    reject();
                    return;
                }

                resolve();
            });
        });
    }

    function _startSvnDaemon() {
        return new Promise(function(resolve, reject) {
            process.chdir(options.repoCacheRoot);

            var customParameters = base.generateCustomParameters();

            var svnCommand = 'svnserve -d --foreground -r "{0}" --listen-host {1} --listen-port {2}{3}'
                .format(options.repoCacheRoot, options.hostName, options.port, customParameters);

            logger.log('Starting svn cache server');

            _daemon = exec(svnCommand, function(error, stdout, stderr) {
                if(error) {
                    reject(stderr);
                    return;
                }

                logger.log('Svn cache server started');

                resolve();
            });
        });
    }

    function _cloneSvnRepo(repoUrl, packageDirectory, repoName) {
        logger.log('Cloning {0} ...'.format(repoName));

        var svnCommand = 'svn co {0} ./'.format(repoUrl);

        process.chdir(packageDirectory);
        return utils.exec(svnCommand)
          .then(function() {
              logger.log('Cloned {0} svn repository to private'.format(repoName));
          });
    }

    function _getLatestForRepos() {
        logger.log('Refreshing cached public svn repositories');

        return base.getLatestForRepos(pullLatest);

        function pullLatest(packageDirectory) {
            process.chdir(packageDirectory);
            return utils.exec('svn update')
              .then(function() {
                  logger.log('Updated latest for {0}'.format(path.basename(packageDirectory)));
              });
        }
    }

    function _shutDown() {
        logger.log('Stopping svn cache server');

        if(_daemon) {
            _daemon.kill();
        }
    }

    return {
        cacheRepo: _cacheRepo,

        removeRepo: base.removeRepo,

        shutDown: _shutDown
    };
};