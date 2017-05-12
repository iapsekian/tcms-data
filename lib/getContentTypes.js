/*jshint esversion: 6 */

var fs = require('fs');
var debug = require('debug');
const util = require('util');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;


// var targetEnv = process.argv.slice(2)[0];
// var dbOPSwitch = process.argv.slice(3)[0];
// 
// options = {
// 	ctnTypeId: {}, //from getContentTypeId.js (not reversedListing)
// 	projection:{},
// 	targetEnv: '',
// 	dbOPSwitch: ''
// }

module.exports = (options, callback) => {

	var ctnTypeId = options.ctnTypeId;
	var ctnTypeName = Object.keys(ctnTypeId);
	var targetEnv = options.targetEnv;
	var dbOPSwitch = options.dbOPSwitch;

	var productionEnv = false;
	var testEnv = false;
	var operateDB = false;

	var debugDev = debug('dev');	

	if('PRODUCTION' === targetEnv){
		//debugDev('*** CAUTION!!! NOW this program will operate the PRODUCTION ENV.!!! ***');
		productionEnv = true;
		if('OPDB' === dbOPSwitch){
			// debugDev('*** & Database will be CHANGED!!! ***');
			operateDB = true;
		} else {
			// debugDev('*** BUT Database will remain unchanged.  ***');
		}
	} else if('TEST' === targetEnv){
		// debugDev('*** Operate TEST ENV. ***');
		testEnv = true;
		if('OPDB' === dbOPSwitch){
			// debugDev('*** & Database will be CHANGED!!! ***');
			operateDB = true;
		} else {
			// debugDev('*** BUT Database will remain unchanged.  ***');
		}
	} else if('OPDB' === targetEnv){
		// debugDev('*** Operate TEST ENV. ***');
		// debugDev('*** & Database will be CHANGED!!! ***');
		targetEnv = 'TEST';
		testEnv = true;
		operateDB = true;
	} else {
		// debugDev('*** Operate TEST ENV. ***');
		// debugDev('*** BUT Database will remain unchanged.  ***');
		targetEnv = 'TEST';
		testEnv = true;	

		// debugDev('Arguments Example - ');
		// debugDev('	node xxx.js PRODUCTION');
		// debugDev('	node xxx.js PRODUCTION OPDB');
		// debugDev('	node xxx.js TEST === node xxx.js');
		// debugDev('	node xxx.js TEST OPDB === node xxx.js OPDB');
	}


	//DB definition/value

	if(productionEnv){
		var mdbUrl = 'mongodb://52.39.111.227:27017/tourbooks';
	} else if (testEnv){
		var mdbUrl = 'mongodb://tst.tourbooks.cc:27017/tourbooks';
	}

	//var ctnTypeName = ['Tour Type','Tour Category','Tour Destination'];
	var ctnTypeNameCount = ctnTypeName.length;
	var contentTypes = {};
		// contentTypes = {
		// 	"type1": {record1},
		// 	"type2": {record}
		// }

	//base configuration

	MongoClient.connect(mdbUrl, (err, db) => {
		//if(null === err) debugDev("Connected successfully to server - " + mdbUrl);

		var cltContentTypes = db.collection('ContentTypes');

		var preparingData = () => {

			var count = ctnTypeNameCount;
			var wait4GetContentsEnd = ()=>{
				count--;
				if(!count){
					//debugDev('contentTypes = ' + JSON.stringify(contentTypes));
					fs.writeFileSync('./logs/contentTypes-' + targetEnv + '.json', JSON.stringify(contentTypes));
					endProgram();
				}
			};

			if(ctnTypeNameCount !== 0){
				ctnTypeName.forEach((name)=>{
					var qry = {'_id': ObjectID.createFromHexString(ctnTypeId[name])};
					var prj = options.projection;
					cltContentTypes.find(qry).project(prj).toArray()
						.then( (d)=>{
							d.forEach( (item) => {
								contentTypes[name] = item;
							});
							
							wait4GetContentsEnd();
						})
						.catch( (e)=>{
							console.log('Finding contentTypes error! - ' + e);
						});
				});
			} else if (ctnTypeNameCount === 0){
				var qry = {};
				var prj = options.projection;
				cltContentTypes.find(qry).project(prj).toArray()
					.then( (d)=>{
						d.forEach( (item) => {
							contentTypes = item;
						});
						
						count = 1;
						wait4GetContentsEnd();
					})
					.catch( (e)=>{
						console.log('Finding contentTypes error! - ' + e);
					});
			}
		};

		var endProgram = ()=>{
			db.close();
			//debugDev('*** Finished!! ***');
			callback(contentTypes);
		}

		// Starting point
		preparingData();
	});
};	