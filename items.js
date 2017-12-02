
var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

function ItemDAO(database) {
    "use strict";

    this.db = database;

    this.getCategories = function (callback) {
        "use strict";

        var qry_GetCategoryCounts = [
            {
                $group: {
                    _id: "$category",
                    num: {
                        $sum: 1
                    }
                }
            }, {
                $sort: {
                    "_id": 1
                }
            }
        ];

        var categories = [];
        var that = this;
        this
            .db
            .collection('item', function (err, collection) {
                assert.equal(err, null);
                var cursor = collection.aggregate(qry_GetCategoryCounts);
                cursor.each(function (err, item) {
                    assert.equal(err, null);
                    if (item == null) {
                        var totalNum = 0;
                        for (var cat of categories) {
                            totalNum += parseInt(cat.num);
                        }
                        categories.push({_id: "All", num: totalNum});
                        callback(categories);
                    } else {
                        categories.push(item);
                    }
                });
            });
        }

    this.getItems = function (category, page, itemsPerPage, callback) {
        "use strict";


        var qry_GetItems = [
            {
                $match: {
                    "category": category
                }
            }, {
                $sort: {
                    "_id": 1
                }
            }, {
                $skip: page * itemsPerPage
            }, {
                $limit: itemsPerPage
            }
        ];

        if (category == 'All') {
            qry_GetItems.shift();
        }

        var pageItems = [];
        this
            .db
            .collection('item', function (err, collection) {
                assert.equal(err, null);
                var cursor = collection.aggregate(qry_GetItems);
                cursor.each(function (err, item) {
                    assert.equal(err, null);
                    if (item == null) {
                        callback(pageItems);
                    } else {
                        pageItems.push(item);
                    }
                })
            });

        // TODO-lab1B Replace all code above (in this method).

        // TODO Include the following line in the appropriate place within your code to
        // pass the items for the selected page to the callback.
    }

    this.getNumItems = function (category, callback) {
        "use strict";



        var qry_GetNumItems = {
            "category": category
        }
        if (category == 'All')
            qry_GetNumItems = {};

        this
            .db
            .collection('item', function (err, collection) {
                assert.equal(err, null);
                var cursor = collection.find(qry_GetNumItems);
                cursor.count(function (err, count) {
                    assert.equal(err, null);
                    callback(count);
                })
            });

    }

    this.searchItems = function (query, page, itemsPerPage, callback) {
        "use strict";

        var queryDoc;
        if (query.trim() == "") {
            queryDoc = {};
        } else {
            queryDoc = {
                "$text": {
                    "$search": query
                }
            };
        }

        var cursor = this
            .db
            .collection("item")
            .find(queryDoc);
        cursor.skip(page * itemsPerPage);
        cursor.limit(itemsPerPage);
        cursor.toArray(function (err, pageItems) {
            assert.equal(null, err);
            callback(pageItems);
        });

        // TODO-lab2A Replace all code above (in this method).

        // TODO Include the following line in the appropriate place within your code to
        // pass the items for the selected page of search results to the callback.
    }

    this.getNumSearchItems = function (query, callback) {
        "use strict";

        var numItems = 0;

        var queryDoc;
        if (query.trim() == "") {
            queryDoc = {};
        } else {
            queryDoc = {
                "$text": {
                    "$search": query
                }
            };
        }

        this
            .db
            .collection("item")
            .find(queryDoc)
            .count(function (err, count) {
                assert.equal(null, err);
                callback(count);
            });
    }

    this.getItem = function (itemId, callback) {
        "use strict";


        this.db.collection('item', function(err, collection){
            assert.equal(err, null);
            collection.findOne({ "_id" : itemId }, function(err, item){
                callback(item);
            });
        });

    }

    this.getRelatedItems = function (callback) {
        "use strict";

        this
            .db
            .collection("item")
            .find({})
            .limit(4)
            .toArray(function (err, relatedItems) {
                assert.equal(null, err);
                callback(relatedItems);
            });
    };

    this.addReview = function (itemId, comment, name, stars, callback) {
        "use strict";



        var reviewDoc = {
            name: name,
            comment: comment,
            stars: stars,
            date: Date.now()
        }

        this.db.collection('item', function(err, collection){
            assert.equal(err, null);
            collection.updateOne({ "_id" : itemId}, { $push : { "reviews" : reviewDoc } }, function(err, doc){
                assert.equal(err, null);
                callback(doc);
            });
        });
    }

    this.createDummyItem = function () {
        "use strict";

        var item = {
            _id: 1,
            title: "Gray Hooded Sweatshirt",
            description: "The top hooded sweatshirt we offer",
            slogan: "Made of 100% cotton",
            stars: 0,
            category: "Apparel",
            img_url: "/img/products/hoodie.jpg",
            price: 29.99,
            reviews: []
        };

        return item;
    }
}

module.exports.ItemDAO = ItemDAO;
