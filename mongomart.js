var express = require('express'),
    bodyParser = require('body-parser'),
    nunjucks = require('nunjucks'),
    MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),

    // Required for interacting with DB
    ItemDAO = require('./items').ItemDAO,
    CartDAO = require('./cart').CartDAO,
    OrderDAO = require('./order').OrderDAO,

    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    mongoose = require('mongoose'),
    passportTwitter = require('./auth/twitter'),
    passportLinkedIn = require('./auth/linkedin'),
    passportGithub = require('./auth/github'),
    session = require('express-session');


// Set up express
app = express();
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use('/static', express.static(__dirname + '/static'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser('Gangadhar is shaktiman'));
app.use(session({
    secret: 'Gangadhar is shaktiman',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false
    }
}));
app.use(passport.initialize());
app.use(passport.session());

/*
 Configure nunjucks to work with express
 Not using consolidate because I'm waiting on better support for template inheritance with
 nunjucks via consolidate. See: https://github.com/tj/consolidate.js/pull/224
*/
var env = nunjucks.configure('views', {
    autoescape: true,
    express: app
});

var nunjucksDate = require('nunjucks-date');
nunjucksDate.setDefaultFormat('MMMM Do YYYY, h:mm:ss a');
env.addFilter("date", nunjucksDate);

var ITEMS_PER_PAGE = 5;

// Hardcoded USERID for use with the shopping cart portion
var USERID = "558098a65133816958968d88";

mongoose.connect('mongodb://localhost:27017/passport-social-auth'); //for user login to db

