/*jshint esversion: 6 */

// 

"use strict"

const fs = require('fs');
const debug = require('debug');
const debugDev = debug('dev');	
const util = require('util');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;


const mongoDBUrl = {
	'PRODUCTION': 'mongodb://52.39.111.227:27017/tourbooks',
	'TEST': 'mongodb://tst.tourbooks.cc:27017/tourbooks',
	'TEST2': 'mongodb://tst2.tourbooks.cc:27017/tourbooks'
}

let getMongoDBUrl = (targetEnv, dbOPSwitch, callback) => {

	let productionEnv = false;
	let testEnv = false;
	let test2Env = false;
	let operateDB = false;

	if('PRODUCTION' === targetEnv){
		productionEnv = true;
		if('OPDB' === dbOPSwitch){
			operateDB = true;
		}
	} else if('TEST' === targetEnv){
		testEnv = true;
		if('OPDB' === dbOPSwitch){
			operateDB = true;
		}
	} else if('TEST2' === targetEnv){
		test2Env = true;
		if('OPDB' === dbOPSwitch){
			operateDB = true;
		}
	} else if('OPDB' === targetEnv){
		targetEnv = 'TEST';
		testEnv = true;
		operateDB = true;
	} else {
		targetEnv = 'TEST';
		testEnv = true;	
	}

	callback(targetEnv, operateDB, mongoDBUrl[targetEnv]);
}

let cleanArray = (orig, callback) => {
	let newArray = new Array();
	let updFlag = false;
	for (let i = 0; i < orig.length; i++) {
		if(orig[i]){
			newArray.push(orig[i]);
		} else {
			updFlag = true;
		}
	}
	callback(updFlag ,newArray);
}

