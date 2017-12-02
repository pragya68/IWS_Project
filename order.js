
var MongoClient = require('mongodb').MongoClient,
    ObjectID = require('mongodb').ObjectID,
    assert = require('assert');

function OrderDAO(database) {
    "use strict";

    this.db = database;

    this.placeOrder = function(userId, userDetails, items, total, callback) {
        "use strict";

        this
          .db
          .collection('order')
          .insertOne(
            {
              "userId" : userId,
              "userDetails" : userDetails,
              "items" : items,
              "date" : new Date(),
              "totalCost" : total
            },
            function(err, doc){
              callback(doc.ops[0]);
            }
          );
    }

    this.getOrder = function (orderId, callback) {
        "use strict";

        var o_id = new ObjectID(orderId);

        this
          .db
          .collection('order')
          .findOne(
            {
              "_id" : o_id
            },
            function(err, doc){
              assert.equal(null, err);
              callback(doc);
            }
          )
    }

    this.getUserOrders = function (userId, callback) {
        "use strict";

        this
          .db
          .collection('order')
          .find(
            {
              "userId" : userId
            }
          )
          .toArray(function(err, orders){
            if ( !err )
              callback(orders);
          });
    }

    this.getOrdersByDate = function (onDate, callback) {
        "use strict";
    }

}

module.exports.OrderDAO = OrderDAO;
