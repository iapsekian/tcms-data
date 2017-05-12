/*jshint esversion: 6 */

// 

"use strict"

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

module.exports = {
	getMongoDBUrl: getMongoDBUrl
};