let getTxTermsMap = (options, callback) => {

	// options = {
	// 	txVocName: [],
	// 	txTermsFlag: boolean, //undefined --> default: true
	// 	reversedListing: boolean, // undefined --> default: false
	// 	targetEnv: '',
	// 	dbOPSwitch: ''
	// }


	let txVocName = options.txVocName.slice(); //clone array
	if(util.isNullOrUndefined(options.txTermsFlag))	options.txTermsFlag = true;
	let txTermsFlag = options.txTermsFlag;
	if(util.isNullOrUndefined(options.reversedListing))	options.reversedListing = false;
	let reversedListing = options.reversedListing;
	let targetEnv = options.targetEnv;
	let dbOPSwitch = options.dbOPSwitch;

	let operateDB = false;
	let mdbUrl = '';
	getMongoDBUrl(targetEnv, dbOPSwitch, (env, op, mUrl) => {
		targetEnv = env;
		operateDB = op;
		mdbUrl = mUrl;
	})

	let txVocNameCount = txVocName.length;
	let txVocId = {}, txTermsId = {};
		// txTermsId = {
		// 		"TourDestination": {
		// 			"Paris": "xxxxxxxxxxx",
		// 			"London": "xxxxxxxxxxx"
		// 		},
		// 		"TourCategory": {}
		// }


	MongoClient.connect(mdbUrl, (err, db) => {

		let cltTX = db.collection('Taxonomy');
		let cltTXTerms = db.collection('TaxonomyTerms');

		let preparingData = () => {

			// get taxonomy vovaculary and id mapping
			let getTXVocId = ()=>{
				let count = txVocNameCount;
				let wait4txVocIdEnd = ()=>{
					count--;
					if(!count){
						if(reversedListing){
							fs.writeFileSync('./logs/txVocIdReversed-' + targetEnv + '.json', JSON.stringify(txVocId));
						} else {
							fs.writeFileSync('./logs/txVocId-' + targetEnv + '.json', JSON.stringify(txVocId));							
						}
						if(txTermsFlag){
							getTXTerms();
						} else {
							endProgram();
						}
					}
				};

				if(txVocNameCount !== 0){ //assign specific vocabularies
					txVocName.forEach((vocName)=>{
						let qry = {'name': vocName};
						let prj = {'_id':1, 'name': 1};
						cltTX.find(qry).project(prj).toArray()
							.then( (d)=>{
								d.forEach( (item)=>{
									if(reversedListing){
										txVocId[item._id.toString()] = item.name.replace(/\s+/g,'');
									} else {
										txVocId[item.name.replace(/\s+/g,'')] = item._id.toString();
									}
								});
								wait4txVocIdEnd();
							})
							.catch( (e)=>{
								console.log('Finding taxonomy vocabulary ID error! - ' + e);
							});
					});
				} else if(txVocNameCount === 0){ //list all vocabularies
					let qry = {};
					let prj = {'_id':1, 'name': 1};
					cltTX.find(qry).project(prj).toArray()
						.then( (d)=>{
							d.forEach( (item)=>{
								let key = item.name.replace(/\s+/g,'');
								let value = item._id.toString();
								if(reversedListing){
									txVocId[value] = key;
								} else {
									txVocId[key] = value;
								}
								if(txTermsFlag)
									txVocName.push(key);
							});
							
							txVocNameCount = txVocName.length;
							count = 1;
							wait4txVocIdEnd();
						})
						.catch( (e)=>{
							console.log('Finding taxonomy vocabulary ID error! - ' + e);
						});					
				}
			}

			// get taxonomy terms based on txVocId
			// called at the end of getTXVocId
			let getTXTerms = ()=>{
				let count = txVocNameCount;
				let wait4AllVocEnd = ()=>{
					count--;
					if(!count){
						if(reversedListing){
							fs.writeFileSync('./logs/txTermsIdReversed-' + targetEnv + '.json', JSON.stringify(txTermsId));
						} else {
							fs.writeFileSync('./logs/txTermsId-' + targetEnv + '.json', JSON.stringify(txTermsId));							
						}
						endProgram();
					}
				};

				txVocName.forEach((vocName)=>{
					let key = vocName.replace(/\s+/g,'');
					let qry = {};
					if(reversedListing){
						tmpTxVocId = Object.keys(txVocId);
						tmpTxVocId.forEach( (tmpKey) => {
							if(key === txVocId[tmpKey])	key = tmpKey;
							qry = {'vocabularyId': tmpKey};
						});
					} else {
						qry = {'vocabularyId': txVocId[key]};
					}
					let prj = {'_id':1, 'text': 1};

					cltTXTerms.find(qry).project(prj).toArray()
						.then( (d)=>{
							let terms = {};
							d.forEach( (term)=>{
								if(reversedListing){
									terms[term._id.toString()] = term.text;
								} else {
									terms[term.text] = term._id.toString();
								}
							});
							txTermsId[key] = terms;
							wait4AllVocEnd();
						})
						.catch( (e)=>{
							console.log('Finding taxonomy terms ID error! - ' + e);
						});
				});
			}

			// preparingData starting point
			getTXVocId();
		};

		let endProgram = ()=>{
			db.close();
			// debugDev('*** Finished!! ***');
			callback(txVocId,txTermsId);
		}

		// Starting point
		preparingData();
	})
}


