const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_KEY);


const Pool = require('pg').Pool;
const pool = new Pool({
    user: process.env.SUPABASE_USER,
    host: process.env.SUPABASE_HOST,
    database: process.env.SUPABASE_DB,
    password: process.env.SUPABASE_PASSWORD,
    port: process.env.SUPABASE_PORT
});

//Products queries

const getProducts = (request, response) => {
    const category = request.query.category;
    const gender = request.query.gender;

    if (category && gender) {
        pool.query('SELECT * FROM shoes WHERE category = $1 AND gender = $2 ORDER BY id', 
            [category, gender], (error, results) => {
                if (error) {
                    console.log(error);
                    return response.status(500).send(error);
                }
                if (results.rows.length === 0) return response.status(400).send();
                response.status(200).json(results.rows);
            }
        );
    } else if (category) {
        pool.query('SELECT * FROM shoes WHERE category = $1 ORDER BY id', 
            [category], (error, results) => {
                if (error) {
                    console.log(error);
                    return response.status(500).send(error);
                }
                if (results.rows.length === 0) return response.status(400).send();
                response.status(200).json(results.rows);
            }
        );
    } else if (gender) {
        pool.query('SELECT * FROM shoes WHERE gender = $1 ORDER BY id', 
            [gender], (error, results) => {
                if (error) {
                    console.log(error);
                    return response.status(500).send(error);
                }
                if (results.rows.length === 0) return response.status(400).send();
                response.status(200).json(results.rows);
            }
        );
    } else {
        pool.query('SELECT * FROM shoes ORDER BY id', (error, results) => {
            if (error) {
                console.log(error);
                return response.status(500).send(error);
            }
            response.status(200).json(results.rows);
        });
    } 
};

const getProductById = (request, response) => {
    const id = parseInt(request.params.id);

    const query = 'SELECT shoes.id, shoes.name, shoes.manufacturer, shoes.category, shoes.price, shoes.gender, shoes.image, sizes.size '
    + 'FROM shoes '
    + 'INNER JOIN shoes_sizes ON shoes_sizes.shoe_id = shoes.id '
    + 'INNER JOIN sizes ON sizes.id = shoes_sizes.size_id '
    + 'WHERE shoes.id = $1';

    pool.query(query, [id], (error, results) => {
        if (error) {
            console.log(error);
            return response.status(500).send(error);
        }
        if (results.rows.length === 0) return response.status(400).send();
        response.status(200).json(results.rows);
    });
};

const getCategories = (request, response) => {
    pool.query('SELECT DISTINCT category FROM shoes', (error, results) => {
        if (error) {
            console.log(error);
            return response.status(500).send(error);
        }
        response.status(200).json(results.rows);
    });
};

//Users queries

const getUsers = (request, response) => {
    pool.query('SELECT * FROM customers ORDER BY id', (error, results) => {
        if (error) {
            console.log(error);
            return response.status(500).send(error);
        }
        response.status(200).json(results.rows);
    });
};

const getUsersById = (request, response) => {
    const id = parseInt(request.params.id);
    pool.query('SELECT * FROM customers WHERE id = $1', [id], (error, results) => {
        if (error) {
            console.log(error);
            return response.status(500).send(error);
        }
        return response.status(200).json(results.rows[0]);
    });
}

const updateUser = async (request, response) => {
    const id = parseInt(request.params.id);
    const { email, password, firstName, lastName } = request.body;

    //Update email
    if (email) {
        try {
            const checkEmailExists = await pool.query(
                'SELECT * FROM customers WHERE email = $1', [email]
            );
            if (checkEmailExists.rows.length > 0) {
                console.log('User already exists with this email');
                return response.status(403).send('User already exists with this email');
            }
        } catch (error) {
            response.status(500).send(error);
        }
        
        try {
            const UpdatedEmail = await pool.query(
                'UPDATE customers SET email = $1 WHERE id = $2', [email, id]
            );
            console.log('Email updated');
        } catch (error) {
            if (error) return response.status(500).error;
        }
    }

    //Update password
    if (password) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
    
            const updatedPassword = await pool.query(
                'UPDATE customers SET password = $1 WHERE id = $2', 
                [hashedPassword, id]
            );
    
            console.log('Password updated');
        } catch (err) {
            console.log(err);
           return response.status(500).json({message: err.message}); 
        } 
    }

    if (firstName) {
        try {
            const updatedFirstName = await pool.query(
                'UPDATE customers SET first_name = $1 WHERE id = $2', 
                [firstName, id]
            );
    
           console.log('First name updated');
        } catch (err) {
            console.log(err);
           return response.status(500).json({message: err.message}); 
        } 
    }

    if (lastName) {
        try {
            const updatedLastName = await pool.query(
                'UPDATE customers SET last_name = $1 WHERE id = $2', 
                [lastName, id]
            );
    
            console.log('Last name updated');
        } catch (err) {
            console.log(err);
           return response.status(500).json({message: err.message}); 
        } 
    }

    return response.status(200).json({message: 'Update Complete!'});
};

const checkUserExists = (request, response, next) => {
    const { email } = request.body;
    pool.query('SELECT * FROM customers WHERE email = $1', [email], (error, results) => {
        if (error) {
            console.log(error);
            return response.status(500).send(error);
        }
        if (results.rows.length > 0) {
            console.log('User already exists');
            return response.redirect(303, "login");
        }
        next();
    });
};

