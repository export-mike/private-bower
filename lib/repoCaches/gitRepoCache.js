var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var utils = require('./../utils');
var Promise = require('bluebird');
var logger = require('./../logger');
var exec = require('child_process').exec;

var RepoCacheBase = require('./repoCacheBase');

module.exports = function GitRepoCache(options) {
    var base = new RepoCacheBase(options);
    var _daemon;

    _init();
    function _init() {
        return _createDirectory(options.repoCacheRoot)
            .then(_checkGitInstalled)
            .then(function() {
                return new Promise(function(resolve, reject) {
                    setInterval(_getLatestForRepos, options.refreshTimeout * 60 * 1000);
                    resolve();
                });
            })
            .then(_startGitDaemon)
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
                    return _cloneGitRepo(repoUrl, packageDirectory, repoName);
                })
                .then(function() {
                    var repoAccessAddress = base.getRepoAccessAddress();
                    var repo = 'git://{0}/{1}'.format(repoAccessAddress, repoName);

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

    function _checkGitInstalled() {
        return utils.exec('git --version')
          .catch(function(error) {
              logger.error('Git must be installed');
              return error;
          });
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

    function _startGitDaemon() {
        return new Promise(function(resolve, reject) {
            process.chdir(options.repoCacheRoot);

            var customParameters = base.generateCustomParameters();

            var gitCommand = 'git daemon --reuseaddr --verbose --base-path="{0}" --listen={1} --port={2} --export-all{3}'
                .format(options.repoCacheRoot, options.hostName, options.port, customParameters);

            logger.log('Starting git cache server');

            _daemon = exec(gitCommand, function(error) {
                if(error) {
                    reject(error);
                    return;
                }

                logger.log('Git cache server started');

                resolve();
            });
        });
    }

    function _cloneGitRepo(repoUrl, packageDirectory, repoName) {
        var gitCommand = 'git clone {0} ./'.format(repoUrl);

        logger.log('Cloning {0} ...'.format(repoName));

        process.chdir(packageDirectory);
        return utils.exec(gitCommand)
          .then(function() {
              logger.log('Cloned {0} git repository to private'.format(repoName));
          })
          .catch(function(error) {
              logger.log('Error during cloning in ' + packageDirectory);
              logger.error(error.message);
          });
    }

    function _getLatestForRepos() {
        logger.log('Refreshing cached public git repositories');

        return base.getLatestForRepos(pullLatest);

        function pullLatest(packageDirectory) {
            return new Promise(function(resolve, reject) {
                var packageDirPath = path.join(options.repoCacheRoot, packageDirectory);

                if(fs.existsSync(packageDirPath)) {
                    fetchRepository()
                        .then(hardResetToOriginMaster)
                        .then(pullRepository)
                        .then(function() {
                            logger.log('Pulled latest for {0}'.format(path.basename(packageDirectory)));
                            resolve();
                        })
                        .catch(function(error) {
                            if(error && error.message) {
                                logger.error(error.message)
                            }
                            reject(error);
                        });
                }
                else {
                    logger.log('Could not pull latest, because "{0}" directory cannot be found'.format(packageDirPath));

                    resolve();
                }
            });

            function fetchRepository() {
                return utils.exec('git fetch --prune --tags', packageDirPath);
            }

            function hardResetToOriginMaster() {
                return utils.exec('git reset --hard origin/master', packageDirPath);
            }

            function pullRepository() {
                return utils.exec('git pull', packageDirPath);
            }
        }
    }

    function _shutDown() {
        logger.log('Stopping git cache server');

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