let getContentTypesId = (options, callback) => {

	// options = {
	// 	ctnTypeName: [],
	// 	reversedListing: boolean, // undefined --> default: false
	// 	targetEnv: '',
	// 	dbOPSwitch: ''
	// }
	
	let ctnTypeName = options.ctnTypeName;
	if(util.isNullOrUndefined(options.reversedListing))	options.reversedListing = false;
	let reversedListing = options.reversedListing;
	let targetEnv = options.targetEnv;
	let dbOPSwitch = options.dbOPSwitch;

	let operateDB = false;
	let mdbUrl = '';
	getMongoDBUrl(targetEnv, dbOPSwitch, (env, op, mUrl) => {
		targetEnv = env;
		operateDB = op;
		mdbUrl = mUrl;
	})

	let ctnTypeNameCount = ctnTypeName.length;
	let ctnTypeId = {};
		// ctnTypeId = {
		// 	"Paris": "xxxxxxxxxxx",
		// 	"London": "xxxxxxxxxxx"
		// }

	MongoClient.connect(mdbUrl, (err, db) => {

		let cltCtnTypes = db.collection('ContentTypes');

		let preparingData = () => {

			// get taxonomy vovaculary and id mapping
			let getCtnTypeId = ()=>{
				let count = ctnTypeNameCount;
				let wait4CtnTypeIdEnd = ()=>{
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
						let qry = {'type': name};
						let prj = {'_id':1, 'type': 1};
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
					let qry = {};
					let prj = {'_id':1, 'type': 1};
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

		let endProgram = ()=>{
			db.close();
			callback(ctnTypeId);
		}

		// Starting point
		preparingData();
	})
}

let getContents = (options, callback) => {
	// options = {
	// 	ctnTypeId: {},
	// 	projection:{},
	// 	targetEnv: '',
	// 	dbOPSwitch: ''
	// }

	let ctnTypeId = options.ctnTypeId;
	let ctnTypeName = Object.keys(ctnTypeId);
	let targetEnv = options.targetEnv;
	let dbOPSwitch = options.dbOPSwitch;

	let operateDB = false;
	let mdbUrl = '';
	getMongoDBUrl(targetEnv, dbOPSwitch, (env, op, mUrl) => {
		targetEnv = env;
		operateDB = op;
		mdbUrl = mUrl;
	})

	let ctnTypeNameCount = ctnTypeName.length;
	let contents = {};
		// contents = {
		// 	"type1": [
		// 				{record1},
		// 				{record2}
		// 			],
		// 	"type2": [
		// 				{record1},
		// 				{record2}
		// 			]
		// }

	MongoClient.connect(mdbUrl, (err, db) => {

		let cltContents = db.collection('Contents');

		let preparingData = () => {

			let count = ctnTypeNameCount;
			let wait4GetContentsEnd = ()=>{
				count--;
				if(!count){
					fs.writeFileSync('./logs/contents-' + targetEnv + '.json', JSON.stringify(contents));
					endProgram();
				}
			};

			if(ctnTypeNameCount !== 0){
				ctnTypeName.forEach((name)=>{
					let qry = {'typeId': ctnTypeId[name]};
					let prj = options.projection;
					cltContents.find(qry).project(prj).toArray()
						.then( (d)=>{
							contents[name] = d;
							wait4GetContentsEnd();
						})
						.catch( (e)=>{
							console.log('Finding contents error! - ' + e);
						});
				});
			} else if (ctnTypeNameCount === 0){
				let qry = {};
				let prj = options.projection;
				cltContents.find(qry).project(prj).toArray()
					.then( (d)=>{
						contents = d;
						count = 1;
						wait4GetContentsEnd();
					})
					.catch( (e)=>{
						console.log('Finding contents error! - ' + e);
					});
			}
		};

		let endProgram = ()=>{
			db.close();
			callback(contents);
		}

		// Starting point
		preparingData();
	});
}

let getCtnTypesDef = (options, callback) => {

	// options = {
	// 	ctnTypeId: {}, //from getContentTypeId.js (not reversedListing)
	// 	projection:{},
	// 	targetEnv: '',
	// 	dbOPSwitch: ''
	// }

	let ctnTypeId = options.ctnTypeId;
	let ctnTypeName = Object.keys(ctnTypeId);
	let targetEnv = options.targetEnv;
	let dbOPSwitch = options.dbOPSwitch;

	let operateDB = false;
	let mdbUrl = '';
	getMongoDBUrl(targetEnv, dbOPSwitch, (env, op, mUrl) => {
		targetEnv = env;
		operateDB = op;
		mdbUrl = mUrl;
	})

	let ctnTypeNameCount = ctnTypeName.length;
	let contentTypes = {};
		// contentTypes = {
		// 	"type1": {record1},
		// 	"type2": {record}
		// }

	MongoClient.connect(mdbUrl, (err, db) => {

		let cltContentTypes = db.collection('ContentTypes');

		let preparingData = () => {

			let count = ctnTypeNameCount;
			let wait4GetContentsEnd = ()=>{
				count--;
				if(!count){
					fs.writeFileSync('./logs/ctnTypesDef-' + targetEnv + '.json', JSON.stringify(contentTypes));
					endProgram();
				}
			};

			if(ctnTypeNameCount !== 0){
				ctnTypeName.forEach((name)=>{
					let qry = {'_id': ObjectID.createFromHexString(ctnTypeId[name])};
					let prj = options.projection;
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
				let qry = {};
				let prj = options.projection;
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

		let endProgram = ()=>{
			db.close();
			callback(contentTypes);
		}

		// Starting point
		preparingData();
	});
}

let getTxVocsDef = (options, callback) => {

	// options = {
	// 	txVocName: [],
	// 	targetEnv: '',
	// 	dbOPSwitch: ''
	// }

	let txVocName = options.txVocName.slice(); //clone array
	let targetEnv = options.targetEnv;
	let dbOPSwitch = options.dbOPSwitch;

	let operateDB = false;
	let mdbUrl = '';
	getMongoDBUrl(targetEnv, dbOPSwitch, (env, op, mUrl) => {
		targetEnv = env;
		operateDB = op;
		mdbUrl = mUrl;
	})

	let txVocNameCount = txVocName.length;
	let taxonomies = {};
		// txTermsId = {
		// 		"TourDestination": {
		// 			"Paris": "xxxxxxxxxxx",
		// 			"London": "xxxxxxxxxxx"
		// 		},
		// 		"TourCategory": {}
		// }

	MongoClient.connect(mdbUrl, (err, db) => {

		let cltTX = db.collection('Taxonomy');

		let endProgram = ()=>{
			db.close();
			callback(taxonomies);
		}

		let count = txVocNameCount;
		let wait4TaxonomiesEnd = ()=>{
			count--;
			if(!count){
				fs.writeFileSync('./logs/txVocsDef-' + targetEnv + '.json', JSON.stringify(taxonomies));
				endProgram();
			}
		};

		if(txVocNameCount !== 0){ //assign specific vocabularies
			txVocName.forEach((vocName)=>{
				let qry = {'name': vocName};
				let prj = {'_id':1, 'name': 1, 'inputAsTree':1, 'multiSelect':1, 'mandatory':1};
				cltTX.find(qry).project(prj).toArray()
					.then( (d)=>{
						d.forEach( (item)=>{
							let key = item.name.replace(/\s+/g,'');
							taxonomies[key] = item;
						});
						wait4TaxonomiesEnd();
					})
					.catch( (e)=>{
						console.log('Finding taxonomies error! - ' + e);
					});
			});
		} else if(txVocNameCount === 0){ //list all vocabularies
			let qry = {};
			let prj = {'_id':1, 'name': 1, 'inputAsTree':1, 'multiSelect':1, 'mandatory':1};
			cltTX.find(qry).project(prj).toArray()
				.then( (d)=>{
					d.forEach( (item)=>{
						let key = item.name.replace(/\s+/g,'');
						taxonomies[key] = item;
					});

					count = 1;
					wait4TaxonomiesEnd();
				})
				.catch( (e)=>{
					console.log('Finding taxonomies error! - ' + e);
				});					
		}
	})
}

module.exports = {
	getMongoDBUrl: getMongoDBUrl,
	cleanArray: cleanArray,
	getTxTermsMap: getTxTermsMap,
	getTxVocsDef: getTxVocsDef,
	getContentTypesId: getContentTypesId,
	getCtnTypesDef: getCtnTypesDef,
	getContents: getContents
};
