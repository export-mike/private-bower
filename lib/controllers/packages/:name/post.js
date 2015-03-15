var packageStore = require('../../../packageStore');

module.exports = function(req, res) {
    packageStore.registerPackages([
        {
            name: req.body.name,
            repo: req.body.url
        }
    ]);

    res.send(201);
};