const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const db = require('./queries');
const passport = require('passport');
const session = require('express-session');


app.use(
    session({
        secret: 'asdawac21',
        cookie: { maxAge: 300000000 },
        saveUninitialized: false,
        resave: false,
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

app.get('/', (request, response) => {
    response.json({ info: 'Node.js, Express, and Postgres API' });

});

app.listen(port, () => {
    console.log(`App running on port ${port}.`);
});

//Products endpoints
app.get('/products', db.getProducts);
app.get('/products/:id', db.getProductById);

//User endpoints
app.post('/register', db.checkUserExists, db.createUser);
app.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }), 
    (req, res) => {
        console.log('Welcome back, ' + req.user.first_name);
        res.redirect(303, "../users/" + req.user.id);
    }
);
app.get('/login', (request, response) => {
    response.json({ info: 'login page' });
});
app.get('/logout', (request, response, next) => {
    request.logout((err) => {
        if (err) return next(err);
        response.redirect('../');
    });
});
app.get('/users', db.getUsers);
app.get('/users/:id', db.getUsersById);
app.put('/users/:id', db.updateUser);

//Cart endpoints
app.post('/cart', db.createCart);
app.get('/cart', (request, response) => {
    console.log(request.user);
    console.log(request.session.cart);
    if (request.session.cart) return response.status(200).send(request.session.cart);
    else response.status(404).send('Could not find cart');
});

//Checkout endpoints
app.get('/checkout', (request, response) => {
    response.json({info: 'checkout page'});
});
app.post('/checkout', db.checkPayment);

//Orders endpoints
app.get('/orders', db.getOrders);
app.get('/orders/:id', db.getOrdersById);