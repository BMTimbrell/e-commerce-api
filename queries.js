const Pool = require('pg').Pool;
const pool = Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'shoe_shop',
    password: 'postgres',
    port: 5432
});

/*export const getUsers = (request, response) => {
    pool.query()
}*/