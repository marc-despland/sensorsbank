'use strict';
var database = require('modules/database');
var users = require('./users');
var crypto = require('crypto');
var stream = require('stream');
var mongodb = require('mongodb');

var DBPREFIX=process.env.MONGODB_DATABASE || 'sensorsbank';


module.exports = {
	addsensorsdata:addsensorsdata
};

function addsensorsdata(req, res) {
	database.connect().then(function(db) {
		users.checkApiKey(db, req.swagger.params.ApiKey.value).then(function(user) {
			if ((user===null) || (user === undefined)) {
				res.statusCode=403;
				var message={'code': 403, 'message': 'User not allowed'};
				res.json(message);
			} else {
				var userdb = db.db(DBPREFIX+"_"+user.userid);
				var date =new Date(req.body.date);
				var elt={};
				elt.year=date.getFullYear();
				elt.month=date.getMonth();
				elt.day=date.getDate();
				elt.hours=date.getHours();
				elt.minutes=date.getMinutes();

				for (var i=0; i<req.body.sensors.length; i++) {
					elt.value=req.body.sensors[i].value;
					
				}



				userdb.listCollections().toArray().then(function(collections) {
					console.log("Collections " +JSON.stringify(collections));
					var result=new Array();
					for (var i=0; i<collections.length; i++) {
						if (collections[i].name.endsWith(".files")) {
							var name=collections[i].name.replace(".files","");
							result.push(name);
						}
					}
    				userdb.close();
    				db.close();
    				res.statusCode=200;
    				res.json(result);
  				}).catch(function(err) {
					console.log(err);
					res.statusCode=500;
					var message={'code': 500, 'message': err};
					res.json(message);
				});
			}
		}).catch(function(err) {
			console.log(err);
			db.close();
			res.statusCode=500;
			var message={'code': 500, 'message': err};
			res.json(message);
		});
	}).catch(function(err) {
		console.log(err);
		res.statusCode=500;
		var message={'code': 500, 'message': 'We have a database issue'};
		res.json(message);
	});

}
