const bcrypt = require('bcrypt');
const Pool = require('pg').Pool;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'shoe_shop',
    password: 'postgres',
    port: 5432
});

const getProducts = (request, response) => {
    pool.query('SELECT * FROM shoes ORDER BY id', (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
};

const getProductById = (request, response) => {
    const id = parseInt(request.params.id);

    pool.query('SELECT * FROM shoes WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
};

const createUser = async (request, response) => {
    const { name, email, password } = request.body;

    const salt = await bcrypt.getSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    pool.query(
        'INSERT INTO customers (name, email, password) VALUES ($1, $2, $3)', 
        [name, email, hashedPassword], (error, results) => {
            if (error) {
                throw error;
            }
            response.status(201).send('Registration Complete!');
        }
    );
};

module.exports = {
    getProducts,
    getProductById
};