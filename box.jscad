/*
Version: 0.1.4
Author: Tomas Lindén (tomaslinden24@gmail.com)
Created: 2015-09-21 (ISO-8601)
Last modified: 2016-04-29 (ISO-8601)
License: Creative Commons Attribution-ShareAlike 4.0 International License, http://creativecommons.org/licenses/by-sa/4.0/

Done:
- Add support for turning pieces of wood around axes, reminiscent to how pieces of wood may be turned in physical reality

Todo:
- Color the front and top sides of the planks
- Make it possible to "explode" the composition into distinct pieces that need to be worked
-- Each piece should have clearly visible dimensions, so that they can be manufactured in different ways
--- Consider using the orthonormal basis
-- Either keep the exploded pieces showing how they're supposed to be assembled
!! Or align them into a neatly layed out "inventory" of material pieces which need to be worked
- Add support for adjusting leg length based on surface inclination
*/

function arrayAdd(array1, array2) {

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
function arraySubtract(array1, array2) {

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

function decimalRound(value, precision) {

    return Math.round(value * precision) / precision;
}

function createAxes(length, thickness, opacity, offset) {

    var axesCadObject = 
    	CSG.cube().scale([length,    thickness, thickness]).translate(arrayAdd([length, 0,      0],      offset)).setColor(1, 0, 0, opacity).union(
        CSG.cube().scale([thickness, length,    thickness]).translate(arrayAdd([0,      length, 0],      offset)).setColor(0, 1, 0, opacity)).union(
        CSG.cube().scale([thickness, thickness, length]).translate(   arrayAdd([0,      0,      length], offset)).setColor(0, 0, 1, opacity));
   	axesCadObject.properties.origo = new CSG.Connector([0, 0, 0], [1, 0, 0], [0, 0, 1]);
   	return axesCadObject;
}

var Timber = function(thickness, width, length, inclination) {

    var self = this;

    self.cadObject = undefined;

    self.thickness = thickness;
    self.width = width;
    self.length = length;

	// x is the slope when going along the x-axis, respectively for y
	if( inclination ) {
		if( ! ('x' in inclination) ) {
			inclination.x = 0;
		}
		if ( ! ('y' in inclination) ) {
			inclination.y = 0;
		}

		// Calculate material vertical thickness.
		// Formula:
		// tiltAngle = atan(abs(inclination))
		// vertical-thickness-increment = (thickness * cos(tiltAngle)) - thickness
		var xDegrees = atan(abs(inclination.x));
		var xTiltThicknessIncrease = (thickness - thickness * cos(xDegrees));
		var yDegrees = atan(abs(inclination.y));
		var yTiltThicknessIncrease = (thickness - thickness * cos(yDegrees));
		// "VTs" is short for "vertical thicknesses"
		var VT = thickness + xTiltThicknessIncrease + yTiltThicknessIncrease;

		// Corners are numbered from 0 to 7, where indices 0 to 3 are the lower panel 
		// corners counted clockwise around the rim of the panel with zero being the corner
		// lying at the origo. Corner indices 4 to 7 lie directly above indices 0 to 3 and
		// are counted similarly (clockwise around the rim beginning with the one closest to origo).
		var Zs = {'0': 0, '1': 0, '2': 0, '3': 0}; // corner z-elevations (by corner index)

		// If inclination goes upwards when traversing along the y axis in its positive direction,
		// then add an amount equal to the y-inclination, proportioned with the to the top right corner ("1").
		if(inclination.y > 0) {
			// Add to corners 1 och 2
			Zs['1'] += length * abs(inclination.y);
			Zs['2'] += length * abs(inclination.y);
		// If inclination goes downwards when traversing along the y axis in its positive direction,
		// then add an amount equal to the y-inclination to the top left corner ("0").
		} else if(inclination.y < 0) {
			// Add to corners 0 och 3
			Zs['0'] += length * abs(inclination.y);
			Zs['3'] += length * abs(inclination.y);
		}
		// Respectively for the x-axis (corner "3" is the front left one).
		if(inclination.x > 0) {
			// Add to corners 2 och 3

			Zs['2'] += width * abs(inclination.x);
			Zs['3'] += width * abs(inclination.x);
		} else if(inclination.x < 0) {
			// Add to corners 0 och 1

			Zs['0'] += width * abs(inclination.x);
			Zs['1'] += width * abs(inclination.x);
		}

		var panelCorners = [
			// 0,1,2,3: bottom back left, bottom back right, bottom front right, bottom front left
			[0, 0, Zs['0']],    [0,length,Zs['1']],    [width,length,Zs['2']],    [width,0,Zs['3']],
			// 4,5,6,7: top back left, top back right, top front right, top frong left
			[0, 0, Zs['0']+VT], [0,length,Zs['1']+VT], [width,length,Zs['2']+VT], [width,0,Zs['3']+VT]
		]

		self.cadObject = polyhedron({
			points: panelCorners,                                  // the apex point 
			// Polygon "facets" have a positive and negative side. The positive looks solid,
			// whearas the negative can be seen through. When the vertix ordering is clockwise
			// the face is positive (and looks solid), and vice versa (negative is invisible).
			polygons: [ 
				[3,2,1,0], [4,5,6,7], // bottom and top
				[1,5,4,0], [3,7,6,2], // back and front
				[4,7,3,0], [1,2,6,5], // left and right
			]
		});

	} else {

		// If inclination is not set, then just create the timber as a rectangular box
		// (cross-section on x-y -plane, with the board extending lengthwise along the positive z-axis).
		self.cadObject = square([self.thickness, self.width]).extrude({offset: [0, 0, self.length]});
	}

    self.boundingBox = [thickness, width, length];
   	self.cadObject.properties.localOrigo =
   		new CSG.Connector([0, 0, 0], [0, 0, 1], [1, 0, 0]);
   	self.cadObject.properties.center =
   		new CSG.Connector([thickness/2, width/2, length/2], [0, 0, 1], [1, 0, 0]);
   	self.cadObject.properties.nearEndCenter =
   		new CSG.Connector([thickness/2, width/2, 0], [0, 0, -1], [1, 0, 0]);

    // 'near' | 'far', 'front' | 'back', 'x' | 'y'
	// side: 'near_end' (-z), 'far_end' (+z), front (+x), 'top' (+y), 'back' (-x), 'bottom' (-y)
	// m*n (rows*columns), 
		// Cutting a "tenon & mortise's" active joint (i.e. the tenon) takes the following parameters:
		// Face: A timber face specification where the joint is to be carved (one of six sides of the timber piece, which has six sides).
    	//       ('near_end' (-z), 'far_end' (+z), front (+x), 'top' (+y), 'back' (-x), 'bottom' (-y))
		// Cut:  (cut proportions, e.g. for tenon, all 0..1 [x1, y1, x2, y2, z], 
		// Overrides:  Optional overrides mm: [thickness_override, width_override, depth_override), if any of these are left out, then the appropriate
		//    dimensions of face of the timber that is to be cut is used instead.
    self.cutTenonJoint = function(face, cut, overrides) {

		// This for the near_end and far_end faces. The other faces need other dimensions.
		// (Refactor as needed.)

		// An active joint consists of the following:
		// A) A side specification where the join is to be carved (one of six sides of the timber piece, which has six sides).
		// B) side: 'near_end' (-z), 'far_end' (+z), front (+x), 'top' (+y), 'back' (-x), 'bottom' (-y)
		// C) The type of joint: e.g. "miter", "tenon" (& mortise)
		// D)  (cut proportions, e.g. for tenon, all 0..1 {x1:, y1:, x2:, y2:}, mm: [thickness, width, depth)
		// case  1: // legBackLeft.cutTenonJoint('near_end', {'x1': 0, 'y1': 0, 'x2': 1/3, 'y2': 1/3}, {'depth': plankWidth});
		// case  2: // legBackLeft.cutTenonJoint('near_end', {'x1': 0, 'y1': 1/3, 'x2': 1/3, 'y2': 0}, {'depth': plankWidth});
		// case  3: // legBackLeft.cutTenonJoint('near_end', {'x1': 1/3, 'y1': 1/3, 'x2': 0, 'y2': 0}, {'depth': plankWidth});
		// case  4: // legBackLeft.cutTenonJoint('near_end', {'x1': 1/3, 'y1': 0, 'x2': 0, 'y2': 1/3}, {'depth': plankWidth});

		// case  5: // legBackLeft.cutTenonJoint('near_end', {'x1': 0, 'y1': 1/3, 'x2': 1/3, 'y2': 1/3}, {'depth': plankWidth});
		// case  6: // legBackLeft.cutTenonJoint('near_end', {'x1': 1/3, 'y1': 1/3, 'x2': 1/3, 'y2': 0}, {'depth': plankWidth});
		// case  7: // legBackLeft.cutTenonJoint('near_end', {'x1': 1/3, 'y1': 1/3, 'x2': 0, 'y2': 1/3}, {'depth': plankWidth});
		// case  8: // legBackLeft.cutTenonJoint('near_end', {'x1': 1/3, 'y1': 0, 'x2': 1/3, 'y2': 1/3}, {'depth': plankWidth});

		// case  9: // legBackLeft.cutTenonJoint('near_end', {'x1': 0,   'y1': 0,   'x2': 1/3, 'y2': 0}, {'depth': plankWidth});
		// case 10: // legBackLeft.cutTenonJoint('near_end', {'x1': 1/3, 'y1': 0,   'x2': 0,   'y2': 0}, {'depth': plankWidth});
		// case 11: // legBackLeft.cutTenonJoint('near_end', {'x1': 0,   'y1': 0,   'x2': 0,   'y2': 1/3}, {'depth': plankWidth});
		// case 12: // legBackLeft.cutTenonJoint('near_end', {'x1': 0,   'y1': 1/3, 'x2': 0,   'y2': 0}, {'depth': plankWidth});

		// Not yet supported (pretty straightforward to add)
		// case 13: // legBackLeft.cutTenonJoint('near_end', {'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0}, {'depth': plankWidth});
		// case 14: // legBackLeft.cutTenonJoint('near_end', {'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0}, {'depth': plankWidth});
		// case 15: // legBackLeft.cutTenonJoint('near_end', {'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0}, {'depth': plankWidth});

		// case 16: // legBackLeft.cutTenonJoint('near_end', {'x1': 1/3, 'y1': 1/3, 'x2': 1/3, 'y2': 1/3}, {'depth': plankWidth});
		
		// Also implement this for the far end (as it will be used soon)
		//var thickness = (typeof overrides != undefined ? overrides.thickness : self.thickness);
		var thickness = self.thickness;
		var width = self.width;
		var depth = overrides.depth;

		// cc is short for "cut coordinates"
		var cc = {
			 '1': [0								, 0				     ],
			 '2': [0								, width			     ],
			 '3': [thickness                 	, width			         ],
			 '4': [thickness                 	, 0				         ],
			 '5': [thickness * cut.x1        	, width * cut.y1	     ],
			 '6': [thickness * cut.x1            , width - width * cut.y2],
			 '7': [thickness - thickness * cut.x2, width - width * cut.y2],
			 '8': [thickness - thickness * cut.x2, width * cut.y1        ],
			 '9': [0, width * cut.y1],
			'10': [0, width - width * cut.y2],
			'11': [thickness * cut.x1, width],
			'12': [thickness - thickness * cut.x2, width],
			'13': [thickness, width - width * cut.y2],
			'14': [thickness, width * cut.y1],
			'15': [thickness - thickness * cut.x2, 0],
			'16': [thickness * cut.x1, 0],
		};

		// Corner-case 1, only top and front sides cut
		if(cut.x1 == 0 && cut.y1 == 0 && cut.x2 != 0 && cut.y2 != 0) {
			//console.log('corner case 1');
			var polygonA = [cc['10'], cc['2'], cc['3'], cc['4'], cc['15'], cc['7']];

		// Corner-case 2, only bottom and front sides cut
		} else if(cut.x1 == 0 && cut.y2 == 0 && cut.x2 != 0 && cut.y1 != 0) {
			//console.log('corner case 2');
			var polygonA = [cc['1'], cc['9'], cc['8'], cc['12'], cc['3'], cc['4']];

		// Corner-case 3, only bottom and back sides cut
		} else if(cut.x2 == 0 && cut.y2 == 0 && cut.x1 != 0 && cut.y1 != 0) {
			//console.log('corner case 3');
			var polygonA = [cc['1'], cc['2'], cc['11'], cc['5'], cc['14'], cc['4']];

		// Corner-case 4, only top and back sides cut
		} else if(cut.x2 == 0 && cut.y1 == 0 && cut.x1 != 0 && cut.y2 != 0) {
			//console.log('corner case 4');
			var polygonA = [cc['1'], cc['2'], cc['3'], cc['13'], cc['6'], cc['16']];

		// Corner-case 5, top, front and bottom sides cut (not back)
		} else if(cut.x1 == 0 && cut.x2 != 0 && cut.y1 != 0 && cut.y2 != 0) {
			//console.log('corner case 5');
			var polygonA = [cc['1'], cc['9'], cc['8'], cc['7'], cc['10'], cc['2'], cc['3'], cc['4']];

		// Corner-case 6, back, front and bottom sides cut (not top)
		} else if(cut.y2 == 0 && cut.x1 != 0 && cut.x2 != 0 && cut.y1 != 0) {
			//console.log('corner case 6');
			var polygonA = [cc['1'], cc['2'], cc['11'], cc['5'], cc['8'], cc['12'], cc['3'], cc['4']];

		// Corner-case 7, back, top and bottom sides cut (not front)
		} else if(cut.x2 == 0 && cut.x1 != 0 && cut.y1 != 0 && cut.y2 != 0) {
			//console.log('corner case 7');
			var polygonA = [cc['1'], cc['2'], cc['3'], cc['13'], cc['6'], cc['5'], cc['14'], cc['4']];

		// Corner-case 8, back, top and front sides cut (not bottom)
		} else if(cut.y1 == 0 && cut.x1 != 0 && cut.x2 != 0 && cut.y2 != 0) {
			//console.log('corner case 8');
			var polygonA = [cc['1'], cc['2'], cc['3'], cc['4'], cc['15'], cc['7'], cc['6'], cc['16']];

		// Corner-case 9, only front side cut
		} else if(cut.x1 == 0 && cut.y1 == 0 && cut.y2 == 0 && cut.x2 != 0) {
			//console.log('corner case 9');
			var polygonA = [cc['15'], cc['12'], cc['3'], cc['4']];

		// Corner-case 10, only back side cut
		} else if(cut.x2 == 0 && cut.y1 == 0 && cut.y2 == 0 && cut.x1 != 0) {
			//console.log('corner case 10');
			var polygonA = [cc['1'], cc['2'], cc['11'], cc['16']];

		// Corner-case 11, only top side cut
		} else if(cut.x1 == 0 && cut.x2 == 0 && cut.y1 == 0 && cut.y2 != 0) {
			//console.log('corner case 11');
			var polygonA = [cc['10'], cc['2'], cc['3'], cc['13']];

		// Corner-case 12, only bottom side cut
		} else if(cut.x1 == 0 && cut.x2 == 0 && cut.y2 == 0 && cut.y1 != 0) {
			//console.log('corner case 12');
			var polygonA = [cc['1'], cc['9'], cc['14'], cc['4']];
// 
// 		// Corner-case 13: only back and front sides cut (not top or bottom)
// 		} else if(cut.y1 == 0 && cut.y2 == 0 && cut.x1 != 0 && cut.x2 != 0) {
// 			console.log('corner case 13');
// 			var polygonA = [cc['1'],  cc['2'],  cc['11'], cc['16']];
// 			var polygonB = [cc['15'], cc['12'], cc['3'],  cc['4']];
// 
// 		// Corner-case 14: only back and front sides cut (not top or bottom)
// 		} else if(cut.x1 == 0 && cut.x2 == 0 && cut.y1 != 0 && cut.y2 != 0) {
// 			console.log('corner case 13');
// 			var polygonA = [cc['1'],  cc['9'], cc['14'], cc['4']];
// 			var polygonB = [cc['10'], cc['2'], cc['3'],  cc['13']];

		// Corner-case 15: Trivial case (no side cut)
		} else if(cut.x1 == 0 && cut.x2 == 0 && cut.y1 == 0 && cut.y2 == 0) {

			// Nothing needs to be cut for the trivial case!

		// Case 16: normal case: all sides cut.
		} else if(cut.x1 != 0 && cut.x2 != 0 && cut.y1 != 0 && cut.y2 != 0) {
			//console.log('case 16: normal case (all sides cut)');
			var polygonA = [cc['1'], cc['5'], cc['8'], cc['7'], cc['3'], cc['4']];
			var polygonB = [cc['1'], cc['2'], cc['3'], cc['7'], cc['6'], cc['5']];

		}

		// Case 15: trivial case
		if(cut.x1 == 0 && cut.x2 == 0 && cut.y1 == 0 && cut.y2 == 0) {
			// Nothing needs to be cut for the trivial case!

		// Cases 1-12 (only one cut-polygon needed)
		} else if(cut.x1 == 0 || cut.x2 == 0 || cut.y1 == 0 || cut.y2 == 0) {
			var cutObject = polygon(polygonA).extrude({offset: [0, 0, depth]});

		// Case 16: normal case
		} else if(   (cut.x1 != 0 && cut.x2 != 0 && cut.y1 != 0 && cut.y2 != 0)
// 				  || (cut.y1 == 0 && cut.y2 == 0 && cut.x1 != 0 && cut.x2 != 0)
// 				  || (cut.x1 == 0 && cut.x2 == 0 && cut.y1 != 0 && cut.y2 != 0) 
				  ) {

			cutObjectA = polygon(polygonA).extrude({offset: [0, 0, depth]});
			cutObjectB = polygon(polygonB).extrude({offset: [0, 0, depth]});
			var cutObject = cutObjectA.union(cutObjectB);
		}

		if(face == 'far_end') {
			cutObject = cutObject.translate([0, 0, self.length - depth]);
		}		
		
        self.cadObject = self.cadObject.subtract(cutObject);
 	}

    self.cutMiter = function(end, side, axis) {

        // Axis is the direction of the cut, can be either 'x' or 'y'. 
        // E.g. 'y' means that the cut's cross-section extends (extrudes) along the y-axis.
        //console.log('typeof axis', typeof axis);
        //console.log('axis', axis);
        if(typeof end != 'string' && end != 'near' && end != 'far') end = 'near'; // Default value
        if(typeof side != 'string' && side != 'front' && side != 'back') side = 'front'; // Default value
        if(typeof axis != 'string' && axis != 'x' && axis != 'y') axis = 'y'; // Default value

        var cutObject = undefined;
        var cutRotation = [0, 0, 0]; // Degrees
        var cutTranslation = [0, 0, 0]; // Decimeters

        // Create the miter cut's geometry (e.g. plank or board). Its cross-section is
        // on the xy-plane and it extends upwards along the positive z-axis.
        if(axis == 'x') {
            cutObject = polygon([ [0, 0], [0, self.width], [self.width, 0] ])
                .extrude({offset: [0, 0, self.thickness]});
            cutRotation = [90, 0, 270]; // i.e. along x-axis
            cutTranslation = [self.thickness, self.width, 0];
        } else if(axis == 'y') {
            cutObject = polygon([ [0, 0], [0, self.thickness], [self.thickness, 0] ])
                .extrude({offset: [0, 0, self.width]});
            cutRotation = [90, 0, 180]; // i.e. along y-axis
            cutTranslation = [self.thickness, 0, 0];
        }

        if(end == 'far') {
            if(axis == 'x') {
                cutRotation = [cutRotation[0]+180, cutRotation[1]+0, cutRotation[2]+0]; // i.e. along x-axis
                cutTranslation = arrayAdd(cutTranslation, [-self.thickness, 0, 0]);
                cutTranslation = arrayAdd(cutTranslation, [0, 0, self.length]);
            } else if(axis == 'y') {
                cutRotation = [cutRotation[0]+180, cutRotation[1]+0, cutRotation[2]+0]; // i.e. along y-axis
                cutTranslation = arrayAdd(cutTranslation, [0, self.width, self.thickness]);
                cutTranslation = arrayAdd(cutTranslation, [0, 0, self.length - self.thickness]);
            }
        }

        cutObject = cutObject
            .rotateX(cutRotation[0]).rotateY(cutRotation[1]).rotateZ(cutRotation[2])
            .translate(cutTranslation);

        if(side == 'front') {
            console.log('Front-side miter cut not yet implemented');
//             if(axis == 'x') {
//                 self.cadObject = self.cadObject
//                 .rotateX(cutRotation[0]).rotateY(cutRotation[1]).rotateZ(cutRotation[2])
//                 .translate([self.thickness, 0, 0])
//             } else if(axis == 'y') {
//             }
        } else if(side == 'back') {

            if(axis == 'x') {
               cutObject = cutObject.rotateX(0).rotateY(0).rotateZ(180);
               cutObject = cutObject.translate([self.thickness, self.width, 0]);
            } else if(axis == 'y') {
                cutObject = cutObject.rotateX(0).rotateY(0).rotateZ(180);
                cutObject = cutObject.translate([self.thickness, self.width, 0]);
            }
        }

        self.cadObject = self.cadObject.subtract(cutObject);
        return self;
    }
    
    self.translate = function(translation) {
        self.cadObject = self.cadObject.translate(translation);
        return self;
    }

    self.rotate = function(rotation) {
        self.cadObject = self.cadObject.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]);
        return self;
    }
    
    // Can only be called before translate or rotate is called
    self.turn = function(axis, degrees) {
    
        var before = self.cadObject.getBounds()[0];
        var precision = 10000;
        var positionBefore = [decimalRound(before['_x'], precision), 
                              decimalRound(before['_y'], precision), 
                              decimalRound(before['_z'], precision)]

        if(axis == 'x') {
            self.rotate([degrees, 0, 0]);
        } else if(axis == 'y') {
            self.rotate([0, degrees, 0]);
        } else if(axis == 'z') {
            self.rotate([0, 0, degrees]);
        }

        var after = self.cadObject.getBounds()[0];
        var positionAfter = [decimalRound(after['_x'], precision), 
                              decimalRound(after['_y'], precision), 
                              decimalRound(after['_z'], precision)]

        var correction = arraySubtract(positionBefore, positionAfter);
        self.translate(correction);

        return self;
    }
	self.lieFlat = function() {

		self.cadObject = self.cadObject.lieFlat();
		return self;
	}

    self.resetToFirstOctant = function() {

        var precision = 10000;
		var correction = [0,0,0];

        var minimum = self.cadObject.getBounds()[0];
		correction[0] = -1 * minimum['_x'];
		correction[1] = -1 * minimum['_y'];
		correction[2] = -1 * minimum['_z'];
        self.translate(correction);
    
    	return self;
    }
    
    self.createConnector = function(connectorHandle, connectorInfo) {

        self.cadObject.properties[connectorHandle] =
        	new CSG.Connector(connectorInfo.point, connectorInfo.axis, connectorInfo.normal);
    }

	self.visualizeConnector = function(objectConnectorName, color) {

		var axis   = CSG.cube({radius: 0.1});
		var normal = CSG.cube({radius: 0.05});

		// define a connector on the center of one face of cube1
		// The connector's axis points outwards and its normal points
		// towards the positive z axis:
		axis.properties.connector = new CSG.Connector([-0.05, 0, 0.1], [0, 0, 1], [-1, 0, 0]);

		// define a similar connector for cube 2:
		normal.properties.connector = new CSG.Connector([0.05, 0, 0], [1, 0, 0], [0, 0, 1]);

		var matrix = normal.properties.connector.getTransformationTo(
		  axis.properties.connector, 
		  true,   // mirror 
		  0       // normalrotation
		);
		normal = normal.transform(matrix);

		var connectorHook = normal.union(axis);
		connectorHook.properties.connector = new CSG.Connector([-0.1, 0, 0], [1, 0, 0], [0, 0, 1]);
		if(color) {
			connectorHook = connectorHook.setColor(color[0], color[1], color[2], 1);
		}

		var hookMatrix = connectorHook.properties.connector.getTransformationTo(
		  self.cadObject.properties[objectConnectorName], 
		  true,   // mirror 
		  0       // normalrotation
		);
		connectorHook = connectorHook.transform(hookMatrix);
		self.cadObject = self.cadObject.union(connectorHook);
	}
	
	self.unionTo = function(otherTimberObject, thisConnectorHandle, otherConnectorHandle) {
	
		self.moveTo(thisConnectorHandle, otherTimberObject, otherConnectorHandle);
    	self.cadObject = self.cadObject.union(otherTimberObject.cadObject);
		return self;
	}
	
	self.moveTo = function(thisConnectorHandle, otherTimberObject, otherConnectorHandle, debug) {

		if(debug) {
			console.log('moveTo thisConnectorHandle', thisConnectorHandle);
			console.log('moveTo self.cadObject.properties[thisConnectorHandle]', self.cadObject.properties[thisConnectorHandle]);
			console.log('moveTo otherTimberObject.cadObject.properties[otherConnectorHandle]', otherTimberObject.cadObject.properties[otherConnectorHandle]);
			console.log('moveTo otherConnectorHandle', otherConnectorHandle);
		}
		var matrix = self.cadObject.properties[thisConnectorHandle].getTransformationTo(
		  otherTimberObject.cadObject.properties[otherConnectorHandle], 
		  true,   // mirror 
		  0       // normalrotation
		);
		//console.log('matrix', matrix);
		self.cadObject = self.cadObject.transform(matrix);

		return self;
	}
	
	// Self is the object to which we want to create the inverted join in.
	self.createInvertedJoinWith = function(thisConnectorHandle, otherTimberObject, otherConnectorHandle) {

		otherTimberObject.moveTo(otherConnectorHandle, self, thisConnectorHandle);
    	self.cadObject = self.cadObject.subtract(otherTimberObject.cadObject);
    	return self;
	}
	
	self.intersectFrom = function(thisConnectorHandle, otherTimberObject, otherConnectorHandle) {
		self.moveTo(thisConnectorHandle, otherTimberObject, otherConnectorHandle);
		self.cadObject = self.cadObject.intersect(otherTimberObject.cadObject);
		return self;
	}
	
	self.resetPosition = function(origoConnector) {

		var matrix = self.cadObject.properties.localOrigo.getTransformationTo(
			origoConnector, true, 0);
		self.cadObject = self.cadObject.transform(matrix);
		
// 		var transformation = self.cadObject.getTransformationToFlatLying();
// 		self.cadObject = self.cadObject.transform(transformation);
// 		self.cadObject = self.cadObject.translate([
// 			-self.cadObject.properties.centerOfGravity.point._x,
// 			-self.cadObject.properties.centerOfGravity.point._y,
// 			-self.cadObject.properties.centerOfGravity.point._z,
// 		]);
		return self;
	}

	self.getPropertyPoint = function(propertyHandle) {

   		return [
   			self.cadObject.properties[propertyHandle].point._x,
   			self.cadObject.properties[propertyHandle].point._y,
   			self.cadObject.properties[propertyHandle].point._z
   		];
	}
	
 	self.adjustLength = function(adjustment) {

	   if(Math.sign(adjustment) !== 0) {
		   var adjustmentPiece = new Timber(self.thickness, self.width, abs(adjustment));
		   console.log('piece', adjustmentPiece.thickness, adjustmentPiece.width, adjustmentPiece.length);

		   // If the adjustment is positive attach the adjustment piece will extend the piece
		   // thus, the adjustment piece's connector needs to have the opposite direction
		   // as the piece we are lengthening (the original piece's connector is pointed in
		   // the direction along the negative z-axis). Vice versa for shortening.
		   // Only do the adjustment if it is something else than zero.
		   adjustmentPiece.cadObject.properties['toOriginalPiece'] =
			   new CSG.Connector([adjustmentPiece.thickness/2, adjustmentPiece.width/2, 0], [0, 0, -1*Math.sign(adjustment)], [1, 0, 0]);
		   adjustmentPiece = adjustmentPiece.moveTo('toOriginalPiece', self, 'nearEndCenter', true);
		   if(Math.sign(adjustment) == 1) {
			   self.cadObject = self.cadObject.union(adjustmentPiece.cadObject);
		   } else if(Math.sign(adjustment) == -1) {
			   self.cadObject = self.cadObject.subtract(adjustmentPiece.cadObject);
		   }
	   }

	   return self;
 	}
}

