var path = require('path');
var Express = require('express');
var logger = require('./logger');
var argv = require('optimist').argv;
var bodyParser = require('body-parser');

var utils = require('./utils');
var application = require('./application');
var configurationManager = require('./configurationManager');

module.exports = function Main() {
    var _config;
    
    function _start() {
        _handleErrors();
        _handleShutDown();

        var serverApp = Express();
        
        var defaultConfigPath = path.join(utils.dirname, '../bower.conf.json');
        configurationManager.loadConfiguration(argv.config || defaultConfigPath);
        
        _config = configurationManager.config;
        
        application.setup(serverApp, Express.static);
        
        _initializePackageStores();
        _initializeService();
    }

    function _initializePackageStores() {
        application.startPrivatePackageStore(_config.registryFile);

        if(!_config.disablePublic) {
            initializePublic();
        }

        function initializePublic() {
            application.startPublicPackageStore(_config.publicRegistry);

            if(_config.repositoryCache.enabled) {
                application.startPublicRespositoryCache(_config.repoCacheOptions);
            }
        }
    }

    function _initializeService() {
        application.addMiddleware(bodyParser());
        application.serveStatic(path.join(utils.dirname, '../site'));

        application.loadControllers('../lib/controllers');
        application.listen(_config.port);
    }

    function _handleErrors() {
        utils.process.on('uncaughtException', function(err) {
            logger.log('Exception message:' + (err.stack || err.message));

            application.shutDown();
        });
    }

    function _handleShutDown() {
        process.on('SIGINT', function() {
            application.shutDown();

            process.exit();
        });
    }
    
    return {
        start: _start
    };
}();