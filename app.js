const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const config = require('./config');
const dotenv = require('dotenv').config();
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');

const errorController = require('./controllers/error');
const User = require('./models/user');

const user_db = process.env.DB_USER;
const password_db = process.env.DB_PASSWORD;

const url = `mongodb+srv://${user_db}:${password_db}@cluster0.z9aglvc.mongodb.net/shop?retryWrites=true&w=majority&appName=Cluster0`

const app = express();
const store = new MongoDBStore({
    uri: url,
    collection: 'sessions'
});
const csrfProtection = csrf();


console.log(user_db)


app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
}))
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {
            req.user = user;
            next();
        })
        .catch(err => console.log(err));
});

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
})



app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

mongoose
    .connect(
        url
    )
    .then((result) => {
        app.listen(config.port, () => {
            console.log(config.message)
        });
    })
    .catch(err => {
        console.log(err);
    });