// Determine number of extra legs needed between the corner legs.
// An extra leg is needed for each pair of squares beyond the fist two.
// If an initial count is odd, then one is added to it in order to make it even.
function determineIntermediateLegCounts(lengthwiseSquareCount, depthwiseSquareCount) {

	if(lengthwiseSquareCount > 4 && depthwiseSquareCount > 4) {
		console.log('Square count is impractical! (at least one side should be max. 4 squares deep)');
	}
	
	if(lengthwiseSquareCount % 2 != 0) { lengthwiseSquareCount++; }
	if(depthwiseSquareCount % 2 != 0) { depthwiseSquareCount++; }
	return {'lengthwise': lengthwiseSquareCount / 2 - 1, 'depthwise': depthwiseSquareCount / 2 - 1};
}

// Returns the amount by which a leg needs to be lengthened (a positive value) or
// shortened (a negative value) in order for the box to be horizontal on an inclined 
// surface (after all legs have been adjusted).
function getLegLengthAdjustment(timberPiece, inclination, centerCoordinates) {

	var legEndPoint = timberPiece.getPropertyPoint('nearEndCenter');

	// A negative distance means the leg is situated beyond the box's center, when viewing
	// from the global origo and vice versa.
	var legDistanceFromBoxCenterX = centerCoordinates[0] - legEndPoint[0];
	var legDistanceFromBoxCenterY = centerCoordinates[1] - legEndPoint[1];

	// A positive inclination means "going uphill" when moving away from the origo, and vice versa.
	var legAdjustmentX = inclination[0]*legDistanceFromBoxCenterX;
	var legAdjustmentY = inclination[1]*legDistanceFromBoxCenterY;
	var legAdjustment = legAdjustmentX + legAdjustmentY;
	return legAdjustment;	
}

