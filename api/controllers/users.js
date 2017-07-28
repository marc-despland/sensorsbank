'use strict';
var database = require('modules/database');
const crypto = require('crypto');

var ADMINKEY=process.env.ADMIN_KEY || "efec80962d1221715bb7543a791258fea80f3331b0d0c4c3636fde03a71f978e";

module.exports = {
	createUser:createUser,
	listUsers:listUsers,
	getUser:getUser,
	updateUser:updateUser,
	deleteUser:deleteUser,
	checkApiKey:checkApiKey
};

function sha256(source) {
	var hash = crypto.createHash('sha256');
	hash.update(source);
	return (hash.digest('base64'));
}

function createId() {
	var value=Math.random()*10000000;
	var result=sha256(value+" "+Date.now());
	result=result.replace(/\//g,"E");
	result=result.replace(/\+/g,"K");
	result=result.replace(/=/g,"i");
	result=result.replace(/-/g,"a");
	result=result.replace(/_/g,"O");
	console.log('CreateId :' + result);
	return(result);
}

function createUserId(db) {
	return new Promise(function(resolve, reject) {
		var userid=createId();
		console.log("Generated id : "+ userid)
		db.collection('users').count({"userid": userid}).then(function(count){
			if (count==0) {
				resolve(userid);
			} else {
				createUserId(db).then(function(userid) {
					resolve(userid);
				}).catch( function(err) {
					reject(err);
				});
			}
		}, function(error) {
			console.log("Failed to count users with userid");
			reject(error);
		});
	});
}
function createApiKey(db) {
	return new Promise(function(resolve, reject) {
		var apikey=createId();
		console.log("Generated id : "+ apikey)
		db.collection('users').count({"apikey": apikey}).then(function(count){
			if (count==0) {
				resolve(apikey);
			} else {
				createApiKey(db).then(function(apikey) {
					resolve(apikey);
				}).catch( function(err) {
					reject(err);
				});
			}
		}, function(error) {
			console.log("Failed to count users with apikey");
			reject(error);
		});
	});
}


function checkApiKey(db, apikey) {
	return new Promise(function(resolve, reject) {
		db.collection('users').findOne({"apikey": apikey}).then(function(user) {
			delete user._id;
			resolve(user);
		}).catch(function(err) {
			reject(err);
		});
	});
}


function createUser(req, res) {
	if (req.swagger.params.AdminKey.value===ADMINKEY) {
		database.connect()
		.then(function(db) {
			var user={};
			user.name=req.body.name;
			createApiKey(db).then(function(apikey) {
				user.apikey=apikey;
				createUserId(db).then(function(userid) {
					user.userid=userid;
					console.log(JSON.stringify(user));
					db.collection('users').insertOne(user)
					.then(function(result) {
						db.close();
						res.statusCode=201;
						console.log('saved to database');
						delete user._id;
						res.json(user);
					})
					.catch(function(err) {
						console.log(err);
						res.statusCode=500;
						var message={'code': 500, 'message': err};
						res.json(message);
					});
				})
				.catch(function(err) {
					console.log(err);
					res.statusCode=500;
					var message={'code': 500, 'message': err};
					res.json(message);
				});
			}).catch(function(err) {
				console.log(err);
				res.statusCode=500;
				var message={'code': 500, 'message': err};
				res.json(message);

			});
		})
		.catch(function(err) {
			console.log(err);
			res.statusCode=500;
			var message={'code': 500, 'message': 'We have a database issue'};
			res.json(message);
		});
	} else {
			res.statusCode=403;
			var message={'code': 403, 'message': 'You are not allowed to execute this request'};
			res.json(message);		
	}

}


function listUsers(req, res) {
	if (req.swagger.params.AdminKey.value===ADMINKEY) {
		database.connect()
		.then(function(db) {
			var result=new Array();
			db.collection('users').find().forEach(function(user) {
				delete user._id;
				delete user.id;
				result.push(user);
				console.log(user);
				console.log("Adding an user : "+ user.userid);
			}, function(error) {
				console.log("End of forEach");
				db.close();
				console.log(JSON.stringify(result));
				res.statusCode=200;
				res.json(result);
			});
		})
		.catch(function(err) {
			console.log(err);
			res.statusCode=500;
			var message={'code': 500, 'message': 'We have a database issue'};
			res.json(message);
		});
	} else {
			res.statusCode=403;
			var message={'code': 403, 'message': 'You are not allowed to execute this request'};
			res.json(message);		
	}

}
function getUser(req, res) {
	if (req.swagger.params.AdminKey.value===ADMINKEY) {
		database.connect()
		.then(function(db) {
			db.collection('users').findOne({"userid": req.swagger.params.userid.value}).then(function(user) {
				if ((user===null) || (user === undefined)) {
					res.statusCode=404;
					var message={'code': 404, 'message': 'User not found'};
					res.json(message);
				} else {
					delete user._id;
					db.close();
					console.log(JSON.stringify(user));
					res.statusCode=200;
					res.json(user);
				}
			}).catch(function(err) {
				console.log(err);
				res.statusCode=500;
				var message={'code': 500, 'message': 'We have a database issue'};
				res.json(message);
			});

		})
		.catch(function(err) {
			console.log(err);
			res.statusCode=500;
			var message={'code': 500, 'message': 'We have a database issue'};
			res.json(message);
		});
	} else {
			res.statusCode=403;
			var message={'code': 403, 'message': 'You are not allowed to execute this request'};
			res.json(message);		
	}

}

function deleteUser(req, res) {
	if (req.swagger.params.AdminKey.value===ADMINKEY) {
		database.connect()
		.then(function(db) {
			db.collection('users').deleteMany({"userid": req.swagger.params.userid.value}).then(function() {
				db.close();
				res.statusCode=200;
				res.contentType("application/json");
				res.end();
			}).catch(function(err) {
				console.log(err);
				res.statusCode=500;
				var message={'code': 500, 'message': 'We have a database issue'};
				res.json(message);
			});
		})
		.catch(function(err) {
			console.log(err);
			res.statusCode=500;
			var message={'code': 500, 'message': 'We have a database issue'};
			res.json(message);
		});
	} else {
			res.statusCode=403;
			var message={'code': 403, 'message': 'You are not allowed to execute this request'};
			res.json(message);		
	}

}

function updateUser(req, res) {
	if (req.swagger.params.AdminKey.value===ADMINKEY) {
		database.connect()
		.then(function(db) {
			var user={};
			if (req.body.name!==undefined) user.name=req.body.name;
			if (req.body.apikey!==undefined) user.apikey=req.body.apikey;
			db.collection('users').findAndModify({"userid": req.swagger.params.userid.value},{},{$set: user}).then(function(result){
				db.collection('users').findOne({"userid": req.swagger.params.userid.value}).then(function(user) {
					if ((user===null) || (user === undefined)) {
						res.statusCode=404;
						var message={'code': 404, 'message': 'User not found'};
						res.json(message);
					} else {
						delete user._id;
						db.close();
						console.log(JSON.stringify(user));
						res.statusCode=200;
						res.json(user);
					}
				}).catch(function(err) {
					console.log(err);
					res.statusCode=500;
					var message={'code': 500, 'message': 'We have a database issue'};
					res.json(message);
				});
			}).catch(function(err) {
				console.log(err);
				res.statusCode=500;
				var message={'code': 500, 'message': 'We have a database issue'};
				res.json(message);
			});
		}).catch(function(err) {
			console.log(err);
			res.statusCode=500;
			var message={'code': 500, 'message': 'We have a database issue'};
			res.json(message);
		});
	} else {
			res.statusCode=403;
			var message={'code': 403, 'message': 'You are not allowed to execute this request'};
			res.json(message);		
	}

}
