/*jshint esversion: 6 */

var fs = require('fs');
var debug = require('debug');
var debugDev = debug('dev');	
const util = require('util');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;


// var targetEnv = process.argv.slice(2)[0];
// var dbOPSwitch = process.argv.slice(3)[0];
// 
// options = {
// 	txVocName: [],
// 	targetEnv: '',
// 	dbOPSwitch: ''
// }

module.exports = (options, callback) => {

	var txVocName = options.txVocName.slice(); //clone array
	var targetEnv = options.targetEnv;
	var dbOPSwitch = options.dbOPSwitch;

	var productionEnv = false;
	var testEnv = false;
	var operateDB = false;


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

	var txVocNameCount = txVocName.length;
	var taxonomies = {};
		// txTermsId = {
		// 		"TourDestination": {
		// 			"Paris": "xxxxxxxxxxx",
		// 			"London": "xxxxxxxxxxx"
		// 		},
		// 		"TourCategory": {}
		// }

	//base configuration

	MongoClient.connect(mdbUrl, (err, db) => {
//		if(null === err) debugDev("Connected successfully to server - " + mdbUrl);

		var cltTX = db.collection('Taxonomy');


		var endProgram = ()=>{
			db.close();
			// debugDev('*** Finished!! ***');
			callback(taxonomies);
		}

		var count = txVocNameCount;
		var wait4TaxonomiesEnd = ()=>{
			count--;
			if(!count){
				// debugDev('taxonomies = ' + JSON.stringify(taxonomies));
				fs.writeFileSync('./logs/taxonomies-' + targetEnv + '.json', JSON.stringify(taxonomies));
				endProgram();
			}
		};

		if(txVocNameCount !== 0){ //assign specific vocabularies
			txVocName.forEach((vocName)=>{
				var qry = {'name': vocName};
				var prj = {'_id':1, 'name': 1, 'inputAsTree':1, 'multiSelect':1, 'mandatory':1};
				cltTX.find(qry).project(prj).toArray()
					.then( (d)=>{
						d.forEach( (item)=>{
							var key = item.name.replace(/\s+/g,'');
							taxonomies[key] = item;
						});
						wait4TaxonomiesEnd();
					})
					.catch( (e)=>{
						console.log('Finding taxonomies error! - ' + e);
					});
			});
		} else if(txVocNameCount === 0){ //list all vocabularies
			var qry = {};
			var prj = {'_id':1, 'name': 1, 'inputAsTree':1, 'multiSelect':1, 'mandatory':1};
			cltTX.find(qry).project(prj).toArray()
				.then( (d)=>{
					d.forEach( (item)=>{
						var key = item.name.replace(/\s+/g,'');
						taxonomies[key] = item;
					});

					count = 1;
					wait4TaxonomiesEnd();
				})
				.catch( (e)=>{
					console.log('Finding taxonomies error! - ' + e);
				});					
		}
	});
}