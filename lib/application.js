var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var logger = require('./logger');
var packageStore = require('./packageStore');
var publicPackageStore = require('./publicPackageStore');
var repoCacheHandler = require('./repoCacheHandler');
var configurationManager = require('./configurationManager');

module.exports = function Application() {
    var _serverApp;
    var _staticHandler;
    var _repoCacheHandler;

    function _setup(serverApp, staticHandler) {
        _serverApp = serverApp;
        _staticHandler = staticHandler;
    }

    function _startPrivatePackageStore(registryFile) {
        packageStore.start({
            persistFilePath: registryFile
        });
    }
    
    function _startPublicPackageStore(publicRegistry) {
        publicPackageStore.start(publicRegistry);
    }
    
    function _startPublicRespositoryCache(repoCacheOptions) {
        repoCacheHandler.start(repoCacheOptions);
    }
    
    function _listen(port) {
        _serverApp.listen(port);
    }
    
    function _serveStatic(staticPath) {
        _addMiddleware(_staticHandler(staticPath));
    }
    
    function _addMiddleware(middleware) {
        _serverApp.use(middleware);
    }
    
    function _loadControllers(controllersRoot) {
        fs.readdirSync(controllersRoot).forEach(loadControllerAtByName);
        
        function loadControllerAtByName(controllerPath) {
            var controller = require(path.join(controllersRoot, controllerPath));
            
            controller.bind(_serverApp);
        }
    }

    function _shutDown() {
        logger.log('Shutting down private-bower');

        if(_repoCacheHandler) {
            _repoCacheHandler.shutDown();
        }
    }

    function _restart() {
        logger.log('Shutting down server for restart');

        _serverApp.close();

        logger.log('Restarting private-bower with config set to ' + configurationManager.configPath);

        _shutDown();

        utils.startDetachedChildProcess('private-bower', ['--config',  configurationManager.configPath]);
    }
    
    return {
        setup: _setup,
        restart: _restart,

        listen: _listen,
        addMiddleware: _addMiddleware,
        loadControllers: _loadControllers,
        serveStatic: _serveStatic,

        shutDown: _shutDown,
        
        startPrivatePackageStore: _startPrivatePackageStore,
        startPublicPackageStore: _startPublicPackageStore,
        startPublicRespositoryCache: _startPublicRespositoryCache
    };
}();