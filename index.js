const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const port = 3001;
const db = require('./queries');
const passport = require('passport');
const session = require('express-session');


app.use(
    session({
        secret: 'asdawac21',
        cookie: { maxAge: 300000000 },
        saveUninitialized: false,
        resave: false,
        samesite: 'none'
    })
);

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

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

const checkUserMiddleware = (request, response, next) => {
    const id = parseInt(request.params.id);

    if (!request.user || request.user.id !== id) {
        console.log(request.user);
        response.status(401).send();
        return;
    }
    next();
};

//Products endpoints
app.get('/products', db.getProducts);
app.get('/products/categories', db.getCategories);
app.get('/products/:id', db.getProductById);

//User endpoints
app.post('/register', db.checkUserExists, db.createUser);
app.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }), 
    (request, response) => {
        console.log('Welcome back, ' + request.user.first_name);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        //response.status(200).json({id: request.user.id});
        response.redirect(303, "../users/" + request.user.id);
    }
);
app.get('/login', (request, response) => {
    response.json({ info: 'login page' });
});
app.get('/logout', (request, response, next) => {
    request.logout((err) => {
        if (err) return next(err);
        response.status(200).json({message: 'logout successful'});
    });
});
app.get('/users', db.getUsers);
app.get('/users/:id', checkUserMiddleware, db.getUsersById);
app.put('/users/:id', checkUserMiddleware, db.updateUser);

//Cart endpoints
app.post('/cart', db.createCart);
app.get('/cart', (request, response) => {
    console.log(request.user);
    console.log(request.session.cart);
    if (!request.user) return response.status(401).send('You must be signed in.');
    else if (request.session.cart) return response.status(200).json(request.session.cart);
    return response.status(404).send();
});
app.put('/cart', db.addItemToCart);

//Checkout endpoints
app.get('/checkout', (request, response) => {
    response.json({info: 'checkout page'});
});
app.post('/checkout', db.checkPayment);

//Orders endpoints
app.get('/orders', db.getOrders);
app.get('/orders/:id', db.getOrdersById);