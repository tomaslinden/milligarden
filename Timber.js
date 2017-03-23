/*
Title: Timber-class for parametric multistory square foot gardening box
Version: 0.1.4
Author: Tomas Lindén (tomaslinden24@gmail.com)
Created: 2016-04-19 (ISO-8601)
Last modified: 2015-07-10 (ISO-8601)
License: Creative Commons Attribution-ShareAlike 4.0 International License, http://creativecommons.org/licenses/by-sa/4.0/
*/
Timber = function(thickness, width, length, inclination) {

    var self = this;

    self.cadObject = undefined;

    self.thickness = thickness;
    self.width = width;
    self.length = length;
    self.globalOrigo = [[0, 0, 0], [0, 0, 1], [1, 0, 0]];

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

		// If inclination is not set, then just create the Extrusion as a rectangular box
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
		// Face: A Extrusion face specification where the joint is to be carved (one of six sides of the Extrusion piece, which has six sides).
    	//       ('near_end' (-z), 'far_end' (+z), front (+x), 'top' (+y), 'back' (-x), 'bottom' (-y))
		// Cut:  (cut proportions, e.g. for tenon, all 0..1 [x1, y1, x2, y2, z], 
		// Overrides:  Optional overrides mm: [thickness_override, width_override, depth_override), if any of these are left out, then the appropriate
		//    dimensions of face of the Extrusion that is to be cut is used instead.
    self.cutTenonJoint = function(face, cut, overrides) {

		// This for the near_end and far_end faces. The other faces need other dimensions.
		// (Refactor as needed.)

		// An active joint consists of the following:
		// A) A side specification where the join is to be carved (one of six sides of the Extrusion piece, which has six sides).
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

        // A slant in the cut means that the perpendicular cut is done in an oblique manner
        // against the extruded length.
        if('slant' in overrides) {
            // First we move the cut object (i.e. what is to be removed from the piece in order to create the tenon)
            // to the seventh octant (i.e. where all axes are negative).
            // And rotate it there
            var offset = cutObject.getBounds()[1];
            cutObject = cutObject.translate([-1*offset['_x'], -1*offset['_y'], -1*offset['_z']]);
            cutObject = cutObject.rotateX(-1*Math.abs(overrides['slant'][0]));
            cutObject = cutObject.rotateY(-1*Math.abs(overrides['slant'][1]));

            // Then prepare a piece with which we are to create the slant in the cut object
            var slantedOffset = cutObject.getBounds();
            var cuttingBox = CSG.cube({
                center: [0, 0, 0],
                radius: [(Math.abs(slantedOffset[0]['_x'])+Math.abs(slantedOffset[1]['_x']))/2, (Math.abs(slantedOffset[0]['_y'])+Math.abs(slantedOffset[1]['_y']))/2, (Math.abs(slantedOffset[0]['_z'])+Math.abs(slantedOffset[1]['_z']))/2],
            });
            var cbo = cuttingBox.getBounds(); // cuttingBoxOffset
            // And move it to the seventh octant as well.
            cuttingBox = cuttingBox.translate([-1*(Math.abs(cbo[0]['_x'])+Math.abs(cbo[1]['_x']))/2, -1*(Math.abs(cbo[0]['_y'])+Math.abs(cbo[1]['_y']))/2, -1*(Math.abs(cbo[0]['_z'])+Math.abs(cbo[1]['_z']))/2]);

            // Then cut the slant into the cut object.
            cutObject = cutObject.intersect(cuttingBox);

            // And rotate the piece back so that it is again aligned with the z axis
            cutObject = cutObject.rotateX(Math.abs(overrides['slant'][0]));
            cutObject = cutObject.rotateY(Math.abs(overrides['slant'][1]));

            // and finally move it back to the first octant.
            var coo = cutObject.getBounds(); // cutObjectOffset
            cutObject = cutObject.translate([Math.abs(coo[0]['_x']), Math.abs(coo[0]['_y']), Math.abs(coo[0]['_z'])]);

            // If the direction of the slant is negative, it means the cut needs to be rotated in a clockwise manner.
            // By default, the cut is first done in the counterclockwise direction (i.e. when looking down the x-axis, the slant is down to the right) 
            if(Math.sign(overrides['slant'][0]) > 0) {
                //console.log('X-slant');
                cutObject = cutObject.mirroredY();
                cutObject = cutObject.translate([0, width, 0]);
            }
            if(Math.sign(overrides['slant'][1]) > 0) {
                //console.log('Y-slant');
                cutObject = cutObject.mirroredX();
                cutObject = cutObject.translate([thickness, 0, 0]);
            }

        }
        
        // If the cut is to be done in the far end, first mirror the cut, and the put it the upper end of the extruded material piece.
		if(face == 'far_end') {
			cutObject = cutObject.mirroredZ();
			cutObject = cutObject.translate([0, 0, depth]);
			cutObject = cutObject.translate([0, 0, self.length - depth]);
		} 
 		else if(face == 'near_end') {
 		    // No translation needed for the near end -- it is already in place.
            //cutObject = cutObject.translate([0, 0, 0]);
 		}
		
        //self.cadObject = cutObject;
        //self.cadObject = cuttingBox;
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
            // Nothing needed here for now
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

    // translation [x, y, z]
    self.translate = function(translation) {
        self.cadObject = self.cadObject.translate(translation);
        return self;
    }

    // rotation [x, y, z]
    // not properly tested
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
    self.mirroredX = function() { // x=0 is mirror plane
        self.cadObject = self.cadObject.mirroredX();
    }
    self.mirroredY = function() { // y=0 is mirror plane
        self.cadObject = self.cadObject.mirroredY();
    }
    self.mirroredZ = function() { // z=0 is mirror plane
        self.cadObject = self.cadObject.mirroredZ();
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
    
    self.createConnector = function(connectorHandle, connectorInfo, debug) {

        self.cadObject.properties[connectorHandle] =
        	new CSG.Connector(connectorInfo.point, connectorInfo.axis, connectorInfo.normal);
        if(debug) {
            self.visualizeConnector(connectorHandle, debug);
        }
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
	
	self.unionTo = function(otherExtrusionObject, thisConnectorHandle, otherConnectorHandle) {
	
		self.moveTo(thisConnectorHandle, otherExtrusionObject, otherConnectorHandle);
    	self.cadObject = self.cadObject.union(otherExtrusionObject.cadObject);
		return self;
	}
	
	self.moveTo = function(thisConnectorHandle, otherExtrusionObject, otherConnectorHandle, debug) {

		if(debug) {
			console.log('moveTo thisConnectorHandle', thisConnectorHandle);
			console.log('moveTo self.cadObject.properties[thisConnectorHandle]', self.cadObject.properties[thisConnectorHandle]);
			console.log('moveTo otherExtrusionObject.cadObject.properties[otherConnectorHandle]', otherExtrusionObject.cadObject.properties[otherConnectorHandle]);
			console.log('moveTo otherConnectorHandle', otherConnectorHandle);
		}
		var matrix = self.cadObject.properties[thisConnectorHandle].getTransformationTo(
		  otherExtrusionObject.cadObject.properties[otherConnectorHandle], 
		  true,   // mirror 
		  0       // normalrotation
		);
		self.cadObject = self.cadObject.transform(matrix);

		return self;
	}
	
	// Self is the object to which we want to create the inverted join in.
	self.createInvertedJoinWith = function(thisConnectorHandle, otherExtrusionObject, otherConnectorHandle) {

		otherExtrusionObject.moveTo(otherConnectorHandle, self, thisConnectorHandle);
    	self.cadObject = self.cadObject.subtract(otherExtrusionObject.cadObject);
    	return self;
	}
	
	self.intersectFrom = function(thisConnectorHandle, otherExtrusionObject, otherConnectorHandle) {
		self.moveTo(thisConnectorHandle, otherExtrusionObject, otherConnectorHandle);
		self.cadObject = self.cadObject.intersect(otherExtrusionObject.cadObject);
		return self;
	}
	
	self.resetPosition = function(origoConnector) {

        //self.globalOrigo
        if (!origoConnector) {
            origoConnector = new CSG.Connector([0,0,0], [0,0,-1], [1,0,0]);
        }

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
            var adjustmentPiece = new Extrusion(self.thickness, self.width, abs(adjustment));
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
 	
 	// TBD
 	self.truncate = function(coord0, coord1) {
 	
//         console.log('truncate');
//         console.log('coord0', coord0);
//         console.log('coord1', coord1);
        // Get bounding box
        var bounds = self.cadObject.getBounds();
//         console.log('bounds', bounds);
        if(coord0[0]) {
            bounds[0]._x = coord0[0];
        }
        if(coord0[1]) {
            bounds[1]._x = coord0[1];
        }
        if(coord1[0]) {
            bounds[0]._y = coord1[0];
        }
        if(coord1[1]) {
            bounds[1]._y = coord1[1];
        }
//         console.log('bounds', bounds);
//         console.log(Math.abs(bounds[1]._x - bounds[0]._x), Math.abs(bounds[1]._y - bounds[0]._y), Math.abs(bounds[1]._z - bounds[0]._z));
        // Create truncating box
        var truncationBox = CSG.cube({
            center: [
                  (Math.abs(bounds[1]._x - bounds[0]._x))/2, 
                  (Math.abs(bounds[1]._y - bounds[0]._y))/2, 
                  (Math.abs(bounds[1]._z - bounds[0]._z))/2, 
//                0,0,0
            ], 
            radius: [
                Math.abs(bounds[1]._x - bounds[0]._x)/2, 
                Math.abs(bounds[1]._y - bounds[0]._y)/2,
                Math.abs(bounds[1]._z - bounds[0]._z)/2,
//                1,1,1
            ]
        });
        truncationBox = truncationBox.translate([bounds[0]._x, bounds[0]._y, bounds[0]._z]);
        //self.cadObject = truncationBox;
        self.cadObject = self.cadObject.intersect(truncationBox);
        return self.cadObject;
 	}
}
