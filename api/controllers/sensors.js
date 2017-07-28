'use strict';
var database = require('modules/database');
var users = require('./users');
var crypto = require('crypto');
var stream = require('stream');
var mongodb = require('mongodb');

var DBPREFIX=process.env.MONGODB_DATABASE || 'sensorsbank';


module.exports = {
	addsensorsdata:addsensorsdata,
	listsensors:listsensors,
	getsensordata:getsensordata
};

function addsensordata(elt, sensors, i, userdb) {
	return new Promise(function(resolve) {
		if (i<sensors.length) {
			elt.value=sensors[i].value;
			if (sensors[i].name!=="") {
				userdb.collection("sensor_"+sensors[i].name).insertOne(elt)
				.then(function(result) {
					console.log('saved sensor '+sensors[i].name+' to database');
					addsensordata(elt,sensors, ++i, userdb).then(function () {resolve()});
				})
				.catch(function(err) {
					console.log('failed to saved sensor '+sensors[i].name+' to database');
					addsensordata(elt,sensors, ++i, userdb).then(function () {resolve()});
				});
			} else {
				console.log('sensor '+i+' has no name');
				addsensordata(elt,sensors, ++i,userdb).then(function () {resolve()});
			}
		} else {
			console.log('no more sensor to add');
			resolve();
		}
	});
}

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
				elt.secondes=date.getSeconds();
				var i=0;
				addsensordata(elt,req.body.sensors,i,userdb )
				.then(function () {
   					userdb.close();
    				db.close();
    				res.statusCode=200;
    				res.contentType("application/json");
    				res.end();

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

function listsensors(req, res) {
	database.connect().then(function(db) {
		users.checkApiKey(db, req.swagger.params.ApiKey.value).then(function(user) {
			if ((user===null) || (user === undefined)) {
				res.statusCode=403;
				var message={'code': 403, 'message': 'User not allowed'};
				res.json(message);
			} else {
				var userdb = db.db(DBPREFIX+"_"+user.userid);
				userdb.listCollections().toArray().then(function(collections) {
					console.log("Collections " +JSON.stringify(collections));
					var result=new Array();
					for (var i=0; i<collections.length; i++) {
						if (collections[i].name.startsWith("sensor_")) {
							var name=collections[i].name.replace("sensor_","");
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


function getsensordata(req, res) {
	database.connect().then(function(db) {
		users.checkApiKey(db, req.swagger.params.ApiKey.value).then(function(user) {
			if ((user===null) || (user === undefined)) {
				res.statusCode=403;
				var message={'code': 403, 'message': 'User not allowed'};
				res.json(message);
			} else {
				var userdb = db.db(DBPREFIX+"_"+user.userid);
				var result=new Array();
				console.log("Retreiving sesnsor data : "+req.swagger.params.sensor.value);
				userdb.collection("sensor_"+req.swagger.params.sensor.value).find().forEach(function(data) {
					//{_id" : ObjectId("596f6bb251dfc40342e1e4aa"), "length" : 2818380, "chunkSize" : 261120, "uploadDate" : ISODate("2017-07-19T14:24:50.522Z"),
					//d5" : "11fdd9f6271a312f3d3450c202d6b04f", "filename" : "2017-03-15.jpg", "contentType" : "image/jpeg" }

					var elt={};
					elt.date=new Date(data.year,data.month, data.day,data.hours, data.minutes, data.secondes || 0);
					elt.value=data.value;
					result.push(elt);
  				}, function(error) {
					console.log("End of forEach "+JSON.stringify(result));
					userdb.close();
					db.close();
					res.statusCode=200;
					res.json(result);
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
