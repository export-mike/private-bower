var path = require('path');
var mockery = require('mockery');

describe('Utils', function() {
    var execMock;
    var loggerMock;
    var utils;
    
    beforeEach(function() {
        loggerMock = {
            log: jasmine.createSpy('logger.log()')
        };
        
        execMock = jasmine.createSpy('child_process.exec()');
        
        mockery.registerMock('./logger', loggerMock);
        mockery.registerMock('child_process', {
            exec: execMock
        });

        mockery.warnOnUnregistered(false);
        mockery.enable({ useCleanCache: true });
        
        createUtils();
    });
    
    afterEach(function() {
        mockery.deregisterAll();
        mockery.disable();
    });
    
    function createUtils() {
        utils = require('../utils');
    }
    
    it('should have these properties', function() {
        expect(utils.exec).toBeFunction();
        expect(utils.getChildDirectories).toBeFunction();
        expect(utils.removeDirectory).toBeFunction();
        expect(utils.extend).toBeFunction();
        expect(utils.dirname).toBeString();
    });
    
    describe('dirname', function() {
        it('should be the current __dirname', function() {
           expect(utils.dirname).toEqual(path.join(__dirname, '../').slice(0, -1)); 
        });
    });
    
    describe('extend()', function() {
        it('should extend a object', function() {
            var a = {
                a: { text: 'a' },
                b: { text: 'b' },
                c: { text: 'c' }
            };
            
            var b = {
                c: { text: 'otherC' },
                d: { text: 'd' }
            };
            
            var result = utils.extend(a, b);
            
            expect(result.a).toEqual(a.a);
            expect(result.b).toEqual(a.b);
            expect(result.c).toEqual(b.c);
            expect(result.d).toEqual(b.d);
        });
    });
    
    describe('exec()', function() {
        it('should call child_process.exec() with the correct parameters', function() {
            var command = 'testCommand';
            var cwd = 'testCWD';
            
            utils.exec(command, cwd);
            
            expect(execMock).toHaveBeenCalled();
            
            var args = execMock.calls.first().args;
            
            expect(args[0]).toEqual(command);
            expect(args[1]).toEqual({ cwd: cwd });
            expect(args[2]).toBeFunction();
        });
        
        xit('should return a Promise that resolves if the exec succeeds', function() {
            var stdOut = 'thisIsSTDOut';
            var resolved = jasmine.createSpy('resolved()');
            var rejected = jasmine.createSpy('rejected()');
            
            utils.exec('testCommand', 'testCWD')
                .then(resolved)
                .catch(rejected);

            var callback = execMock.calls.first().args[2];
            
            callback(undefined, stdOut);
            
            expect(resolved).toHaveBeenCalledWith(stdOut);
            expect(rejected).not.toHaveBeenCalled();
        });
        
        xit('should return a Promise that rejects if the exec fails', function() {
            var error = 'error';
            var resolved = jasmine.createSpy('resolved()');
            var rejected = jasmine.createSpy('rejected()');
            
            utils.exec('testCommand', 'testCWD')
                .then(resolved)
                .catch(rejected);

            var callback = execMock.calls.first().args[2];

            callback(error);
            
            expect(rejected).toHaveBeenCalledWith(error);
            expect(resolved).not.toHaveBeenCalled();
        });
        
        it('should return log if error occurs', function() {
            var error = 'error';
            
            utils.exec('testCommand', 'testCWD')
                .catch(function() {});
                
            var callback = execMock.calls.first().args[2];
            
            callback('someError', null);
            
            expect(loggerMock.log).toHaveBeenCalledWith('Error during "testCommand" in "testCWD"');
        });
    });
    
    describe('getChildDirectories()', function() {
        var directoryName = 'directory';
        var childDirectories = [ 'a', 'b', 'c', 'd' ];
        var childDirectoriesPaths = childDirectories.map(function(file) {
                return directoryName + '/' + file;
            });
        
        var filesInDirectory = [
            'a.js',
            'b.doc',
            'c.xml',
            'd.html'
        ];
        
        var allFilesInDirectory = [].concat(childDirectories, filesInDirectory);
        
        it('should return child directories', function() {
            mockery.registerMock('fs', {
                readdirSync: jasmine.createSpy('fs.readdirSync()').and.returnValue(allFilesInDirectory),
                lstatSync: jasmine.createSpy('fs.lstatSync()').and.callFake(function(filePath) {
                    return {
                        isDirectory: function() {
                            return childDirectoriesPaths.indexOf(filePath) !== -1
                        }
                    };
                })
            });
            
            mockery.resetCache();
            
            createUtils();
            
            var resultChildDirectories = utils.getChildDirectories(directoryName);
            
            expect(resultChildDirectories).toEqual(childDirectories);
        });
    });
    
    //TODO: TEST - removeDirectory
});
