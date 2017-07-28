'use strict';
var database = require('modules/database');
var users = require('./users');
const crypto = require('crypto');
var stream = require('stream');
var mongodb = require('mongodb');

var DBPREFIX=process.env.MONGODB_DATABASE || 'imagesbank';

module.exports = {
	listCollections:listCollections,
	uploadImage:uploadImage,
	listImages:listImages,
	downloadImage:downloadImage,
	deleteCollection:deleteCollection,
	deleteImage:deleteImage
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

function getImage(db,collection,imageid) {
	return new Promise(function(resolve, reject) {
		var o_id=database.objectid(imageid);
		db.collection(collection+".files").findOne({"_id": o_id}).then(function(file) {
			if (file===null) {
				reject("File "+imageid+" on collection "+collection+" doesn't exist");
			} else {
				resolve(file);
			}
		}).catch(function(error) {
			console.log("Failed to retrieve image");
			reject(error);
		});
	});
	
}


function listCollections(req, res) {
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


function deleteCollection(req, res) {
	database.connect().then(function(db) {
		users.checkApiKey(db, req.swagger.params.ApiKey.value).then(function(user) {
			if ((user===null) || (user === undefined)) {
				res.statusCode=403;
				var message={'code': 403, 'message': 'User not allowed'};
				res.json(message);
			} else {
				var userdb = db.db(DBPREFIX+"_"+user.userid);
				var options={};
				options.bucketName=req.swagger.params.collection.value;
				console.log("Creation of the Bucket");
				var bucket = new mongodb.GridFSBucket(userdb,options);
				console.log("Try to delete the Bucket");
				bucket.drop().then(function() {
					console.log("Collection "+req.swagger.params.collection.value+" deleted");
					userdb.close();
					db.close();
					res.contentType("application/json");
					res.statusCode=200;
					res.end();

				}).catch(function(err) {
					console.log("Drop :" +err);
					userdb.close();
					db.close();
					res.statusCode=500;
					var message={'code': 500, 'message': 'Failed to delete the collection'};
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

function deleteImage(req, res) {
	database.connect().then(function(db) {
		users.checkApiKey(db, req.swagger.params.ApiKey.value).then(function(user) {
			if ((user===null) || (user === undefined)) {
				res.statusCode=403;
				var message={'code': 403, 'message': 'User not allowed'};
				res.json(message);
			} else {
				var userdb = db.db(DBPREFIX+"_"+user.userid);
				var options={};
				options.bucketName=req.swagger.params.collection.value;
				var bucket = new mongodb.GridFSBucket(userdb,options);
				console.log("Try to delete the image : "+req.swagger.params.imageid.value);
				bucket.delete(database.objectid(req.swagger.params.imageid.value)).then(function() {
					console.log("Image "+req.swagger.params.imageid.value+" deleted");
					userdb.close();
					db.close();
					res.contentType("application/json");
					res.statusCode=200;
					res.end();

				}).catch(function(err) {
					console.log("Drop :" +err);
					userdb.close();
					db.close();
					res.statusCode=500;
					var message={'code': 500, 'message': 'Failed to delete the image'};
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


function listImages(req, res) {
	database.connect().then(function(db) {
		users.checkApiKey(db, req.swagger.params.ApiKey.value).then(function(user) {
			if ((user===null) || (user === undefined)) {
				res.statusCode=403;
				var message={'code': 403, 'message': 'User not allowed'};
				res.json(message);
			} else {
				var userdb = db.db(DBPREFIX+"_"+user.userid);
				var result=new Array();
				userdb.collection(req.swagger.params.collection.value+".files").find().forEach(function(file) {
					//{_id" : ObjectId("596f6bb251dfc40342e1e4aa"), "length" : 2818380, "chunkSize" : 261120, "uploadDate" : ISODate("2017-07-19T14:24:50.522Z"),
					//d5" : "11fdd9f6271a312f3d3450c202d6b04f", "filename" : "2017-03-15.jpg", "contentType" : "image/jpeg" }

					var elt={};
					elt.imageid=file._id;
					elt.length=file.length;
					elt.contentType=file.contentType;
					elt.filename=file.filename;
					elt.md5=file.mde5;
					elt.uploadDate=file.uploadDate;
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

function uploadImage(req, res) {
	database.connect().then(function(db) {
		users.checkApiKey(db, req.swagger.params.ApiKey.value).then(function(user) {
			if ((user===null) || (user === undefined)) {
				res.statusCode=403;
				var message={'code': 403, 'message': 'User not allowed'};
				res.json(message);
			} else {
				//console.log(JSON.stringify(req.swagger.params.image));
				var userdb = db.db(DBPREFIX+"_"+user.userid);
				var options={};
				options.bucketName=req.swagger.params.collection.value;
				var bucket = new mongodb.GridFSBucket(userdb,options);
				var bufferStream = new stream.PassThrough();
				bufferStream.end(req.swagger.params.image.originalValue.buffer);
				var streamoptions={};
				streamoptions.contentType=req.swagger.params.image.originalValue.mimetype;
				var uploadStream=bucket.openUploadStream(req.swagger.params.image.originalValue.originalname,streamoptions);
				var id = uploadStream.id;

				bufferStream.pipe(uploadStream).
				    on('error', function(error) {
      					console.log(err);
						res.statusCode=500;
						var message={'code': 500, 'message': error};
						res.json(message);
    				}).
    				on('finish', function() {
      					console.log('done! '+id);
      					res.contentType("application/json");
      					res.statusCode=200;
      					var image={};
      					image.imageid=id;
      					res.json(image);
    				});

			}
		}).catch(function(err) {
			console.log(err);
			res.statusCode=500;
			db.close();
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


function downloadImage(req, res) {
	database.connect().then(function(db) {
		users.checkApiKey(db, req.swagger.params.ApiKey.value).then(function(user) {
			if ((user===null) || (user === undefined)) {
				res.statusCode=403;
				var message={'code': 403, 'message': 'User not allowed'};
				res.json(message);
			} else {
				//console.log(JSON.stringify(req.swagger.params.image));
				var userdb = db.db(DBPREFIX+"_"+user.userid);
				var options={};
				options.bucketName=req.swagger.params.collection.value;
				var bucket = new mongodb.GridFSBucket(userdb,options);
				getImage(userdb, req.swagger.params.collection.value, req.swagger.params.imageid.value).then(function(file) {
					console.log(bucket);
					var downloadStream=bucket.openDownloadStream(file._id).on('error', function(error) {
						console.log("open error : "+ error);
					});
					console.log("File id : "+file._id);
					res.statusCode=200;
					res.contentType(file.contentType);
					downloadStream.on('error', function(error) {
						console.log("Download error : "+ error);
					});
					downloadStream.on('data', function(data) {
						console.log("Download data : "+ data.length);
						res.write(data);
					});
					downloadStream.on('end', function() {
						userdb.close();
						db.close();
						res.end();
					});
					//downloadStream.pipe(res);
				}).catch(function(err) {
					console.log(err);
					res.statusCode=500;
					userdb.close();
					db.close();
					var message={'code': 500, 'message': err};
					res.json(message);
				});
			}
		}).catch(function(err) {
			console.log(err);
			res.statusCode=500;
			db.close();
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
