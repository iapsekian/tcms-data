/*jshint esversion: 6 */

// 
// 
const TourCMSApi = require('tourcms');


let tourImageSecure = imgUrl => {
	imgUrl = imgUrl.replace('http://', 'https://')
	let imgUrlParts = imgUrl.split('.')
	if(imgUrlParts[1].search(/r\d+/i) !== -1){
		imgUrlParts[1] = 'ssl'
		imgUrl = imgUrlParts.join('.')
	}
	return imgUrl
}

let grade = {
	1: 'All ages / Not applicable',
	2: 'Moderate',
	3: 'Fit',
	4: 'Challenging',
	5: 'Extreme'
}

let accomrating = {
	1: 'No accommodation / Not applicable',
	2: 'Luxury',
	3: 'Moderate',
	4: 'Comfortable',
	5: 'Basic',
	6: 'Various levels'
}

let product_type = {
	1: 'Accommodation (hotel/campsite/villa/ski chalet/lodge)',
	2: 'Transport/Transfer',
	3: 'Tour/cruise including overnight stay',
	4: 'Day tour/trip/activity/attraction (No overnight stay)',
	5: 'Tailor made',
	6: 'Event',
	7: 'Training/education',
	8: 'Other',
	9: 'Restaurant / Meal alternative'
}

let direction = {
	0: 'Other / not set',
	1: 'Airport to City',
	2: 'City to Airport',
	3: 'Two way return'
}

let tourleader_type = {
	1: 'Tour guide / driver',
	2: 'Independent / self drive',
	3: 'Not applicable (e.g. accommodation / event)',
}

let tourGrade = key =>{
	if(key){
		return grade[key]
	} else {
		return ''
	}
}

let tourAccomrating = key =>{
	if(key){
		return accomrating[key]
	} else {
		return ''
	}
}

let tourProductType = key => {
	if(key){
		return product_type[key]
	} else {
		return ''
	}
}

let tourTransportDirection = key => {
	if(key){
		return direction[key]
	} else {
		return ''
	}
}

let tourLeaderType = key => {
	if(key){
		return tourleader_type[key]
	} else {
		return ''
	}
}

let listToursShowTours = (conf, callback) => {

	let TourCMS = new TourCMSApi({
		apiKey: conf.opApiKey,
		marketplaceId: conf.opMarketPlaceId
	})

	let listDetails = res => {
		if(res.error !== 'OK'){
			console.log('Get TourCMS tour master error! Now return...')
			return
		}

		let tours = [];

		let count = res.tour.length
		let wait4MasterEnd = () => {
			count--
			if(!count){
				callback(tours)
			}
		}

		let setToursDataset = res => {
			if(res.error !== 'OK'){
				console.log('Get Tour Details Error! Now Return....')
				return
			}

			tours.push(res.tour)
			wait4MasterEnd()
		}

		res.tour.forEach( (master) => {
			TourCMS.showTour({
				channelId: conf.opChannelId,
				callback: setToursDataset,
				tourId: master.tour_id				
			})
		})
	}

	TourCMS.listTours({
		channelId: conf.opChannelId,
		callback: listDetails
	})
}

let showSupplier = (apiBasicData, supplierInfo, callback) => {

	let conf = {};
	apiBasicData.forEach( data => {
		if(data.opChannelId.toString() === supplierInfo.channelId)
			conf = data
	})

	let TourCMS = new TourCMSApi({
		apiKey: conf.opApiKey,
		marketplaceId: conf.opMarketPlaceId
	})

	let cbShowSuppliers = res => {
		if(res.error === 'OK'){
			callback(res.supplier)
		}
	}

	let param = {
		channelId: conf.opChannelId,
		path: '/c/supplier/show.xml',
		callback: cbShowSuppliers
	}
	param.path += '?supplier_id=' + supplierInfo.supplierId

	TourCMS.genericRequest(param)

}

module.exports = {
	getTourImageSecure: tourImageSecure,
	getTourGrade: tourGrade,
	getTourAccomrating: tourAccomrating,
	getTourProductType: tourProductType,
	getTourTransportDirection: tourTransportDirection,
	getTourLeaderType: tourLeaderType,
	getTours: listToursShowTours,
	getSupplier: showSupplier,
};
