/*jshint esversion: 6 */

var fs = require('fs');

// source - source tour type

module.exports = (source) => {

	//base configuration
	
	var tourTypeMapping = require('../mapping/type.json'); //array
	var target = '';

	tourTypeMapping.forEach( (mapping) => {
		if(mapping.SourceType === source)	target = mapping.TargetType;
	});

	return target;
};	