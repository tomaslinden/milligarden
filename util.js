/*
Title: Miscellaneous utility functions for parametric multistory square foot gardening box
Version: 0.0.2
Author: Tomas Lindén (tomaslinden24@gmail.com)
Created: 2016-04-19 (ISO-8601)
Last modified: 2015-07-10 (ISO-8601)
License: Creative Commons Attribution-ShareAlike 4.0 International License, http://creativecommons.org/licenses/by-sa/4.0/
*/

arrayAdd = function(array1, array2) {

    var returnArray = [];
    if(array1.length == array2.length) {
        for(var i = 0; i < array1.length; i++) {
            returnArray.push(array1[i]+array2[i]);
        }
        return returnArray;
    } else {
        console.log('arrayAdd error: supplied arrays must each be of same length');
        return array1;
    }
}
arraySubtract = function(array1, array2) {

    var returnArray = [];
    if(array1.length == array2.length) {
        for(var i = 0; i < array1.length; i++) {
            returnArray.push(array1[i]-array2[i]);
        }
        return returnArray;
    } else {
        console.log('arrayAdd error: supplied arrays must each be of same length');
        return array1;
    }
}

decimalRound = function(value, precision) {

    return Math.round(value * precision) / precision;
}

createAxes = function(length, thickness, opacity, offset) {

    var axesCadObject = 
    	CSG.cube().scale([length,    thickness, thickness]).translate(arrayAdd([length, 0,      0],      offset)).setColor(1, 0, 0, opacity).union(
        CSG.cube().scale([thickness, length,    thickness]).translate(arrayAdd([0,      length, 0],      offset)).setColor(0, 1, 0, opacity)).union(
        CSG.cube().scale([thickness, thickness, length]).translate(   arrayAdd([0,      0,      length], offset)).setColor(0, 0, 1, opacity));
   	axesCadObject.properties.origo = new CSG.Connector([0, 0, 0], [1, 0, 0], [0, 0, 1]);
   	return axesCadObject;
}
