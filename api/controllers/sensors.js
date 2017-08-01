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
	getsensordata:getsensordata,
	groupsensordata:groupsensordata
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
				var datalist=new Array();
				var limit=100;
				if (undefined !== req.swagger.params.limit.value) limit=req.swagger.params.limit.value;
				
				var offset=0;
				if (undefined !== req.swagger.params.offset.value) offset=req.swagger.params.offset.value;

				var order=-1;
				if (undefined !== req.swagger.params.order.value) {
					if (req.swagger.params.order.value === "asc") {
						order=1;
					} else {
						order=-1;
					}
				}
				var orderquery={'year':order,'month':order,'day':order,'hours':order,'minutes':order};
				console.log("Retreiving sesnsor data : "+req.swagger.params.sensor.value);
				userdb.collection("sensor_"+req.swagger.params.sensor.value).count().then(function(count) {
					userdb.collection("sensor_"+req.swagger.params.sensor.value).find().sort(orderquery).limit(limit).skip(offset).forEach(function(data) {
						console.log("Found one element "+JSON.stringify(data));
						var elt={};
						elt.date=new Date(data.year,data.month, data.day,data.hours, data.minutes, data.secondes || 0);
						elt.value=data.value;
						datalist.push(elt);
	  				}, function(error) {
						console.log("End of forEach "+JSON.stringify(datalist));
						userdb.close();
						db.close();
						res.statusCode=200;
						var result={};
						result.count=count;
						result.offset=offset;
						result.data=datalist;
						res.json(result);
					});
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

function groupsensordata(req, res) {
	database.connect().then(function(db) {
		users.checkApiKey(db, req.swagger.params.ApiKey.value).then(function(user) {
			if ((user===null) || (user === undefined)) {
				res.statusCode=403;
				var message={'code': 403, 'message': 'User not allowed'};
				res.json(message);
			} else {
				var groupby = req.swagger.params.groupby.value;
				var userdb = db.db(DBPREFIX+"_"+user.userid);
				var datalist=new Array();

				var match={};
				if (undefined !== req.swagger.params.year.value) match.year=req.swagger.params.year.value;
				if (undefined !== req.swagger.params.month.value) match.month=req.swagger.params.month.value-1;
				if (undefined !== req.swagger.params.day.value) match.day=req.swagger.params.day.value;

				var aggregate=new Array();
				if ((match.year!== undefined) || (match.month!== undefined) || (match.day!== undefined)) {
					var elt={};
					elt.$match=match;
					aggregate.push(elt);
				}
				var elt={};
				elt.$group={};
				elt.$group._id="$"+groupby;
				elt.$group.value={ $avg: "$value"};
				aggregate.push(elt);
				console.log("Aggregate : "+JSON.stringify(aggregate));
				var cursor=userdb.collection("sensor_"+req.swagger.params.sensor.value).aggregate(aggregate, {cursor: {batchSize:1}}).sort({_id:1});
				cursor.each(function(error,data) {
					if (data!==null) {
						console.log("Found one element "+JSON.stringify(data));
						var elt={};
						elt.id=data._id;
						if (groupby==="month") elt.id++;
						elt.value=data.value;
						datalist.push(elt);
					} else {
						console.log("ERROR : "+error);
						console.log("End of forEach "+JSON.stringify(datalist));
						userdb.close();
						db.close();
						res.statusCode=200;
						res.json(datalist);
					}
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