MongoClient.connect('mongodb://localhost:27017/mongomart', function(err, db) { //db connection
    "use strict";

    assert.equal(null, err);
    console.log("Successfully connected to MongoDB.");

    var items = new ItemDAO(db);
    var cart = new CartDAO(db);
    var order = new OrderDAO(db);

    var router = express.Router();

    // Homepage
    router.get("/", function(req, res) {
        "use strict";

        var page = req.query.page ? parseInt(req.query.page) : 0;
        var category = req.query.category ? req.query.category : "All";

        items.getCategories(function(categories) {

            items.getItems(category, page, ITEMS_PER_PAGE, function(pageItems) {

                items.getNumItems(category, function(itemCount) {

                    var numPages = 0;
                    if (itemCount > ITEMS_PER_PAGE) {
                        numPages = Math.ceil(itemCount / ITEMS_PER_PAGE);
                    }

                    res.render('home', {
                        category_param: category,
                        categories: categories,
                        useRangeBasedPagination: false,
                        itemCount: itemCount,
                        pages: numPages,
                        page: page,
                        items: pageItems,
                        user: req.user
                    });

                });
            });
        });
    });

    // Login page
    router.get('/login', function(req, res) {
        "use strict";
        if ( !req.user )
          res.render('login');
        else res.redirect('/');
    });

    // Logout
    router.get('/logout', function(req, res){
      if ( req.user ){
        req.session.destroy(function(err){
          res.redirect('/');
        })
      } else res.redirect('/');
    });

    // Twitter auth
    router.get('/auth/twitter', passportTwitter.authenticate('twitter', { scope : 'email' }));
    router.get('/auth/twitter/callback', passportTwitter.authenticate('twitter', {
        failureRedirect: '/login',  scope : 'email'
    }), function(req, res) {
          USERID = req.user.someID;
          res.redirect('/');
        }
    );

    // Linkedin auth
    router.get('/auth/linkedin', passportLinkedIn.authenticate('linkedin', { scope : 'email' }));
    router.get('/auth/linkedin/callback', passportLinkedIn.authenticate('linkedin', {
      failureRedirect: '/login', scope : 'email'
    }), function(req, res) {
          USERID = req.user.someID;
          res.redirect('/');
        }
    );

    // Github auth
    router.get('/auth/github', passportGithub.authenticate('github', { scope: [ 'user:email' ] }));
    router.get('/auth/github/callback', passportGithub.authenticate('github', {
      failureRedirect: '/login'
    }), function(req, res) {
          USERID = req.user.someID;
          res.redirect('/');
      });


    // Myprofile
    router.get('/myprofile', function(req, res) {
        if ( req.user ){

          MongoClient.connect('mongodb://localhost:27017/passport-social-auth', function(err, dbb){
            dbb.collection('users').findOne({"someID" : req.user.someID}, function(err2, doc){
              assert.equal(null, err2);
              dbb.close();

              order.getUserOrders(req.user.someID, function(userOrders){
                res.render('myprofile', {
                  user : req.user,
                  //profilePic : doc.profilePic.replace("_normal", ""),
                  emails : doc.emails || "me@gmail.com",
                  dob : doc.dob || "06/09/1995",
                  location : doc.location || 'New Delhi, India',
                  orders : userOrders
                });
              });
            });
          });

        } else res.redirect('/');
    });

    // Search
    router.get("/search", function(req, res) {
        "use strict";

        var page = req.query.page ? parseInt(req.query.page) : 0;
        var query = req.query.query ? req.query.query : "";

        items.searchItems(query, page, ITEMS_PER_PAGE, function(searchItems) {

            items.getNumSearchItems(query, function(itemCount) {

                var numPages = 0;

                if (itemCount > ITEMS_PER_PAGE) {
                    numPages = Math.ceil(itemCount / ITEMS_PER_PAGE);
                }

                res.render('search', {
                    queryString: query,
                    itemCount: itemCount,
                    pages: numPages,
                    page: page,
                    items: searchItems,
                    user : req.user
                });

            });
        });
    });

    // Item
    router.get("/item/:itemId", function(req, res) {
        "use strict";

        var itemId = parseInt(req.params.itemId);

        items.getItem(itemId, function(item) {

            if (item == null) {
                res.status(404).send("Item not found.");
                return;
            }

            var stars = 0;
            var numReviews = 0;
            var reviews = [];

            if ("reviews" in item) {
                numReviews = item.reviews.length;

                for (var i = 0; i < numReviews; i++) {
                    var review = item.reviews[i];
                    stars += review.stars;
                }

                if (numReviews > 0) {
                    stars = stars / numReviews;
                    reviews = item.reviews;
                }
            }

            items.getRelatedItems(function(relatedItems) {

                res.render("item", {
                    userId: USERID,
                    item: item,
                    stars: stars,
                    reviews: reviews,
                    numReviews: numReviews,
                    relatedItems: relatedItems,
                    user : req.user
                });
            });
        });
    });

    // Item with reviews
    router.post("/item/:itemId/reviews", function(req, res) {
        "use strict";

        var itemId = parseInt(req.params.itemId);
        var review = req.body.review;
        var name = req.body.name;
        var stars = parseInt(req.body.stars);

        items.addReview(itemId, review, name, stars, function(itemDoc) {
            res.redirect("/item/" + itemId);
        });
    });

    // Invoice
    router.get('/invoice/:orderId', function(req, res) {

      if ( req.user ){

        var userId = req.user.someID;
        var orderId = req.params.orderId;

        order.getOrder(orderId, function(myOrder){
          if (myOrder){
            if ( myOrder.userId == userId ){
              res.render('invoice', { user : req.user, order : myOrder });
            } else res.send('Not authorized user');
          } else res.send('No such Order ID');
        });
      } else res.redirect('/login');
    });

    // Cart
    router.get("/cart", function(req, res) {
        if ( req.user ){
          res.redirect("/user/" + USERID + "/cart");
        } else res.redirect('/login');
    });

    // User Cart
    router.get("/user/:userId/cart", function(req, res) {
        "use strict";
        var userId = req.params.userId;

        if (req.user) {
            if (req.user.someID == userId) {

                cart.getCart(userId, function(userCart) {
                    var total = cartTotal(userCart);
                    res.render("cart", {
                        userId: userId,
                        updated: false,
                        cart: userCart,
                        total: total,
                        user : req.user
                    });
                });
            } else res.redirect('/user/' + req.user.someID + '/cart');
        } else res.redirect('/');
    });

    // User cart items
    router.post("/user/:userId/cart/items/:itemId", function(req, res) {
        "use strict";

        var userId = req.params.userId;
        var itemId = parseInt(req.params.itemId);

        if ( req.user ){
          if ( req.user.someID == userId ){
            var renderCart = function(userCart) {
                var total = cartTotal(userCart);
                res.render("cart", {
                    userId: userId,
                    updated: true,
                    cart: userCart,
                    total: total,
                    user : req.user
                });
            };

            cart.itemInCart(userId, itemId, function(item) {
                if (item == null) {
                    items.getItem(itemId, function(item) {
                        item.quantity = 1;
                        cart.addItem(userId, item, function(userCart) {
                            renderCart(userCart);
                        });

                    });
                } else {
                    cart.updateQuantity(userId, itemId, item.quantity + 1, function(userCart) {
                        renderCart(userCart);
                    });
                }
            });
          } else res.redirect('/');
        } else res.redirect('/login');
    });

    // User cart items quantity
    router.post("/user/:userId/cart/items/:itemId/quantity", function(req, res) {
        "use strict";

        var userId = req.params.userId;
        var itemId = parseInt(req.params.itemId);
        var quantity = parseInt(req.body.quantity);

        if ( req.user ){
          if ( req.user.someID == userId ){
            cart.updateQuantity(userId, itemId, quantity, function(userCart) {
                var total = cartTotal(userCart);
                res.render("cart", {
                    userId: userId,
                    updated: true,
                    cart: userCart,
                    total: total,
                    user : req.user
                });
            });
          } else res.redirect('/');
        } else res.redirect('/login');
    });

    // User cart checkout
    router.get('/user/:userId/cart/checkout', function(req, res){

      var userId = req.params.userId;

      if ( req.user ){
        if ( req.user.someID == userId ){

          cart.getCart(userId, function(userCart) {
              var total = cartTotal(userCart);
              res.render("checkout", {
                  userId: userId,
                  updated: false,
                  cart: userCart,
                  total: total,
                  user : req.user
              });
          });

        } else res.redirect('/user/' + req.user.someID + '/cart');
      } else res.redirect('/');
    });

    // Form payment submission
    router.post('/user/:userId/cart/checkout/pay', function(req, res){

      var userId = req.params.userId;

      if ( req.user ){
        if ( req.user.someID == userId ){

            var userDetails = {
              name : req.body.name,
              phone : req.body.phone,
              address : req.body.address,
              city : req.body.city,
              state : req.body.state,
              email : req.body.email,
              card : req.body.card.toString().substr(12, 16)
            };

            // Get the items in cart
            cart.getCart(userId, function(userCart) {
                var total = cartTotal(userCart);
                // Place order and fill up order collection
                order.placeOrder(userId, userDetails, userCart.items, total, function(od){
                  // Delete the cart of user
                  cart.dropCart(userId, function(doc){
                    // Order successful
                    if ( doc ) {
                      res.render('invoice', {
                                              order : od,
                                              user : req.user
                                            }
                      );
                    }
                  });
                });
            });

        }
      } else res.json({ error : 'Invalid session', message : 'Request failed' });
    });


    function cartTotal(userCart) {
        "use strict";
        if ( userCart == null ) return 0;

        if (userCart.items) {
            var total = 0;
            for (var i = 0; i < userCart.items.length; i++) {
                var item = userCart.items[i];
                total += item.price * item.quantity;
            } return total;
        } else return 0;
    }

    // Use the router routes in our application
    app.use('/', router);

    // Start the server listening
    var server = app.listen(3000, function() {
        var port = server.address().port;
        console.log('Mongomart server listening on port %s.', port);
    });

});

