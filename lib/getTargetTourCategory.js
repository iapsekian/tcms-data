/*jshint esversion: 6 */

var fs = require('fs');

// source - source tour category

module.exports = (source) => {

	//base configuration
	
	var tourCategoryMapping = require('../mapping/category.json'); //array
	var target = '';

	tourCategoryMapping.forEach( (mapping) => {
		if(mapping.SourceCategory === source)	target = mapping.TargetCategory;
	});

	return target;
};	