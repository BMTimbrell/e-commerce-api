const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const db = require('./queries');

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

app.get('/products', db.getProducts);
app.get('/products/:id', db.getProductById);
app.post('/register', db.checkUserExists, db.createUser);
app.post('/login', db.checkUserPassword);
app.get('/login', (request, response) => {
    response.json({ info: 'login page' });
});