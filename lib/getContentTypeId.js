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
// 	ctnTypeName: [],
// 	reversedListing: boolean, // undefined --> default: false
// 	targetEnv: '',
// 	dbOPSwitch: ''
// }

module.exports = (options, callback) => {

	var ctnTypeName = options.ctnTypeName;
	if(util.isNullOrUndefined(options.reversedListing))	options.reversedListing = false;
	var reversedListing = options.reversedListing;
	var targetEnv = options.targetEnv;
	var dbOPSwitch = options.dbOPSwitch;

	var productionEnv = false;
	var testEnv = false;
	var operateDB = false;

	var debugDev = debug('dev');	

	if('PRODUCTION' === targetEnv){
		productionEnv = true;
		if('OPDB' === dbOPSwitch){
			operateDB = true;
		} else {
		}
	} else if('TEST' === targetEnv){
		testEnv = true;
		if('OPDB' === dbOPSwitch){
			operateDB = true;
		} else {
		}
	} else if('OPDB' === targetEnv){
		targetEnv = 'TEST';
		testEnv = true;
		operateDB = true;
	} else {
		targetEnv = 'TEST';
		testEnv = true;	
	}


	//DB definition/value

	if(productionEnv){
		var mdbUrl = 'mongodb://52.39.111.227:27017/tourbooks';
	} else if (testEnv){
		var mdbUrl = 'mongodb://tst.tourbooks.cc:27017/tourbooks';
	}

	//var ctnTypeName = ['Tour Type','Tour Category','Tour Destination'];
	var ctnTypeNameCount = ctnTypeName.length;
	var ctnTypeId = {};
		// ctnTypeId = {
		// 	"Paris": "xxxxxxxxxxx",
		// 	"London": "xxxxxxxxxxx"
		// }

	//base configuration

	MongoClient.connect(mdbUrl, (err, db) => {

		var cltCtnTypes = db.collection('ContentTypes');

		var preparingData = () => {

			// get taxonomy vovaculary and id mapping
			var getCtnTypeId = ()=>{
				var count = ctnTypeNameCount;
				var wait4CtnTypeIdEnd = ()=>{
					count--;
					if(!count){
						if(reversedListing){
							fs.writeFileSync('./logs/ctnTypeIdReversed-' + targetEnv + '.json', JSON.stringify(ctnTypeId));
						} else {
							fs.writeFileSync('./logs/ctnTypeId-' + targetEnv + '.json', JSON.stringify(ctnTypeId));							
						}
						endProgram();
					}
				};

				if(ctnTypeNameCount !== 0){
					ctnTypeName.forEach((name)=>{
						var qry = {'type': name};
						var prj = {'_id':1, 'type': 1};
						cltCtnTypes.find(qry).project(prj).toArray()
							.then( (d)=>{
								d.forEach( (item)=>{
									if(reversedListing){
										ctnTypeId[item._id.toString()] = item.type.replace(/\s+/g,'');
									} else {
										ctnTypeId[item.type.replace(/\s+/g,'')] = item._id.toString();
									}
								});
								wait4CtnTypeIdEnd();
							})
							.catch( (e)=>{
								console.log('Finding content type ID error! - ' + e);
							});
					});
				} else if (ctnTypeNameCount === 0){
					var qry = {};
					var prj = {'_id':1, 'type': 1};
					cltCtnTypes.find(qry).project(prj).toArray()
						.then( (d)=>{
							count = 1;
							d.forEach( (item)=>{
								if(reversedListing){
									ctnTypeId[item._id.toString()] = item.type.replace(/\s+/g,'');
								} else {
									ctnTypeId[item.type.replace(/\s+/g,'')] = item._id.toString();
								}
							});
							wait4CtnTypeIdEnd();
						})
						.catch( (e)=>{
							console.log('Finding content type ID error! - ' + e);
						});
				}
			}

			// preparingData starting point
			getCtnTypeId();
		};

		var endProgram = ()=>{
			db.close();
			callback(ctnTypeId);
		}

		// Starting point
		preparingData();
	});
};	