function adjustLegLength(timberPiece, inclination, centerCoordinates) {

	var legEndPoint = timberPiece.getPropertyPoint('nearEndCenter');

	// A negative distance means the leg is situated beyond the box's center, when viewing
	// from the global origo and vice versa.
	var legDistanceFromBoxCenterX = centerCoordinates[0] - legEndPoint[0];
	var legDistanceFromBoxCenterY = centerCoordinates[1] - legEndPoint[1];

	// A positive inclination means "going uphill" when moving away from the origo, and vice versa.
	var legAdjustmentX = inclination[0]*legDistanceFromBoxCenterX;
	var legAdjustmentY = inclination[1]*legDistanceFromBoxCenterY;
	var legAdjustment = legAdjustmentX + legAdjustmentY;

	return timberPiece.adjustLength(legAdjustment);
}

function getParameterDefinitions() {
  return [
    { name: 'plankWidth', type: 'float', initial: 118, caption: "Width of the box planks [mm]:" },
    { name: 'plankThickness', type: 'float', initial: 43, caption: "Thickness of the box planks [mm]:" },
    { name: 'bottomThickness', type: 'float', initial: 15, caption: "Thickness of the bottom veneer panel [mm]:" },
    { name: 'boxLength', type: 'float', initial: 2500, caption: "Width of box [mm]:" },
    { name: 'boxSquareDepth', type: 'int', initial: 2, caption: "Square depth of the box [# of 30cm squares]:" },
    { name: 'boxHeight', type: 'float', initial: 500, caption: "Height of box [mm]:" },
    { name: 'bottomInclination', type: 'float', min: -1.0, max: 1.0, initial: 0.02, caption: "Inclination of bottom [absolute fraction]:" },
    { name: 'surfaceInclinationX', type: 'float', min: -1.0, max: 1.0, initial: -0.01, caption: "Surface inclination, depth-wise [signed fraction]:" },
    { name: 'surfaceInclinationY', type: 'float', min: -1.0, max: 1.0, initial: 0.02, caption: "Surface inclination, length-wise [signed fraction]:" },
    { name: 'assemble', type: 'choice', caption: 'Assemble', values: [0, 1], captions: ["No", "Yes"], initial: 0 }
  ];
}


