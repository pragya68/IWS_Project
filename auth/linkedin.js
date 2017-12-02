var passport = require('passport');
var LinkedInStrategy = require('passport-linkedin');

var User = require('../user');
var config = require('../config');
var init = require('./init');

passport.use(new LinkedInStrategy({
    consumerKey: config.linkedinAuth.clientID,
    consumerSecret: config.linkedinAuth.clientSecret,
    callbackURL: config.linkedinAuth.callbackURL
  },
  // linkedin sends back the tokens and progile info
  function(token, tokenSecret, profile, done) {

    var searchQuery = {
      name: profile.displayName
    };

    var updates = {
      name: profile.displayName,
      someID: profile.id
    };

    var options = {
      upsert: true
    };

    // update the user if s/he exists or add a new user
    User.findOneAndUpdate(searchQuery, updates, options, function(err, user) {
      if(err) {
        return done(err);
      } else {
        return done(null, user);
      }
    });
  }

));

// serialize user into the session
init();


module.exports = passport;
