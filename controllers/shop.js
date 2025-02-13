const fs = require('fs');
const path = require('path');

const Product = require('../models/product');
const Order = require('../models/order');
const fileHelper = require('../util/file');
const stripe = require('stripe')('sk_test_51QoVsMJWV4UeW9AnXmjmR4rTvhWriYat9dl4IxdCSkw1MrekpLtk2Emgoo2wPgtjtVlWWVQYFKTvyhWlLVg2MLDW00B4wh8pCa')

const PdfDocument = require('pdfkit');

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
    Product
        .find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
            res.render('shop/product-list', {
                prods: products,
                pageTitle: 'all Products',
                path: '/products',
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
        .catch(err => {

            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error)

        });
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-detail', {
                product: product,
                pageTitle: product.title,
                path: '/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error)
        });
};

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
    Product
        .find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
            res.render('shop/index', {
                prods: products,
                pageTitle: 'Shop',
                path: '/',
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
        .catch(err => {

            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error)

        });
};

exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items;
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products
            });
        })
        .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            console.log(result);
            res.redirect('/cart');
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error)
        });
};

exports.getCheckout = (req, res, next) => {
    let products;
    let total = 0;
    req.user
        .populate('cart.items.productId')
        .then(user => {
            products = user.cart.items;
            total = 0;
            products.forEach(p => {
                total += p.quantity * p.productId.price;
            });

            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: products.map(p => {
                    return {
                        name: p.productId.title,
                        description: p.productId.description,
                        amount: p.productId.price * 100,
                        currency: 'usd',
                        quantity: p.quantity
                    };
                }),
                success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
            });
        })
        .then(session => {
            res.render('shop/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                products: products,
                totalSum: total,
                sessionId: session.id
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: {...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};


exports.postOrder = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: {...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error)
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ 'user.userId': req.user._id })
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error)
        });
};


exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId).then(order => {
        if (!order) {
            return next(new Error('order is not found'));
        }
        if (order.user.userId.toString() !== req.user._id.toString()) {
            return next(new Error('user is not authorizade'));
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join(__dirname, '..', 'data', 'invoices', invoiceName);

        const pdfKit = new PdfDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=""' + invoiceName + "");
        pdfKit.pipe(fs.createWriteStream(invoiceName));
        pdfKit.pipe(res);

        pdfKit.fontSize(10).text('invoice', {
            underline: true
        });

        let totalPrice = 0;

        pdfKit.text('--------------------------------------');
        order.products.forEach(prod => {
            totalPrice += prod.quantity * prod.product.price;
            pdfKit.text(prod.product.title + '-' + prod.quantity + 'x' + '$' + prod.product.price)
        });

        pdfKit.text('-------');
        pdfKit.fontSize(14).text('total price $ ' + totalPrice);

        pdfKit.end();


        /*  fs.readFile(invoicePath, (err, data) => {
             if (err) {
                 console.log(err)
                 return next(err)
             }
             res.setHeader('Content-Type', 'application/pdf');
             res.setHeader('Content-Disposition', 'attachment; filename=""' + invoiceName + "")
             res.send(data);
         }); */
        /*  const file = fs.createReadStream(invoicePath);
     
        file.pipe(res) */
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error)
    })

};