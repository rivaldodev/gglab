const bcrypt = require('bcrypt');
const saltRounds = 10;
const password = 'senha123';
bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        throw err;
    }
    console.log('INSERT INTO players (name, password_hash, is_admin) VALUES (\'guilherme\', \'' + hash + '\', TRUE);');
});
