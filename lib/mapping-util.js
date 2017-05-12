/*jshint esversion: 6 */

// combined getTargetTourCategory.js & getTargetTourType.js into this util module

var targetTourCategory = (source) => {
	
	var tourCategoryMapping = require('../mapping/category.json'); //array
	var target = '';

	tourCategoryMapping.forEach( (mapping) => {
		if(mapping.SourceCategory === source)	target = mapping.TargetCategory;
	});

	return target
};

var targetTourType = (source) => {
	var tourTypeMapping = require('../mapping/type.json'); //array
	var target = '';

	tourTypeMapping.forEach( (mapping) => {
		if(mapping.SourceType === source)	target = mapping.TargetType;
	});

	return target
}

module.exports = {
	getTargetTourCategory: targetTourCategory,
	getTargetTourType: targetTourType
};
