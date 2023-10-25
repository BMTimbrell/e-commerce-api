const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const bcrypt = require('bcrypt');
const Pool = require('pg').Pool;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'shoe_shop',
    password: 'postgres',
    port: 5432
});

//Products queries

const getProducts = (request, response) => {
    const category = request.query.category;
    const gender = request.query.gender;

    if (category && gender) {
        pool.query('SELECT * FROM shoes WHERE category = $1 AND gender = $2 ORDER BY id', 
            [category, gender], (error, results) => {
                if (error) {
                    throw error;
                }
                response.status(200).json(results.rows);
            }
        );
    } else if (category) {
        pool.query('SELECT * FROM shoes WHERE category = $1 ORDER BY id', 
            [category], (error, results) => {
                if (error) {
                    throw error;
                }
                response.status(200).json(results.rows);
            }
        );
    } else if (gender) {
        pool.query('SELECT * FROM shoes WHERE gender = $1 ORDER BY id', 
            [gender], (error, results) => {
                if (error) {
                    throw error;
                }
                response.status(200).json(results.rows);
            }
        );
    } else {
        pool.query('SELECT * FROM shoes ORDER BY id', (error, results) => {
            if (error) {
                throw error;
            }
            response.status(200).json(results.rows);
        });
    } 
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

//Users queries

const getUsers = (request, response) => {
    pool.query('SELECT * FROM customers ORDER BY id', (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
};

const getUsersById = (request, response) => {
    const id = parseInt(request.params.id);

    pool.query('SELECT * FROM customers WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
}

const updateUser = async (request, response) => {
    const id = parseInt(request.params.id);
    const { email, password } = request.body;

    //Update email
    if (email) {
        pool.query('SELECT * FROM customers WHERE email = $1', [email], (error, results) => {
            if (error) {
                throw error;
            }
            if (results.rows.length > 0) {
                console.log('User already exists');
                return response.status(403).send('User already exists with this email');
            }
        });
        pool.query('UPDATE customers SET email = $1 WHERE id = $2', [email, id], (error, results) => {
            if (error) throw error;
            console.log('Email updated');
            return response.status(200).json(results.rows[0]);
        });
    }

    if (password) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
    
            pool.query(
                'UPDATE customers SET password = $1 WHERE id = $2', 
                [hashedPassword, id], (error, results) => {
                    if (error) {
                        throw error;
                    }
                }
            );
    
            return response.status(200).send('Password updated');
        } catch (err) {
           return response.status(500).json({ message: err.message }); 
        } 
    }
};

const checkUserExists = (request, response, next) => {
    const { email } = request.body;
    pool.query('SELECT * FROM customers WHERE email = $1', [email], (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows.length > 0) {
            console.log('User already exists');
            return response.redirect(303, "login");
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

        response.redirect(303, "login");
    } catch (err) {
       response.status(500).json({ message: err.message }); 
    } 
};

//Logging in
passport.use(new LocalStrategy({ usernameField: 'email' }, function verify(email, password, done) {
    pool.query('SELECT * FROM customers WHERE email = $1', [email], async (error, user) => {
        if (error) return done(error);
        if (user.rows < 1) {
            return done(new Error('User doesn\'t exist!'));
        }

        //Check passwords match
        try {
            const matchedPassword = await bcrypt.compare(password, user.rows[0].password);
            if (!matchedPassword) return done(new Error('Incorrect password!'));
            return done(null, user.rows[0]);
        } catch (e) {
            return done(e);
        }
        
    });
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    pool.query('SELECT id, first_name, last_name, email FROM customers WHERE id = $1', [id], (error, results) => {
        if (error) return done(error);
        return done(null, results.rows[0]);
    });
});


//Cart

const createCart = (request, response) => {
    const { products } = request.body;
    let totalCost = 0;
    try {
        for (const product in products) {
            totalCost += products[product].price * products[product].quantity;
        }
    
        request.session.cart = {
            products: products,
            totalCost: totalCost
        };
        return response.redirect(303, "/checkout");
    } catch (error) {
        return response.status(400).send(error);
    }
};

//Checkout

const checkPayment = async (request, response) => {
    if (!request.session.cart || !request.user) 
        return response.status(400).send('Must be logged in and have a cart');

    const cartItems = request.session.cart.products;
    const time = new Date(Date.now()).toISOString().replace('T',' ').replace('Z','');
    console.log(time);
    const addOrder = async () => {
        try {
            const result = await pool.query(
                'INSERT INTO orders (customer_id, order_date) VALUES ($1, $2) RETURNING id', [request.user.id, time]
            );
            return result.rows[0].id;
        } catch (error) {
            return error;
        }
    };
    
        
    
    const orderId = await addOrder();
    for (item in cartItems) {
        console.log(orderId);
        pool.query('INSERT INTO orders_shoes (order_id, shoe_id, quantity) VALUES ($1, $2, $3)', [orderId, parseInt(item), cartItems[item].quantity],
            (error, results) => {
                if (error) {
                    throw error;
                }
            }
        );
    }

    return response.status(201).send('Payment successful!');
};

module.exports = {
    getProducts,
    getProductById,
    checkUserExists,
    createUser,
    getUsers,
    getUsersById,
    updateUser,
    createCart,
    checkPayment
};