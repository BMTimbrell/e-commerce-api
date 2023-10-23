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

const checkUserExists = (request, response, next) => {
    const { email } = request.body;
    pool.query('SELECT * FROM customers WHERE email = $1', [email], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows.length > 0) {
            console.log('User already exists');
            return response.redirect("login");
        }
        next();
    });
};

const createUser = async (request, response) => {
    const { first_name, last_name, email, password } = request.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        pool.query(
            'INSERT INTO customers (first_name, last_name, email, password) VALUES ($1, $2, $3, $4)', 
            [first_name, last_name, email, hashedPassword], (error, results) => {
                if (error) {
                    throw error;
                }
                console.log('Registration Complete');
            }
        );

        response.redirect("login");
    } catch (err) {
       response.status(500).json({ message: err.message }); 
    } 
};

const checkUserPassword = (request, response) => {
    const { email, password } = request.body;

    pool.query('SELECT * FROM customers WHERE email = $1', [email], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows[0].email !== email) {
            console.log('User does not exist!');
            return response.status(404).send('User not found');
        }
    });

    pool.query(
        'SELECT password FROM customers WHERE email = $1',
        [email], async (error, results) => {
            try {
                const matchedPassword = await bcrypt.compare(password, results.rows[0].password);
                if (!matchedPassword) {
                    console.log('Passwords did not match!');
                    return response.status(404).send('Incorrect password!');
                }

                response.status(200).send('Login successful!');
            } catch (err) {
                response.status(500).json({ message: err.message }); 
            }
        }
    );
};

module.exports = {
    getProducts,
    getProductById,
    checkUserExists,
    createUser,
    checkUserPassword
};