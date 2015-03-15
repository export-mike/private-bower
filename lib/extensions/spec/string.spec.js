describe('String', function() {
    describe('startsWith(str)', function() {
        it('should return true if the string starts with the argument', function() {
            var text = 'abcd';

            expect(text.startsWith('ab')).toBeTrue();
        });

        it('should return false if the string does not start with the argument', function() {
            var text = 'abcd';

            expect(text.startsWith('cd')).toBeFalse();
        });
    });
    
    describe('format(params)', function() {
        it('should replace {0}', function() {
            var stringToFormat = 'it should replace {0}';

            var formattedString = stringToFormat.format('this');

            expect(formattedString).toEqual('it should replace this');
        });

        it('should replace {0}', function() {
            var stringToFormat = 'it should replace {0} {1}';

            var formattedString = stringToFormat.format('several', 'parameters');

            expect(formattedString).toEqual('it should replace several parameters');
        });

        it('should replace {0}', function() {
            var stringToFormat = 'it should {3} {1} {2} in any {0}';

            var formattedString = stringToFormat.format('order', 'several', 'parameters', 'replace');

            expect(formattedString).toEqual('it should replace several parameters in any order');
        });
    });
});