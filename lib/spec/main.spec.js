var mockery = require('mockery');

describe('Main', function() {
    var applicationMock;
    var expressCons, expressMock;
    var configurationManagerMock, fakeConfig;
    var utilsMock;
    var bodyparserCons, bodyparserMock;
    var main;
    
    beforeEach(function() {
        applicationMock = {
            setup: jasmine.createSpy('application.setup(serverApp, staticHandler)'),
            listen: jasmine.createSpy('application.listen(port)'),
            addMiddleware: jasmine.createSpy('application.addMiddleware(middleware)'),
            serveStatic: jasmine.createSpy('application.serveStatic(path)'),
            loadControllers: jasmine.createSpy('application.loadControllers(controllersRoot)'),

            shutDown: jasmine.createSpy('application.shutDown()'),

            startPrivatePackageStore: jasmine.createSpy('application.startPrivatePackageStore()'),
            startPublicPackageStore: jasmine.createSpy('application.startPublicPackageStore()'),
            startPublicRespositoryCache: jasmine.createSpy('application.startPublicRespositoryCache()')
        };
        
        expressMock = {
            listen: jasmine.createSpy('express.listen()')
        };
        
        expressCons = jasmine.createSpy('express').and.returnValue(expressMock);
        expressCons.static = jasmine.createSpy('express.static');
        
        fakeConfig = {
            port: 11123,
            repositoryCache: {
                enabled: true
            }
        };
        
        configurationManagerMock = {
            loadConfiguration: jasmine.createSpy('configurationManager.loadConfiguration()').and.callFake(function() {
                configurationManagerMock.config = fakeConfig;
            })
        };
        
        bodyparserMock = jasmine.createSpy('body-parser()');
        bodyparserCons = jasmine.createSpy('body-parser').and.returnValue(bodyparserMock);
        
        utilsMock = {
            dirname: 'thisIsADir',
            process: {
                on: jasmine.createSpy('process.on()')
            }
        };
        
        mockery.registerMock('./utils', utilsMock);
        mockery.registerMock('./application', applicationMock);
        mockery.registerMock('./configurationManager', configurationManagerMock);
        mockery.registerMock('express', expressCons);
        mockery.registerMock('body-parser', bodyparserCons);

        mockery.warnOnUnregistered(false);

        mockery.enable({ useCleanCache: true });
        
        createMain();
    });
    
    afterEach(function() {
        mockery.deregisterAll();
        mockery.disable();
    });
    
    function createMain() {
        main = require('../main');
    }
    
    it('should have these properties', function() {
       expect(main.start).toBeFunction(); 
    });
    
    describe('start()', function() {
        it('should create express app', function() {
            main.start();
            
            expect(expressCons).toHaveBeenCalled();
        });
        
        it('should setup the Application and pass the serverApp', function() {
            main.start();
            
            expect(applicationMock.setup).toHaveBeenCalledWith(expressMock, expressCons.static);
        });
        
        it('should loadControllers on Application', function() {
            main.start();
            
            expect(applicationMock.loadControllers).toHaveBeenCalledWith('../lib/controllers');
        });
        
        it('should load configuration', function() {
            main.start();
            
            expect(configurationManagerMock.loadConfiguration).toHaveBeenCalled();
        });
        
        it('should call load configuration with default config path', function() {
            main.start();
            
            expect(configurationManagerMock.loadConfiguration).toHaveBeenCalledWith('bower.conf.json');
        });
        
        it('should call load configuration with parametered config path', function() {
            var fakeConfigPath = 'fakeConfig.conf';
            mockery.registerMock('optimist', { argv: { config: fakeConfigPath } });
            
            configurationManagerMock.loadConfiguration.calls.reset();
            mockery.resetCache();
            
            createMain();
            
            main.start();
            
            expect(configurationManagerMock.loadConfiguration).toHaveBeenCalledWith(fakeConfigPath);
            
            mockery.deregisterMock('optimist');
        });
        
        it('should start the private package store', function() {
            main.start();
            
            expect(applicationMock.startPrivatePackageStore).toHaveBeenCalled();
        });
        
        it('should startPublicPackageStore if the configuration is not disabled', function() {
            main.start();
            
            expect(applicationMock.startPublicPackageStore).toHaveBeenCalled();
        });
        
        it('should NOT startPublicPackageStore if the configuration is disabled', function() {
            fakeConfig = {
                disablePublic: true  
            };
            
            mockery.resetCache();
            
            createMain();
            
            main.start();
            
            expect(applicationMock.startPublicPackageStore).not.toHaveBeenCalled();
        });
        
        it('should startPublicRespositoryCache if the configuration is enabled', function() {
            main.start();
            
            expect(applicationMock.startPublicRespositoryCache).toHaveBeenCalled();
        });
        
        it('should NOT startPublicRespositoryCache if the configuration is enabled but the public is disabled', function() {
            fakeConfig = {
                disablePublic: true,
                repositoryCache: {}
            };
            
            mockery.resetCache();
            
            createMain();
            
            main.start();
            
            expect(applicationMock.startPublicRespositoryCache).not.toHaveBeenCalled();
        });

        it('should NOT startPublicRespositoryCache if the configuration is disabled', function() {
            fakeConfig = {
                disablePublic: false,
                repositoryCache: {
                    enabled: false
                }
            };

            mockery.resetCache();

            createMain();

            main.start();

            expect(applicationMock.startPublicRespositoryCache).not.toHaveBeenCalled();
        });
        
        it('should use bodyparser', function() {
            main.start();
            
            expect(bodyparserCons).toHaveBeenCalled();
            expect(applicationMock.addMiddleware).toHaveBeenCalledWith(bodyparserMock);
        });
        
        it('should serve the site', function() {
            main.start();
            
            expect(applicationMock.serveStatic).toHaveBeenCalledWith('site');
        });
        
        it('should start listening on config port', function() {
            main.start();
            
            expect(applicationMock.listen).toHaveBeenCalledWith(configurationManagerMock.config.port);
        });
    });
});