const createUser = async (request, response, next) => {
    const { first_name, last_name, email, password } = request.body;

    if (!first_name || !last_name || !email || !password) 
        return response.status(400).json({error: 'Invalid data'});

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const addUser = async () => {
            try {
                const result = await pool.query(
                    'INSERT INTO customers (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *', 
                    [first_name, last_name, email, hashedPassword]
                );
                return result.rows[0];
            } catch (error) {
                return error;
            }
        };

        const user = await addUser();
        request.login(user, function(err) {
            console.log(request.user);
            if (err) return response.status(500).json({ message: err.message }); 
            return response.redirect(303, '/users/' + request.user.id);
        });
    } catch (err) {
       response.status(500).json({ message: err.message }); 
    } 
};

//Logging in
passport.use(new LocalStrategy({ usernameField: 'email' }, function verify(email, password, done) {
    pool.query('SELECT * FROM customers WHERE email = $1', [email], async (error, user) => {
        if (error) return done(error);
        if (user.rows < 1 ) {
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
        products.forEach(product => {
            totalCost += product.quantity * product.price;
        });
    
        request.session.cart = {
            products,
            totalCost
        };
        return response.status(201).json(request.session.cart);
    } catch (error) {
        console.log(error);
        return response.status(400).send(error);
    }
};

const addItemToCart = (request, response) => {
    const { id, price, size, name, image } = request.body;
    let productFound = false;

    try {
        //Look for product and increment quantity if found
        request.session.cart.products.forEach(product => {
            if (product.id == id && product.size == size) {
                product.quantity++;
                request.session.cart.totalCost += price;
                productFound = true;
                return;
            }
        });

        if (!productFound) {
            request.session.cart.products.push({
                id,
                price,
                quantity: 1,
                size,
                name,
                image
            });
            request.session.cart.totalCost += price;
        }
        return response.status(200).json(request.session.cart);
    } catch (error) {
        console.log(error);
        return response.status(400).send(error);
    }
};

//Checkout

const checkPayment = async (request, response, next) => {
    const { id, amount} = request.body;

    if (amount <= 0) return request.status(400).send();
   
    try {

        const payment = await stripe.paymentIntents.create({
            amount,
            currency: 'gbp',
            payment_method: id
        });

        if (payment) next();
    } catch (error) {
        console.log(error);
        return response.status(500).json({ error: error.message });
    }
};

const submitOrder = async (request, response) => {

    const cartItems = request.session.cart.products;

    const addOrder = async () => {
        try {
            const result = await pool.query(
                'INSERT INTO orders (customer_id, order_date, total_cost) VALUES ($1, $2, $3) RETURNING id', [request.user.id, new Date(), request.session.cart.totalCost]
            );
            return result.rows[0].id;
        } catch (error) {
            console.log(error);
            return error;
        }
    };
    
        
    
    const orderId = await addOrder();
    for (const item of cartItems) {
        pool.query('INSERT INTO orders_shoes (order_id, shoe_id, quantity, size) VALUES ($1, $2, $3, $4)', [orderId, parseInt(item.id), item.quantity, item.size],
            (error, results) => {
                if (error) {
                    console.log(error);
                    return response.status(500).send(error);
                }
            }
        );
    }
    request.session.cart = null;
    return response.status(200).json({ message: 'Payment successful!' });
};

//Orders

const getOrders = (request, response) => {
    const query = 'SELECT orders.id, orders.order_date, orders.total_cost, orders_shoes.quantity, shoes.id AS shoe_id, shoes.name, '
	+ 'shoes.image, shoes.manufacturer, shoes.price, orders_shoes.size '
    + 'FROM orders '
    + 'INNER JOIN orders_shoes ON orders_shoes.order_id = orders.id '
    + 'INNER JOIN shoes ON shoes.id = orders_shoes.shoe_id '
    + 'WHERE orders.customer_id = $1 '
    + 'ORDER BY orders.id';

    pool.query(query, [request.user.id], (error, results) => {
        if (error) {
            console.log(error);
            return response.status(500).send(error);
        }
        response.status(200).json(results.rows);
    });
};

const getOrdersById = (request, response) => {
    const order_id = parseInt(request.params.id);
    const query = 'SELECT orders.id, orders.order_date, orders.total_cost, orders_shoes.quantity, '
	    + 'shoes.id AS shoe_id, shoes.name, shoes.manufacturer, shoes.image, shoes.price, orders_shoes.size '
        + 'FROM orders '
        + 'INNER JOIN orders_shoes ON orders_shoes.order_id = orders.id '
        + 'INNER JOIN shoes ON shoes.id = orders_shoes.shoe_id '
        + 'WHERE orders.customer_id = $1 AND orders.id = $2';

    pool.query(query, [request.user.id, order_id], (error, results) => {
        if (error) {
            console.log(error);
            return response.status(500).send(error);
        }
        response.status(200).json(results.rows);
    });
};

module.exports = {
    getProducts,
    getProductById,
    getCategories,
    checkUserExists,
    createUser,
    getUsers,
    getUsersById,
    updateUser,
    createCart,
    addItemToCart,
    checkPayment,
    submitOrder,
    getOrders,
    getOrdersById
};