/*
README! (when creating next design): Outline of the main clause:
- 1) Create all assembly pieces, one-by-one
-- 1.1) Define each piece's basic dimensions (thickness, width and length)
-- 1.2) Add all connectors that the piece will need (It is easier to think about how to
        position the connectors on a piece, if it is first turned [but not translated) 
        into its final assembly position)
-- 1.3) Cut all "male" joints (for assymetric ones) and for all symmetric ones (there is no male/female, as they look the same)
- 2) Cut any "female" joints needed for each piece's "male" joints already (currently 45-degree "miter" and "tenon & mortise" supported)
-- This is currently done by assembling the pieces, one-by-one using the connectors, and
   subtracting the "male" piece from the piece it is to be joined with, thus creating a
   matching "negative" or "female" joint.
- 3) Finally show the final assembly
-- Todo: show the individual pieces layed out alongside each other (i.e. not assembled)
-- Todo: create an "exploded" view of the assembly (each piece's orientation and relative distance to
         each other is the same, their distances between each other have just been 
         proportionally increased.
*/
function main(params) {

	var o = [];

	// ---- Starting point parameters definition section ---

	// Set axes
	var axes = createAxes(50, 50 * 0.001, 0.2, [0, 0, 0]);
	var origo = axes.properties.origo;
    o.push(axes);

	// START user specified variables
	// Native units are in decimeters, i.e. 1.0 dm = 10 cm = 100 mm = 0.1m
	var plankWidth = params['plankWidth'] / 100; // Length measure (provided in mm, converted to dm)
	var plankThickness = params['plankThickness'] / 100; // Length measure (provided in mm, converted to dm)
	var bottomThickness = params['bottomThickness'] / 100; // Thickness measere (provide in mm).

	var nominalSquareSide = 3; // Length measure
	var squareSideVarianceTolerance = 0.1; // Fractional measure, e.g. 0.1 = 10%

	var boxLength = params['boxLength'] / 100; // Length measure (provided in mm, converted to dm)
	var boxSquareDepth = params['boxSquareDepth']; // Provided as number of squares

	var boxHeight = params['boxHeight'] / 100; // In millimeters

	var surfaceInclination = [params['surfaceInclinationX'], params['surfaceInclinationY']];

	//var bottomInclination = 1/50; // x:y or x/y means that a slope rises/goes-down x [lenth-units] per y distance traversed.
	var bottomInclination = params['bottomInclination']; // x:y or x/y means that a slope rises/goes-down x [lenth-units] per y distance traversed.

	var assemblyMargin = 1.5 / 100; // fractions of a millimeter (e.g. 1.5 mm = 0.015 dm)
	// END user specified variables

    // START development variables
    var showLocalAxes = false;

    // END development variables

	// Parts
	// plank_<bottom|top>_<back|front>_<left|right> (eight planks in total)
	// leg_<back|middle|front>_<n> where <n> is the leg number as counted from the left to right
	// there are only legs under the planks (e.g. under the center of the box)
	// the middle legs are only on boxes three or four squares deep and there are only two of them (on on each side)
	// if there is an even number of squares, there is one leg for each two squares
	// if there is an uneven number of squares, there is one leg for each 1,5 squares

	var innerBoxLength = boxLength - 2 * plankThickness;
	var legHeight = (boxHeight - 2 * plankWidth); // Only the visible part of the leg (without joint)
	var legPieceHeight = legHeight + plankWidth; // Includes joint protrusion length.
	var legJointDepth = plankWidth;

	var minimumSquareSide = nominalSquareSide * (1 - squareSideVarianceTolerance);
	var maximumSquareSide = nominalSquareSide * (1 + squareSideVarianceTolerance);

	//var numberOfMinimumSizeSquares = Math.floor(innerBoxLength / minimumSquareSide);
	var numberOfNominalSizeSquares = Math.round(innerBoxLength / nominalSquareSide);
	//var numberOfMaximumSizeSquares = Math.ceil(innerBoxLength / maximumSquareSide);

	//console.log('Debug: numberOfMinimumSizeSquares', numberOfMinimumSizeSquares);
	//console.log('Debug: numberOfNominalSizeSquares', numberOfNominalSizeSquares);
	//console.log('Debug: numberOfMaximumSizeSquares', numberOfMaximumSizeSquares);

	var boxSquareLength = numberOfNominalSizeSquares;
	console.log('Box size (in # of squares): ' + boxSquareLength + 'x' + boxSquareDepth + '=' + boxSquareLength * boxSquareDepth);
	var extraLegCounts = determineIntermediateLegCounts(boxSquareLength, boxSquareDepth);
	console.log('extraLegCounts', extraLegCounts);

	var actualSquareSide = innerBoxLength / numberOfNominalSizeSquares;

	console.log('actualSquareSide', actualSquareSide);
	
	if(actualSquareSide > maximumSquareSide || actualSquareSide < minimumSquareSide) {
		console.log(
			'Warning: Square size not within tolerance! (Calculated number of squares: ' + numberOfNominalSizeSquares 
		  + ', actual square size: ' + actualSquareSide 
	      + ', minimum square size: ' + minimumSquareSide 
		  + ', maximum square size: ' + maximumSquareSide + ')'
		);
	}

	var innerBoxDepth = actualSquareSide * boxSquareDepth;
	console.log('innerBoxDepth', innerBoxDepth);

	var boxDepth = innerBoxDepth + (2 * plankThickness);
	console.log('boxDepth', boxDepth);

	var boxCenterCoordinates = [boxDepth/2, boxLength/2, boxHeight/2];

	// Hard-code a two-piece bottom. Later, make this dynamic (if needed).

	// each piece its own entry. Each entry consists of four coordinates, with the one
	// closest to the global origo first, and then going clockwise around the rim of the bottom-piece.
	var rabbetWidth = plankThickness/2;
	var bottomLeftPanel = new Timber(bottomThickness, innerBoxDepth+rabbetWidth*2, innerBoxLength/2+rabbetWidth, {'x': 1/50, 'y': -1/50});
	bottomLeftPanel.createConnector('box', 
		{'point': [-rabbetWidth, -rabbetWidth, 0], 'axis': [0, 0, 1], 'normal': [1, 0, 0]});
	var bottomRightPanel = new Timber(bottomThickness, innerBoxDepth+rabbetWidth*2, innerBoxLength/2+rabbetWidth, {'x': 1/50, 'y': 1/50});
	bottomRightPanel.createConnector('box', 
		{'point': [-rabbetWidth, bottomRightPanel.length+rabbetWidth, 0], 'axis': [0, 0, 1], 'normal': [1, 0, 0]});
	//o.push(bottomRightPanel.cadObject);

	// innerBoxLength, innerBoxDepth

	// ---- Assembly piece creation section ----

	var plankBackBottom = new Timber(plankThickness, plankWidth, boxLength);
    plankBackBottom.cutMiter('far', 'front', 'y').cutMiter('near', 'front', 'y');
	plankBackBottom.createConnector('left_plank', 
		{'point': [0, 0, boxLength], 'axis': [1, 0, 0], 'normal': [0, 1, 0]});
	plankBackBottom.createConnector('right_plank', 
		{'point': [0, 0, 0], 'axis': [1, 0, 0], 'normal': [0, 1, 0]});
	plankBackBottom.turn('x', 90); // Put the box's first piece of wood in place. (i.e. turn the piece clockwise to the right)
	plankBackBottom.createConnector('upper_back_plank', 
		{'point': [0, 0, plankWidth], 'axis': [0, 0, 1], 'normal': [1, 0, 0]});
	plankBackBottom.createConnector('leg_back_left', 
		{'point': [0, 0, 0], 'axis': [0, 0, -1], 'normal': [1, 0, 0]});
	plankBackBottom.createConnector('leg_back_right', 
		{'point': [0, boxLength, 0], 'axis': [0, 0, -1], 'normal': [1, 0, 0]});
	
    var plankRightBottom = new Timber(plankThickness, plankWidth, boxDepth);
    plankRightBottom.cutMiter('far', 'front', 'y').cutMiter('near', 'front', 'y');
	plankRightBottom.createConnector('back_plank', 
		{'point': [0, 0, boxDepth], 'axis': [0, 0, 1], 'normal': [0, 1, 0]});
	plankRightBottom.createConnector('front_plank', 
		{'point': [0, 0, 0], 'axis': [0, 0, -1], 'normal': [0, 1, 0]});
	plankRightBottom.turn('x', 90).turn('z', -90);

    var plankLeftBottom = new Timber(plankThickness, plankWidth, boxDepth);
    plankLeftBottom.cutMiter('far', 'front', 'y').cutMiter('near', 'front', 'y');
	plankLeftBottom.createConnector('back_plank', 
		{'point': [0, 0, 0], 'axis': [0, 0, -1], 'normal': [0, 1, 0]});
	plankLeftBottom.createConnector('front_plank', 
		{'point': [0, 0, boxDepth], 'axis': [0, 0, 1], 'normal': [0, 1, 0]});
	plankLeftBottom.turn('x', 90).turn('z', 90);

	var plankFrontBottom = new Timber(plankThickness, plankWidth, boxLength);
    plankFrontBottom.cutMiter('far', 'front', 'y').cutMiter('near', 'front', 'y');
	plankFrontBottom.createConnector('left_plank', 
		{'point': [0, 0, 0], 'axis': [1, 0, 0], 'normal': [0, 1, 0]});
	plankFrontBottom.turn('x', 90); // Put the box's first piece of wood in place. (i.e. turn the piece clockwise to the right)
	plankFrontBottom.createConnector('leg_front_left', 
		{'point': [plankThickness, boxLength, 0], 'axis': [0, 0, -1], 'normal': [1, 0, 0]});
	plankFrontBottom.createConnector('leg_front_right', 
		{'point': [plankThickness, 0, 0], 'axis': [0, 0, -1], 'normal': [1, 0, 0]});

	var plankBackTop = new Timber(plankThickness, plankWidth, boxLength);
    plankBackTop.cutMiter('far', 'front', 'y').cutMiter('near', 'front', 'y');
	plankBackTop.createConnector('left_plank', 
		{'point': [0, 0, boxLength], 'axis': [1, 0, 0], 'normal': [0, 1, 0]});
	plankBackTop.createConnector('right_plank', 
		{'point': [0, 0, 0], 'axis': [1, 0, 0], 'normal': [0, 1, 0]});
	plankBackTop.turn('x', 90); // Put the box's first piece of wood in place. (i.e. turn the piece clockwise to the right)
 	plankBackTop.createConnector('lower_back_plank', 
 		{'point': [0, 0, 0], 'axis': [0, 0, -1], 'normal': [1, 0, 0]});
	
    var plankRightTop = new Timber(plankThickness, plankWidth, boxDepth);
    plankRightTop.cutMiter('far', 'front', 'y').cutMiter('near', 'front', 'y');
	plankRightTop.createConnector('back_plank', 
		{'point': [0, 0, boxDepth], 'axis': [0, 0, 1], 'normal': [0, 1, 0]});
	plankRightTop.createConnector('front_plank', 
		{'point': [0, 0, 0], 'axis': [0, 0, -1], 'normal': [0, 1, 0]});

    var plankLeftTop = new Timber(plankThickness, plankWidth, boxDepth);
    plankLeftTop.cutMiter('far', 'front', 'y').cutMiter('near', 'front', 'y');
	plankLeftTop.createConnector('back_plank', 
		{'point': [0, 0, 0], 'axis': [0, 0, -1], 'normal': [0, 1, 0]});
	plankLeftTop.createConnector('front_plank', 
		{'point': [0, 0, boxDepth], 'axis': [0, 0, 1], 'normal': [0, 1, 0]});

	var plankFrontTop = new Timber(plankThickness, plankWidth, boxLength);
    plankFrontTop.cutMiter('far', 'front', 'y').cutMiter('near', 'front', 'y');
	plankFrontTop.createConnector('left_plank', 
		{'point': [0, 0, 0], 'axis': [1, 0, 0], 'normal': [0, 1, 0]});

	var legBackLeft = new Timber(plankThickness, plankThickness, legPieceHeight);
	legBackLeft.createConnector('box', 
		{'point': [0, 0, legHeight], 'axis': [0, 0, 1], 'normal': [1, 0, 0]});
	legBackLeft.cutTenonJoint('far_end', {'x1': 1/3, 'y1': 1/3, 'x2': 0, 'y2': 0}, {'depth': plankWidth});
	//function adjustLegLength(timberPiece, inclination, centerCoordinates) {	
// 	var adjustment = getLegLengthAdjustment(legBackLeft, surfaceInclination, boxCenterCoordinates);
// 	legBackLeft = legBackLeft.adjustLength(adjustment);
// 	var adjustmenPiece = createLegAdjustmentPiece(legBackLeft, adjustment);
	var legBackRight = new Timber(plankThickness, plankThickness, legPieceHeight);
	legBackRight.createConnector('box', 
		{'point': [0, plankThickness, legHeight], 'axis': [0, 0, 1], 'normal': [1, 0, 0]});
	legBackRight.cutTenonJoint('far_end', {'x1': 1/3, 'y1': 0, 'x2': 0, 'y2': 1/3}, {'depth': plankWidth});

	var legFrontLeft = new Timber(plankThickness, plankThickness, legPieceHeight);
	legFrontLeft.createConnector('box', 
		{'point': [0, 0, legHeight], 'axis': [0, 0, 1], 'normal': [-1, 0, 0]});
	legFrontLeft.cutTenonJoint('far_end', {'x1': 0, 'y1': 1/3, 'x2': 1/3, 'y2': 0}, {'depth': plankWidth});

	var legFrontRight = new Timber(plankThickness, plankThickness, legPieceHeight);
	legFrontRight.createConnector('box', 
		{'point': [0, plankThickness, legHeight], 'axis': [0, 0, 1], 'normal': [-1, 0, 0]});
	legFrontRight.cutTenonJoint('far_end', {'x1': 0, 'y1': 0, 'x2': 1/3, 'y2': 1/3}, {'depth': plankWidth});

	// Then add the intermediate (or "extra") legs.
	var extraLegsLengthwise = [];
	var extraLegsDepthwise = [];

	// There is one more extra leg interval, than there are extra legs. 
	// (The legs are between the intervals)
	var extraLegIntervalLengthwise = innerBoxLength / (extraLegCounts.lengthwise + 1);
	var extraLegIntervalDepthwise = innerBoxDepth / (extraLegCounts.depthwise + 1);

	for(var i = 0; i < extraLegCounts.lengthwise; i++) {
		extraLegsLengthwise.push({
			'back': new Timber(plankThickness, plankThickness, legPieceHeight),
			'front': new Timber(plankThickness, plankThickness, legPieceHeight)
		});
		extraLegsLengthwise[i].back.createConnector('box', 
			{'point': [0, plankThickness/2, legHeight], 'axis': [0, 0, 1], 'normal': [1, 0, 0]});
		extraLegsLengthwise[i].back.cutTenonJoint('far_end', {'x1': 1/2, 'y1': 0, 'x2': 0, 'y2': 0}, {'depth': plankWidth});
		extraLegsLengthwise[i].front.createConnector('box', 
			{'point': [plankThickness, plankThickness/2, legHeight], 'axis': [0, 0, 1], 'normal': [1, 0, 0]});
		extraLegsLengthwise[i].front.cutTenonJoint('far_end', {'x1': 0, 'y1': 0, 'x2': 1/2, 'y2': 0}, {'depth': plankWidth});

		plankBackBottom.createConnector('leg_extra_back_' + i, 
			{'point': [0, plankThickness + extraLegIntervalLengthwise * (i+1), 0], 'axis': [0, 0, -1], 'normal': [1, 0, 0]});
		plankBackBottom.createConnector('leg_extra_front_' + i, 
			{'point': [boxDepth, plankThickness + extraLegIntervalLengthwise * (i+1), 0], 'axis': [0, 0, -1], 'normal': [1, 0, 0]});
	}
	for(var i = 0; i < extraLegCounts.depthwise; i++) {
		extraLegsDepthwise.push({
			'left': new Timber(plankThickness, plankThickness, legPieceHeight),
			'right': new Timber(plankThickness, plankThickness, legPieceHeight)
		});
		extraLegsDepthwise[i].left.createConnector('box', 
			{'point': [plankThickness/2, 0, legHeight], 'axis': [0, 0, 1], 'normal': [1, 0, 0]});
		extraLegsDepthwise[i].left.cutTenonJoint('far_end', {'x1': 0, 'y1': 1/2, 'x2': 0, 'y2': 0}, {'depth': plankWidth});
		extraLegsDepthwise[i].right.createConnector('box', 
			{'point': [plankThickness/2, plankThickness, legHeight], 'axis': [0, 0, 1], 'normal': [1, 0, 0]});
		extraLegsDepthwise[i].right.cutTenonJoint('far_end', {'x1': 0, 'y1': 0, 'x2': 0, 'y2': 1/2}, {'depth': plankWidth});

		plankLeftBottom.createConnector('leg_extra_left_' + i, 
			{'point': [plankThickness + extraLegIntervalDepthwise * (i+1), 0, 0], 'axis': [0, 0, -1], 'normal': [1, 0, 0]});
		plankRightBottom.createConnector('leg_extra_right_' + i, 
			{'point': [plankThickness + extraLegIntervalDepthwise * (i+1), plankThickness, 0], 'axis': [0, 0, -1], 'normal': [1, 0, 0]});
	}

	// ---- Pre-assembly section (for cutting the female joints etc.) ----
	// The box's first piece of wood is already rotated into place. Just move it up to the legHeight
	plankBackBottom.translate([0, 0, legHeight]);
 	plankRightBottom = plankRightBottom.moveTo('back_plank', plankBackBottom, 'right_plank');
 	plankLeftBottom = plankLeftBottom.moveTo('back_plank', plankBackBottom, 'left_plank');
 	plankFrontBottom = plankFrontBottom.moveTo('left_plank', plankLeftBottom, 'front_plank');

	plankBackTop = plankBackTop.moveTo('lower_back_plank', plankBackBottom, 'upper_back_plank');
	plankRightTop = plankRightTop.moveTo('back_plank', plankBackTop, 'right_plank');
	plankLeftTop = plankLeftTop.moveTo('back_plank', plankBackTop, 'left_plank');
	plankFrontTop = plankFrontTop.moveTo('left_plank', plankLeftTop, 'front_plank');

	bottomLeftPanel = bottomLeftPanel.moveTo('box', plankBackBottom, 'leg_back_left');
	bottomRightPanel = bottomRightPanel.moveTo('box', plankBackBottom, 'leg_back_right');
	plankBackBottom.cadObject = plankBackBottom.cadObject.subtract(bottomLeftPanel.cadObject);
	plankBackBottom.cadObject = plankBackBottom.cadObject.subtract(bottomRightPanel.cadObject);
	plankLeftBottom.cadObject = plankLeftBottom.cadObject.subtract(bottomLeftPanel.cadObject);
	plankRightBottom.cadObject = plankRightBottom.cadObject.subtract(bottomRightPanel.cadObject);
	plankFrontBottom.cadObject = plankFrontBottom.cadObject.subtract(bottomLeftPanel.cadObject);
	plankFrontBottom.cadObject = plankFrontBottom.cadObject.subtract(bottomRightPanel.cadObject);

	legBackLeft = legBackLeft.moveTo('box', plankBackBottom, 'leg_back_left');
	legBackLeft = adjustLegLength(legBackLeft, surfaceInclination, boxCenterCoordinates);
	plankBackBottom.cadObject = plankBackBottom.cadObject.subtract(legBackLeft.cadObject);
	plankLeftBottom.cadObject = plankLeftBottom.cadObject.subtract(legBackLeft.cadObject);
	bottomLeftPanel.cadObject = bottomLeftPanel.cadObject.subtract(legBackLeft.cadObject);

	legBackRight = legBackRight.moveTo('box', plankBackBottom, 'leg_back_right');
	legBackRight = adjustLegLength(legBackRight, surfaceInclination, boxCenterCoordinates);
	plankBackBottom.cadObject = plankBackBottom.cadObject.subtract(legBackRight.cadObject);
	plankRightBottom.cadObject = plankRightBottom.cadObject.subtract(legBackRight.cadObject);
	bottomRightPanel.cadObject = bottomRightPanel.cadObject.subtract(legBackRight.cadObject);

	legFrontLeft = legFrontLeft.moveTo('box', plankFrontBottom, 'leg_front_left');
	legFrontLeft = adjustLegLength(legFrontLeft, surfaceInclination, boxCenterCoordinates);
	plankFrontBottom.cadObject = plankFrontBottom.cadObject.subtract(legFrontLeft.cadObject);
	plankLeftBottom.cadObject = plankLeftBottom.cadObject.subtract(legFrontLeft.cadObject);
	bottomLeftPanel.cadObject = bottomLeftPanel.cadObject.subtract(legFrontLeft.cadObject);

	legFrontRight = legFrontRight.moveTo('box', plankFrontBottom, 'leg_front_right');
	legFrontRight = adjustLegLength(legFrontRight, surfaceInclination, boxCenterCoordinates);
 	plankFrontBottom.cadObject = plankFrontBottom.cadObject.subtract(legFrontRight.cadObject);
 	plankRightBottom.cadObject = plankRightBottom.cadObject.subtract(legFrontRight.cadObject);
	bottomRightPanel.cadObject = bottomRightPanel.cadObject.subtract(legFrontRight.cadObject);


	// Then cut the mortises for the intermediate (or "extra") legs.
	for(var i = 0; i < extraLegsLengthwise.length; i++) {

		extraLegsLengthwise[i].back.moveTo('box', plankBackBottom, 'leg_extra_back_' + i);
		extraLegsLengthwise[i].back = adjustLegLength(extraLegsLengthwise[i].back, surfaceInclination, boxCenterCoordinates);
		plankBackBottom.cadObject = plankBackBottom.cadObject.subtract(extraLegsLengthwise[i].back.cadObject);
		extraLegsLengthwise[i].front.moveTo('box', plankBackBottom, 'leg_extra_front_' + i);
		extraLegsLengthwise[i].front = adjustLegLength(extraLegsLengthwise[i].front, surfaceInclination, boxCenterCoordinates);
		plankFrontBottom.cadObject = plankFrontBottom.cadObject.subtract(extraLegsLengthwise[i].front.cadObject);
		bottomLeftPanel.cadObject = bottomLeftPanel.cadObject.subtract(extraLegsLengthwise[i].back.cadObject);
		bottomLeftPanel.cadObject = bottomLeftPanel.cadObject.subtract(extraLegsLengthwise[i].front.cadObject);
		bottomRightPanel.cadObject = bottomRightPanel.cadObject.subtract(extraLegsLengthwise[i].back.cadObject);
		bottomRightPanel.cadObject = bottomRightPanel.cadObject.subtract(extraLegsLengthwise[i].front.cadObject);
	}
	for(var i = 0; i < extraLegsDepthwise.length; i++) {

 		extraLegsDepthwise[i].left.moveTo('box', plankLeftBottom, 'leg_extra_left_' + i);
		extraLegsDepthwise[i].left = adjustLegLength(extraLegsDepthwise[i].left, surfaceInclination, boxCenterCoordinates);
		plankLeftBottom.cadObject = plankLeftBottom.cadObject.subtract(extraLegsDepthwise[i].left.cadObject);
		extraLegsDepthwise[i].right.moveTo('box', plankRightBottom, 'leg_extra_right_' + i);
		extraLegsDepthwise[i].right = adjustLegLength(extraLegsDepthwise[i].right, surfaceInclination, boxCenterCoordinates);
		plankRightBottom.cadObject = plankRightBottom.cadObject.subtract(extraLegsDepthwise[i].right.cadObject);
		bottomLeftPanel.cadObject = bottomLeftPanel.cadObject.subtract(extraLegsDepthwise[i].left.cadObject);
		bottomLeftPanel.cadObject = bottomLeftPanel.cadObject.subtract(extraLegsDepthwise[i].right.cadObject);
		bottomRightPanel.cadObject = bottomRightPanel.cadObject.subtract(extraLegsDepthwise[i].left.cadObject);
		bottomRightPanel.cadObject = bottomRightPanel.cadObject.subtract(extraLegsDepthwise[i].right.cadObject);
	}

	// ---- Assembly / material manifest  -sections ----
	
    if(params['assemble'] == '1') {
		o.push(plankBackBottom.cadObject);
		o.push(plankRightBottom.cadObject);
		o.push(plankLeftBottom.cadObject);
		o.push(plankFrontBottom.cadObject);

		o.push(plankBackTop.cadObject);
		o.push(plankRightTop.cadObject);
		o.push(plankLeftTop.cadObject);
		o.push(plankFrontTop.cadObject);

		o.push(bottomLeftPanel.cadObject);
		o.push(bottomRightPanel.cadObject);

	 	o.push(legBackLeft.cadObject);
 	 	o.push(legBackRight.cadObject);
	 	o.push(legFrontLeft.cadObject);
	 	o.push(legFrontRight.cadObject);

		for(var i = 0; i < extraLegsLengthwise.length; i++) {
			o.push(extraLegsLengthwise[i].back.cadObject);
 			o.push(extraLegsLengthwise[i].front.cadObject);
		}

		for(var i = 0; i < extraLegsDepthwise.length; i++) {
			o.push(extraLegsDepthwise[i].left.cadObject);
			o.push(extraLegsDepthwise[i].right.cadObject);
		}

    // o.push(bottomLeftPanel.cadObject.translate([rabbetWidth, rabbetWidth, legHeight]));
    // o.push(bottomRightPanel.cadObject.translate([rabbetWidth, bottomRightPanel.length + rabbetWidth, legHeight]));
    // TODO/THINK: _make sure origo for the object is in the same place_ so that it is easy to move and rotate/turn-over if needed
    // TODO: only prepare all modifications for the object using the manipulation-methods.
    //       Once all are in place, the object is executed (e.g. "plank()") upon which the manipulations are applied in a logical order.
    // NEW!: Join pieces (designate all join types and locations as an array of hashes, with each
    // containing the join's type, location on timber and other parameters)
    
    } else {
		var x = 2;

		o.push(plankBackBottom.resetPosition(origo).cadObject.rotateZ(-90).translate( [x*0, 0, 0]));
		o.push(plankRightBottom.resetPosition(origo).cadObject.rotateZ(-90).translate([x*1, 0, 0]));
 		o.push(plankLeftBottom.resetPosition(origo).cadObject.rotateZ(-90).translate( [x*2, 0, 0]));
 		o.push(plankFrontBottom.resetPosition(origo).cadObject.rotateZ(-90).translate([x*3, 0, 0]));

		o.push(plankBackTop.resetPosition(origo).cadObject.rotateZ(-90).translate( [x*4, 0, 0]));
		o.push(plankRightTop.resetPosition(origo).cadObject.rotateZ(-90).translate([x*5, 0, 0]));
		o.push(plankLeftTop.resetPosition(origo).cadObject.rotateZ(-90).translate( [x*6, 0, 0]));
		o.push(plankFrontTop.resetPosition(origo).cadObject.rotateZ(-90).translate([x*7, 0, 0]));

		var offset = 7;

		o.push(bottomLeftPanel.lieFlat().resetToFirstOctant().cadObject.translate([x*(offset + 1), 0, 0]));

		var offset = offset + bottomLeftPanel.width;

		o.push(bottomRightPanel.lieFlat().resetToFirstOctant().cadObject.translate([x*(offset + 1), 0, 0]));

		var offset = offset + bottomRightPanel.width;

	 	o.push(legBackLeft.resetPosition(origo).cadObject.rotateZ(-90).translate(  [x*(offset + 1),  0, 0]));
	 	o.push(legBackRight.resetPosition(origo).cadObject.rotateZ(-90).translate( [x*(offset + 2),  0, 0]));
	 	o.push(legFrontLeft.resetPosition(origo).cadObject.rotateZ(-90).translate( [x*(offset + 3), 0, 0]));
	 	o.push(legFrontRight.resetPosition(origo).cadObject.rotateZ(-90).translate([x*(offset + 4), 0, 0]));

		var offset = offset + 4 + 1;

		for(var i = 0; i < extraLegsLengthwise.length; i++) {
			o.push(extraLegsLengthwise[i].back.resetPosition(origo).cadObject.rotateZ(-90).translate([x*(offset+i), 0, 0]));
		}
		offset += extraLegsLengthwise.length;
		for(var i = 0; i < extraLegsLengthwise.length; i++) {
			o.push(extraLegsLengthwise[i].front.resetPosition(origo).cadObject.rotateZ(-90).translate([x*(offset+i), 0, 0]));
		}
		offset += extraLegsLengthwise.length;
		for(var i = 0; i < extraLegsDepthwise.length; i++) {
			o.push(extraLegsDepthwise[i].left.resetPosition(origo).cadObject.rotateZ(-90).translate([x*(offset+i), 0, 0]));
		}
		offset += extraLegsDepthwise.length;
		for(var i = 0; i < extraLegsDepthwise.length; i++) {
			o.push(extraLegsDepthwise[i].right.resetPosition(origo).cadObject.rotateZ(-90).translate([x*(offset+i), 0, 0]));
		}
    }


   	return o;
}
