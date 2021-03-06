var mongojs = require('mongojs');
var db = mongojs('test', ['guestBookCollection']);
var dbThisYear = mongojs('test', ['thisYearCollection']);
var dbLightShow = mongojs('test', ['lightCollection']);
var sanitizer = require('sanitizer');
var _ = require("underscore");
var twitter = require("mtwitter");
var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io").listen(http);


module.exports = function (app, passport) {
	// ======================================================================================== //
	// ---------------------------------- AUTH  START ----------------------------------------- //
	// ======================================================================================== //
	app.get('/auth', function (req, res) {
		res.render('auth/index');
	});

	app.get('/auth/login', function (req, res) {
		res.render('auth/login', { message: req.flash('loginMessage')});
	})

	app.post('/auth/login', passport.authenticate('local-login', {
		successRedirect: '/auth/profile',
		failureRedirect: '/auth/login',
		failureFlash: true
	}))

	app.get('/auth/signup', function (req, res) {
		res.render('auth/signup', {message: req.flash('signupMessage')});
	});

	app.post('/auth/signup', passport.authenticate('local-signup', {
		successRedirect: '/auth/profile',
		failureRedirect: '/auth/signup',
		failureFlash: true
	}));

	app.get('/auth/profile', isLoggedIn, function (req, res) {
		res.render('auth/profile', {
			user : req.user
		});
	});

	app.get('/auth/fbprofile', isLoggedIn, function (req, res) {
		res.render('auth/fbprofile', {
			user : req.user
		});
	});

	app.get('/auth/logout', function (req, res) {
		req.logout();
		res.redirect('/auth');
	});

	// ======================================================================================== //
	// ----------------------------- GUESTBOOK  START ----------------------------------------- //
	// ======================================================================================== //

	app.get('/guestbook', function (req, res) {
		db.guestBookCollection.find(function(err, data) {
			// res.cookie('user', JSON.stringify({
			// 	'user': req.user
			// }))
			// console.log(JSON.stringify(req.user));
			res.render('guestbook/index', {guestPosts: data})
		}) 
	});

	app.get('/guestbook/facebook', passport.authenticate('fb', {scope: 'email'}))

	app.get('/auth/facebook/callback',
		passport.authenticate('fb', {
			successRedirect : '/guestbook/loggedin',
			failureRedirect : '/guestbook'
		}));

	// app.get('/guestbook/loggedin', isLoggedInGuessBook, function (req, res) {
	// 	db.guestBookCollection.find(function(err, data) {
	// 		console.log(req)
	// 		console.log("req")
	// 		console.log("req.user")
	// 		console.log(req.user)
	// 		// res.cookie('user', JSON.stringify({
	// 		// 	'user': req.user
	// 		// }))
	// 		// console.log(JSON.stringify(req.user));
	// 		res.render('guestbook/loggedin', {guestPosts: data, user: req.user})
	// 	}) 
	// });

	app.get('/guestbook/loggedin', isLoggedInGuessBook, function (req, res) {
		db.guestBookCollection.find(function(err, data) {
			res.render('guestbook/loggedin', {guestPosts: data, user: req.user})
		}) 
	});

	app.post("/guestbook/loggedin", function (request, response) {
		var message = sanitizer.sanitize(request.body.message.slice(0, 255));
		var fbName = sanitizer.sanitize(request.user.facebook.name)

		if (_.isUndefined(message) || _.isEmpty(message.trim())) {
			return response.json(400, {error: "wisdom is invalid"});
		}
		
		db.guestBookCollection.save({message: message, fbName: fbName}, function(err, saved) {
		  if( err || !saved ) console.log("message not saved in db");
		  else console.log("message in db");
		  db.guestBookCollection.find(function(err, data) {
		  	response.render('guestbook/loggedin', {guestPosts: data, user: request.user})
		  }) 
		});
	})

	app.get('/guestbook/logout', function (req, res) {
		req.logout();
		res.redirect('/guestbook');
		res.clearCookie('user');
	});

	// ======================================================================================== //
	// ----------------------------------- ZOMBIEBOOK ----------------------------------------- //
	// ======================================================================================== //

	app.get('/zombiebook', function (req, res) {
			res.render('zombiebook/index', { state : 'not logged in', friends : 'l'})
	});

	app.get('/zombiebook/facebook', passport.authenticate('fb_zombie', {scope: 'email'}))

	// original
	app.get('/zombiebook/facebook/callback',
		passport.authenticate('fb_zombie'), function(req, res) {
			console.log("it got here")
			// res.cookie('user', JSON.stringify({
			// 	'user': req.user
			// }))
			res.render('zombiebook/index', { state : 'loggedinsuccessfully', friends: req.user.facebook.friends})
		});

	app.post('/zombiebook/logout', function (req, res) {
		req.logout();
		res.redirect('/zombiebook');
		res.clearCookie('user');
		console.log("someone just logged out")
	});

	// ======================================================================================== //
	// ----------------------------------- twittype  ------------------------------------------ //
	// ======================================================================================== //
	app.get('/twittype', function (req, res) {
			res.render('twittype/index.ejs', { state : 'not logged in', username : 'l', tweets: [] })
	});

	app.get('/twittype/twitter', passport.authenticate('twitter'))

	// original
	app.get('/twittype/twitter/callback',
		passport.authenticate('twitter'), function(req, res) {
			var tweets = [];
			var t = new twitter({
			    consumer_key: 'Spruia06VrVpXoKa4jdBw',       
			    consumer_secret: 'EJF0RlIetZeAlul4Bl9aNTg6MBJcRybdjaLQeWaaHqo',      
			    access_token_key: req.user.twitter.token, 
			    access_token_secret: req.user.twitter.tokenSecret,
			});
			t.get(
				  '/statuses/user_timeline',
				  {count: 20, screen_name: req.user.twitter.username},
				function logResponse(error, data, response) {
				  for (var i = 0; i < data.length; i++) {
				  	tweets.push(data[i].text)
				  }
				  res.render('twittype/index.ejs', { state : 'loggedinsuccessfully', username: req.user.twitter.username, tweets: tweets})
				});
		});

	app.post('/twittype/logout', function (req, res) {
		req.logout();
		res.redirect('/twittype');
		res.clearCookie('user');
		console.log("someone just logged out")
	});

	// ======================================================================================== //
	// ----------------------------------- twittext  ------------------------------------------ //
	// ======================================================================================== //

	app.get('/twittext', function (req, res) {
			res.render('twittext/index.ejs');
	});

	app.get('/twittext/twitter', passport.authenticate('twitterTextStrategy'))

	app.get('/twittext/twitter/callback',
		passport.authenticate('twitterTextStrategy'), function(req, res) {
			console.log("req.user")
			console.log(req.user)
			var t = new twitter({
			    consumer_key: 'yur1W5rQghWp7SD5702rg',       
			    consumer_secret: '9Y2HZcWIXATRccbZx2PzffO89WQHoRTF9MZ0Yki4Tok',      
			    access_token_key: req.user.twitter.token, 
			    access_token_secret: req.user.twitter.tokenSecret,
			});

			var hashtags = [];
			// declaring it
			function logResponse(error, data, callback) {
				for (var i = 0; i < data.length; i++) {
					if (data[i].text.length > 1) {
							var split = data[i].text.split(" ");
							for (var j = 0; j < split.length; j++) {
								hashtags.push(split[j])
							}
					}
				}
				callback()
			}
			// declaring it
			function sendCookie() {
				if(req.user) {
				    role = 1;
				    username = req.user.twitter.username;

				    res.cookie('user', JSON.stringify({
				        'username': username,
				        'role': role,
				        'hashtags': hashtags,
				    }));

				    res.redirect('/twittext');
				}
			}

	t.get(
		  '/statuses/home_timeline',
		  {count: 20, trim_user: true}, function(error, data) {
		  		logResponse(error, data, sendCookie)
		  		// both functions used as callbacks
		  });


	});
	
	app.post('/twittext/logout', function (req, res) {
		req.logout();
		res.redirect('/twittext');
		console.log("someone just logged out")
	});



	// ======================================================================================== //
	// ----------------------------------- this year  ----------------------------------------- //
	// ======================================================================================== //

	app.get('/thisyear', function (req, res) {
			dbThisYear.thisYearCollection.find(function(err, data) {
				res.render('thisyear/index.ejs', {data: data});
			}) 
	});

	app.post("/thisyear", function (req, res) {
		var message = sanitizer.sanitize(req.body.message.slice(0, 255));
		console.log(message)

		if (_.isUndefined(message) || _.isEmpty(message.trim())) {
			return res.json(400, {error: "message is invalid"});
		}
		
		dbThisYear.thisYearCollection.save({message: message}, function(err, saved) {
		  if( err || !saved ) console.log("message not saved in db");
		  else console.log("message in db");
		  
		  dbThisYear.thisYearCollection.find(function(err, data) {
		  	res.send({data: data})
		  }) 
		});
	})

	// ======================================================================================== //
	// ----------------------------------- wikiarea  ----------------------------------------- //
	// ======================================================================================== //

	app.get('/wikiarea', function (req, res) {
		res.render('wikiarea/index2.ejs');
	});

	// ======================================================================================== //
	// -------------------------------------- rps  -------------------------------------------- //
	// ======================================================================================== //

	app.get('/rps', function (req, res) {
		res.render('rps/index.ejs');
	});

	// ======================================================================================== //
	// -------------------------------------- beat  -------------------------------------------- //
	// ======================================================================================== //

	app.get('/beat', function (req, res) {
		res.render('beat/index.ejs');
	});

	// ======================================================================================== //
	// -------------------------------------- magnet  ------------------------------------------ //
	// ======================================================================================== //

	app.get('/poetry', function (req, res) {
		res.render('magnet/index.ejs');
	});

	// ======================================================================================== //
	// ----------------------------------- colorsquare  --------------------------------------- //
	// ======================================================================================== //

	app.get('/lights', function (req, res) {
		dbLightShow.lightCollection.find(function(err, data) {
			res.render('colorsquare/index.ejs', {color: data})
		}) 
	});

	function isHexaColor(sNum){
	  return (typeof sNum === "string") && sNum.length === 6 
	         && ! isNaN( parseInt(sNum, 16) );
	}


	app.post('/lights', function (req, res) {
		var colorPre = sanitizer.sanitize(req.body.color);
		
		var colorTest = colorPre.split("").splice(1).join("")
		if (isHexaColor(colorTest) === true) {
			dbLightShow.lightCollection.save({color: colorPre}, function(err, saved) {
			  if( err || !saved ) console.log("color not saved in db");
			  else console.log("color in db");
			  dbLightShow.lightCollection.count(function(err, number) {
			  	res.send(number.toString())
			  })
			});
		}
	});


	// ======================================================================================== //
	// ----------------------------------- pictionary  ---------------------------------------- //
	// ======================================================================================== //

	app.get('/pictionary', function (req, res) {
		res.render('pictionary/index.ejs');
	});



} 
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();

	res.redirect('/auth'); 
}
function isLoggedInGuessBook(req, res, next) {
	if (req.isAuthenticated())
		return next();

	res.redirect('/guestbook'); 
}