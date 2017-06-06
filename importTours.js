/*jshint esversion: 6 */

const https = require('https');
const fs = require('fs');
const debug = require('debug');
const debugDev = debug('dev');
const util = require('util');
const parseString = require('xml2js').parseString;
const MongoClient = require('mongodb').MongoClient;
const TourCMSApi = require('tourcms');

// const getMongoDBUrl = require('./lib/bookurUtil.js').getMongoDBUrl
const buUtil = require('./lib/bookurUtil.js')
const tcmsUtil = require('./lib/tcmsUtil.js')

Array.prototype.clean = (deleteValue) => {
	for(let i = 0 ; i <this.length; i++) { 
		if(this[i] == deleteValue){ 
			this.splice(i, 1 ); 
			i--; 
		} 
	} 
	return this;
};

let targetEnv = process.argv.slice(2)[0];
let dbOPSwitch = process.argv.slice(3)[0];
let operateDB = false;
let mdbUrl = '';
buUtil.getMongoDBUrl(targetEnv, dbOPSwitch, (env, op, mUrl) => {
	targetEnv = env;
	operateDB = op;
	mdbUrl = mUrl;
})

//base configuration

// let apiCallComplete = false;
// let getExistingComplete = false;

let arrayJsonProducts = [];
let arrayJsonToursProducts = [];
let arrayJsonSuppliers = [];
let existingSuppliers = [];
let existingTourDetails = [];
let existingTours = [];

let taxonomySupplierId = {};
let taxonomySupplierAlias = {};
let taxonomyProductType = {};
let taxonomyAgentPaymentType = {};
let taxonomyProductCode = {};


//DB definition/value
let txVocName = ['Search Selector','Supplier ID','Supplier Alias'];
let ctnTypeName = ['Tour Suppliers'];

let txVocNameCount = txVocName.length;
let ctnTypeNameCount = ctnTypeName.length;
let ctnProjection = {'_id':1, 'text': 1, 'workspace':1};
let txVocId = {}, txTermsId = {}, ctnTypeId = {}, contents = {};

let crudUser = {
	"id": "55a4ab8b86c747a0758b4567",
	"login": "admin",
	"fullName": "Web Admin" 		
}

let txNavigation = [
	"57e227bb6d0e81ad168b4768",
	"582bf94c6d0e81d65f7b293b" 
];

//TourCMS API Setting
//

const apiBasicData = [
	{
		opApiKey: '6f1f259266fa',
		opMarketPlaceId: 0,
		opChannelId: 11179
	}
]

//Part 1-1 - gettting MDB's current record sets

let getExistingDataFromMDB = () => {

	console.log('--- getExistingDataFromMDB starts to get existing data from DB!');
	//function-wide letiables

	let dataReadyCount = 2
	let wait4DataReady = () => {
		dataReadyCount--
		if(!dataReadyCount){
			existingSuppliers = contents.TourSuppliers
			// existingTourDetails = contents.TTours
			// existingTours = contents.Tours
			step1GetTourCMSTours()
		}
	}

	let options = {
		'txVocName': txVocName,
		//'txTermsFlag': true,
		//'reversedListing': false,
		'targetEnv': targetEnv,
		'dbOPSwitch': dbOPSwitch
	};

	buUtil.getTxTermsMap(options, (vocs,terms)=>{
		txVocId = vocs;
		txTermsId = terms;
		wait4DataReady();
	});

	let options1 = {
		'ctnTypeName': ctnTypeName,
		'targetEnv': targetEnv,
		'dbOPSwitch': dbOPSwitch
	};

	buUtil.getContentTypesId(options1, (types)=>{
		ctnTypeId = types;

		options2 = {
			ctnTypeId: ctnTypeId,
			projection: ctnProjection,
			targetEnv: targetEnv,
			dbOPSwitch: dbOPSwitch
		};
		buUtil.getContents(options2, (ctns)=>{
			contents = ctns;
			wait4DataReady();
		});
	});	
};

//Part1-2 - using TourCMS Nodejs Wrapper to get tours' information

// get category
let step1GetTourCMSTours = () => {

	console.log('--- step1GetTourCMSTours Starts!');

	let apiBasicDataCount = apiBasicData.length;
	let wait4ApiBasicDataEnd = () =>{
		apiBasicDataCount--
		if(!apiBasicDataCount){
			fs.writeFileSync('./logs/arrayJsonProducts.json', JSON.stringify(arrayJsonProducts))

	        let supplierAliasFromProducts = []
	        arrayJsonProducts.forEach( (tour) => {
	        	let newFlag = true
	        	let supplierAlias = tour.account_id + '-' + tour.supplier_id
	        	supplierAliasFromProducts.forEach( (supplier) => {    		
	        		if(supplierAlias === supplier.supplierAlias){
	        			newFlag = false;
	        		}
	        	});
	        	if (newFlag) {
	        		let supplierInfo = {};
	        		supplierInfo.channelId = tour.channel_id
	        		supplierInfo.accountId = tour.account_id
	        		supplierInfo.supplierId = tour.supplier_id
	        		supplierInfo.supplierAlias = supplierAlias
		        	supplierAliasFromProducts.push(supplierInfo);
	        	}
	        });
	        console.log('--- step1GetTourCMSTours Ended!');
	        step2GetSuppliersFromTours(supplierAliasFromProducts);

		}
	}

	apiBasicData.forEach( (conf) => {
		tcmsUtil.getTours(conf, (tours) => {
			arrayJsonProducts = arrayJsonProducts.concat(tours)
			wait4ApiBasicDataEnd()
		})
	})
}

let step2GetSuppliersFromTours = (supplierAliasFromProducts) => {

	console.log('--- step2GetSuppliersFromTours starts!');
	//debugDev('supplierAliasFromProducts = ' + JSON.stringify(supplierAliasFromProducts));

	//
	console.log('Suppliers Count = ' + supplierAliasFromProducts.length);
	let supplierCount = supplierAliasFromProducts.length;
	let wait4SupplierListEnd = () => {
		supplierCount--
		if(!supplierCount){
			fs.writeFileSync('./logs/arrayJsonSuppliers.json', JSON.stringify(arrayJsonSuppliers))
			console.log('****** Get TourCMS Data via API Completed ******')
		}
	}

	let handleSupplierInfo = supplier => {
		let addFlag = false
		if(supplier){
			addFlag = true
			if(arrayJsonSuppliers.length){
				let accountId = supplier.account_id
				let supplierId = supplier.supplier_id
				arrayJsonSuppliers.forEach( item => {
					if(item.account_id === accountId && item.supplier_id === supplierId){
						addFlag = false
					}
				})
			}
		}

		if(addFlag){
			arrayJsonSuppliers.push(supplier)
		}
		wait4SupplierListEnd()
	}
	
	supplierAliasFromProducts.forEach( supplierInfo => {
		tcmsUtil.getSupplier(apiBasicData, supplierInfo, handleSupplierInfo)
	})	
}

//Start

getExistingDataFromMDB();
