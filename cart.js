var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

function CartDAO(database) {
    "use strict";

    this.db = database;

    this.getCart = function(userId, callback) {
        "use strict";

        this
            .db
            .collection("cart")
            .findOne(
              {
                userId: userId
              },
              function(err, doc){
                callback(doc);
              }
          );
    }

    this.itemInCart = function(userId, itemId, callback) {
        "use strict";

        this
          .db
          .collection("cart")
          .findOne(
            {
              "userId" : userId,
              "items" : {
                $elemMatch : {
                  "_id" : itemId
                }
              }
            },
            {
              "items.$" : 1,
              "_id" : 0
            },
            function( err, doc ){
              if ( doc == null )
                callback(null);
              else callback(doc.items[0]);
            }
          )
    }


    this.addItem = function(userId, item, callback) {
        "use strict";

        // Will update the first document found matching the query document.
        this
            .db
            .collection("cart")
            .findOneAndUpdate(
                // query for the cart with the userId passed as a parameter.
                {
                    userId: userId
                },
                // update the user's cart by pushing an item onto the items array
                {
                    "$push": {
                        items: item
                    }
                },
                // findOneAndUpdate() takes an options document as a parameter. Here we are
                // specifying that the database should insert a cart if one doesn't already
                // exist (i.e. "upsert: true") and that findOneAndUpdate() should pass the
                // updated document to the callback function rather than the original document
                // (i.e., "returnOriginal: false").
                {
                    upsert: true,
                    returnOriginal: false
                },
                // Because we specified "returnOriginal: false", this callback will be passed
                // the updated document as the value of result.
                function(err, result) {
                    assert.equal(null, err);
                    // To get the actual document updated we need to access the value field of the
                    // result.
                    callback(result.value);
                });

    };

    this.updateQuantity = function(userId, itemId, quantity, callback) {
        "use strict";

        var that = this;

        if (quantity == 0) {

          var userCart = this
                .db
                .collection("cart")
                .updateOne({
                        userId: userId
                    },
                    {
                        $pull: {
                            "items": {
                                "_id": itemId
                            }
                        }
                    },
                    function(err, count, status){
                      if ( !err ){
                        that.getCart(userId, callback);
                      }
                    }
                );

        } else {

            var userCart = this
                .db
                .collection("cart")
                .updateOne({
                    userId: userId,
                    "items": {
                        $elemMatch: {
                            "_id": itemId
                        }
                    }
                }, {
                    $set: {
                        "items.$.quantity": quantity
                    }
                }, function(err, count, status){
                  if ( !err ){
                      that.getCart(userId, callback);
                  }
                });
        }

    }

    this.dropCart = function(userId, callback){
      "use strict";

      this
        .db
        .collection('cart')
        .deleteOne(
          {
              "userId" : userId
          },
          function(err, doc){
            if ( !err )
              callback(doc);
          }
        );
    }

}

module.exports.CartDAO = CartDAO;
