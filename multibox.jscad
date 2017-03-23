/*
Title: Parametric multistory square foot gardening box
Version: 0.1.2
Author: Tomas Lindén (tomaslinden24@gmail.com)
Created: 2016-04-19 (ISO-8601)
Last modified: 2015-05-01 (ISO-8601)
License: Creative Commons Attribution-ShareAlike 4.0 International License, http://creativecommons.org/licenses/by-sa/4.0/

Done:

Todo:
- Add support for second box of equal width but possibly less depth, with lower box leg interval allowed
-- Add option for top box, number of squares, zero disables
-- Refactor to use new struct-based box definition
-- Distance between lower and higher box is 1,5 times the depth of the top box
--- Optionally make this configurable
-- Leg height is defined indirectly from lower box height (if equal to or less than 2x side plank width, then disable lower box legs)

- Color the front and top sides of the planks
- Make it possible to "explode" the composition into distinct pieces that need to be worked
--- Consider using the orthonormal basis
-- Either keep the exploded pieces showing how they're supposed to be assembled
-- Each piece should have clearly visible dimensions, so that they can be manufactured in different ways
*/
function getSpecification(nativeParams) {

    var specs = {
        "user": [
            { name: 'plankThickness', type: 'float', initial: 44, caption: "Thickness of the box planks [mm]:" },
            { name: 'plankWidth', type: 'float', initial: 118, caption: "Width of the box planks [mm]:" },
            { name: 'bottomThickness', type: 'float', initial: 18, caption: "Thickness of the bottom veneer panel [mm]:" },
            { name: 'boxWidth', type: 'float', initial: 1240, caption: "Width of box (same as length) [mm]:" },
            { name: 'boxHeight', type: 'float', initial: 236, caption: "Height of box (also determines leg height, if any needed) [mm]:" },
            { name: 'boxSquareDepth', type: 'float', initial: 4, caption: "Square depth of the box [# of 30cm squares]:" },
            { name: 'upperBoxSquareDepth', type: 'float', min: 0, max: 2.0, initial: 2.0, caption: "Square depth of upper box (zero disables top box) [# of 30cm squares]" },
            { name: 'verticalBoxSpacingSquares', type: 'float', min: 0, max: 10, initial: 2*1.618, caption: "Distance between boxes [# of 30cm squares]" },
            { name: 'verticalSupportTenonLengthFraction', type: 'float', min: 0, max: 2, initial: 1.9, caption: "Length of vertical support tenon [fraction of plank width]" },
            { name: 'bottomInclination', type: 'float', min: 0.0, max: 1.0, initial: 0.04, caption: "Inclination of bottom [absolute fraction]:" },
            { name: 'surfaceInclinationX', type: 'float', min: -1.0, max: 1.0, initial: 0, caption: "Surface inclination, depth-wise [signed fraction]:" },
            { name: 'surfaceInclinationY', type: 'float', min: -1.0, max: 1.0, initial: 0, caption: "Surface inclination, length-wise [signed fraction]:" },
            { name: 'bottomAssemblyMargin', type: 'float', min: 0, max: 100000, initial: 1, caption: "Bottom assembly margin [mm]:" },
            { name: 'nominalSquareSide', type: 'float', min: 0, max: 100000, initial: 300, caption: "Nominal square side (constant) [mm]:" },
            { name: 'squareSideVarianceTolerance', type: 'float', min: 0, max: 100000, initial: 0.1, caption: "Square side variance tolerance (constant) [fraction]:" },
            { name: 'scale', type: 'float', min: 0.000001, max: 1000000, initial: 0.01, caption: "Scale [x:y], e.g. 0.01 = 1:100" },
            { name: 'assemble', type: 'choice', caption: 'Assemble', values: [0, 1, 2, 3, 4, 5, 6], captions: ["No", "Yes", "Test", "Lower planks", "Upper planks", "Supports and upper bottom", "Lower bottom"], initial: 1 },
        ],
//        "constants": {
//            'nominalSquareSide': 3, // 3dm = 300mm = 0.3m
//            'nominalSquareSide': 300, // 3dm = 300mm = 0.3m
//            'squareSideVarianceTolerance': 0.1,  // Fractional measure, e.g. 0.1 = 10%
//             'bottomAssemblyMargin': 0.01, // 0.01dm = 0.1cm = 1mm
//            'bottomAssemblyMargin': 1, // 0.01dm = 0.1cm = 1mm
//        },
        'units': {
            'plankThickness': 'mm',
            'plankWidth': 'mm',
            'bottomThickness': 'mm',
            'boxWidth': 'mm',
            'boxHeight': 'mm',
            'boxSquareDepth': '',
            'upperBoxSquareDepth': '',
            'verticalBoxSpacingSquares': '',
            'verticalSupportTenonLengthFraction': '',
            'bottomInclination': '',
            'surfaceInclinationX': '',
            'surfaceInclinationY': '',
 			'bottomAssemblyMargin': 'mm',
 			'nominalSquareSide': 'mm',
 			'squareSideVarianceTolerance': '',
            'scale': '',
            'assemble': '',
        },
    };
    if(nativeParams) { // These can only be set once the user parameters have been received.

        specs["computeds"] = {}; // Measurements which can be computed from those given by the user
        specs["computeds"]['innerBoxWidth'] = nativeParams['boxWidth'] - 2 * nativeParams['plankThickness'];
        specs["computeds"]['numberOfNominalSizeSquares'] = Math.round(specs["computeds"]['innerBoxWidth'] / (nativeParams['nominalSquareSide']));
	    console.log('Box size (in # of squares): ' + specs["computeds"]['numberOfNominalSizeSquares'] + 'x' + nativeParams['boxSquareDepth'] + '=' + specs["computeds"]['numberOfNominalSizeSquares'] * nativeParams['boxSquareDepth']);
        specs["computeds"]['minimumSquareSide'] = nativeParams['nominalSquareSide'] * (1 - nativeParams['squareSideVarianceTolerance'])
        specs["computeds"]['maximumSquareSide'] = nativeParams['nominalSquareSide'] * (1 + nativeParams['squareSideVarianceTolerance'])
        specs["computeds"]['actualSquareSide'] = specs["computeds"]['innerBoxWidth'] / specs["computeds"]['numberOfNominalSizeSquares'];

        if(specs["computeds"]['actualSquareSide'] > specs["computeds"]['maximumSquareSide'] || specs["computeds"]['actualSquareSide'] < specs["computeds"]['minimumSquareSide']) {
            console.log(
                'Warning: Square size not within tolerance! (Calculated number of squares: ' + numberOfNominalSizeSquares 
              + ', actual square size: ' + actualSquareSide 
              + ', minimum square size: ' + minimumSquareSide 
              + ', maximum square size: ' + maximumSquareSide + ')'
            );
        }
        
        console.log('numberOfNominalSizeSquares', specs["computeds"]['numberOfNominalSizeSquares']);
        console.log('actualSquareSide', specs["computeds"]['actualSquareSide']);

        specs["computeds"]['verticalBoxSpacingDistance'] = nativeParams['verticalBoxSpacingSquares'] * specs["computeds"]['actualSquareSide'];
        specs["computeds"]['verticalSupportTenonLength'] = nativeParams['plankWidth'] * nativeParams['verticalSupportTenonLengthFraction'];
        specs["computeds"]['verticalSupportLength'] = specs["computeds"]['verticalBoxSpacingDistance'] + (2 * specs["computeds"]['verticalSupportTenonLength']);
        specs["computeds"]['innerBoxDepth'] = specs["computeds"]['actualSquareSide'] * nativeParams['boxSquareDepth'];
        specs["computeds"]['boxHeight'] = specs["computeds"]['verticalBoxSpacingDistance'] + 4 * specs["computeds"]['verticalSupportTenonLength'];
        specs["computeds"]['boxDepth'] = specs["computeds"]['innerBoxDepth'] + (2 * nativeParams['plankThickness']);
        specs["computeds"]['upperBoxInnerDepth'] = specs["computeds"]['actualSquareSide'] * nativeParams['upperBoxSquareDepth'];
        specs["computeds"]['upperBoxDepth'] = specs["computeds"]['upperBoxInnerDepth'] + (2 * nativeParams['plankThickness']);
        specs["computeds"]['bottomRabbetWidth'] = (nativeParams['plankThickness'] / 2);
//         specs["computeds"]['slantedSupportCenterToMiddleSupport'] = specs["computeds"]['actualSquareSide'] - nativeParams['plankThickness']/2;
//         specs["computeds"]["slantedSupportEdgeToMiddleSupport"] = 
//                specs["computeds"]['slantedSupportCenterToMiddleSupport']
//             - (nativeParams['plankThickness'] / 2) 
//             / Math.sin( 
//                   Math.atan(
//                     specs["computeds"]['verticalBoxSpacingDistance']
//                   / specs["computeds"]['slantedSupportCenterToMiddleSupport']
//                   )
//               );
        specs["computeds"]['slantedSupportCenterToMiddleSupport'] = specs["computeds"]['actualSquareSide'];
        specs["computeds"]["slantedSupportEdgeToMiddleSupport"] = 
               specs["computeds"]['slantedSupportCenterToMiddleSupport']
            - (nativeParams['plankThickness'] / 2)             / Math.sin( 
                  Math.atan(
                    specs["computeds"]['verticalBoxSpacingDistance']
                  / specs["computeds"]['actualSquareSide']
                  )
              );
        specs["computeds"]['slantedSupportTiltAngle'] = (
            0.5*3.141592 - Math.atan(
                specs["computeds"]['verticalBoxSpacingDistance'] // b
              / specs["computeds"]["slantedSupportEdgeToMiddleSupport"] // e
            )
        )*180/3.141592; // OpenJSCad's rotate takes degrees (not radians).
        specs["computeds"]['slantedSupportHorizontalWidth'] = nativeParams['plankThickness'] / Math.sin(specs["computeds"]['slantedSupportTiltAngle'] * 3.141592/180); // Math.sin takes angle in radians
        specs["computeds"]["slantedSupportToMiddleSupportDiagonal"] = Math.sqrt(Math.pow(specs["computeds"]["slantedSupportEdgeToMiddleSupport"], 2) + Math.pow(specs["computeds"]['verticalBoxSpacingDistance'], 2));

        specs["profiles"] = {
            "side_plank": {
                "type": "extrusion",  
                "x": nativeParams['plankThickness'],
                "y": nativeParams['plankWidth'],
            },
            "vertical_support": {
                "type": "extrusion",  
                "x": nativeParams['plankThickness'],
                "y": nativeParams['plankThickness']                
            },
            "bottom": {
                "type": "panel",
                "z": nativeParams['bottomThickness'],
            }
        };

        specs["components"] = {

            // Lower box's planks lying along the X-axis direction or back-forward
            "longitudinal_plank_lower": {
                "type": "extrusion",
                "data": { "profile": "side_plank", "length": specs["computeds"]['boxDepth']/*, "material": "siberian_larch"*/},
                "connectors": {
                    "default_passive": {"point": [0, 0, specs["computeds"]['boxDepth']], "axis": [1, 0, 0], "normal": [0, -1, 0], /*'debug': [0,0,0] */},
                    "default_active": {"point": [0, 0, 0], "axis": [0, 0, -1], "normal": [0, -1, 0], /*'debug': [255,255,255]*/ },
//                    "to_higher_left_slanted_support": {"point": [0, 0, specs["computeds"]['boxDepth'] - (nativeParams['plankThickness']/2 + specs["computeds"]['actualSquareSide'])], "axis": [0, -1, 0], "normal": [1, 0, 0] /*, 'debug': [255,0,0] */}, 
                    "to_higher_left_slanted_support": {"point": [0, 0, specs["computeds"]['boxDepth'] - (nativeParams['plankThickness'] + specs["computeds"]['actualSquareSide'])], "axis": [0, -1, 0], "normal": [1, 0, 0] /*, 'debug': [255,0,0] */}, 
//                    "to_higher_right_slanted_support": {"point": [0, 0, nativeParams['plankThickness']/2 + specs["computeds"]['actualSquareSide']], "axis": [0, -1, 0], "normal": [1, 0, 0] /*, 'debug': [255,0,0] */}, 
                    "to_higher_right_slanted_support": {"point": [0, 0, nativeParams['plankThickness'] + specs["computeds"]['actualSquareSide']], "axis": [0, -1, 0], "normal": [1, 0, 0] /*, 'debug': [255,0,0] */}, 
                },
                "joints": [
                    {"type": 'miter', 'location': 'far', 'side': 'front', 'axis': 'y'},
                    {"type": 'miter', 'location': 'near', 'side': 'front', 'axis': 'y'},
                ],
            },

            // Upper box's planks lying along the X-axis direction or back-forward
            "longitudinal_plank_upper": {
                "type": "extrusion",
                "data": { "profile": "side_plank", "length": specs["computeds"]['upperBoxDepth']/*, "material": "siberian_larch"*/},
                "connectors": {
                    "default_passive": {"point": [0, 0, specs["computeds"]['upperBoxDepth']], "axis": [1, 0, 0], "normal": [0, -1, 0], /*'debug': [0,0,0] */},
                    "default_active": {"point": [0, 0, 0], "axis": [0, 0, -1], "normal": [0, -1, 0], /*'debug': [255,255,255]*/ },
                },
                "joints": [
                    {"type": 'miter', 'location': 'far', 'side': 'front', 'axis': 'y'},
                    {"type": 'miter', 'location': 'near', 'side': 'front', 'axis': 'y'},
                ],
            },

            // Both boxes' planks lying along the Y-axis direction or left-right
            "transversal_plank": {
                "type": "extrusion",
                "data": { "profile": "side_plank", "length": nativeParams['boxWidth']/*, "material": "siberian_larch"*/},
                "connectors": {
                    "default_passive": {"point": [0, 0, nativeParams['boxWidth']], "axis": [1, 0, 0], "normal": [0, -1, 0], /*'debug': [0,0,0]*/ },
                    "default_active": {"point": [0, 0, 0], "axis": [0, 0, -1], "normal": [0, -1, 0], /*'debug': [255,255,255] */},
                    "to_higher": {"point": [0, 0, 0], "axis": [0, -1, 0], "normal": [1, 0, 0]/*, 'debug': [0,0,0] */},
                    "to_lower": {"point": [0, nativeParams['plankWidth'], 0], "axis": [0, 1, 0], "normal": [1, 0, 0], /*'debug': [255,0,0] */},
                    "to_higher_right": {"point": [0, 0, nativeParams['boxWidth']], "axis": [0, -1, 0], "normal": [1, 0, 0]/*, 'debug': [0,0,0]*/ },
                    "to_lower_front_left": {"point": [0, nativeParams['plankWidth'], nativeParams['boxWidth']], "axis": [0, 1, 0], "normal": [1, 0, 0], /*'debug': [255,0,0]*/ },
                    "to_lower_front_right": {"point": [0, nativeParams['plankWidth'], 0], "axis": [0, 1, 0], "normal": [1, 0, 0] /*, 'debug': [255,0,0] */},                    
                    "to_higher_middle": {"point": [0, 0, nativeParams['boxWidth']/2], "axis": [0, -1, 0], "normal": [1, 0, 0] /*, 'debug': [255,0,0] */}, 
                    "to_higher_one_quarter": {"point": [0, 0, nativeParams['plankThickness'] + specs["computeds"]['actualSquareSide']], "axis": [0, -1, 0], "normal": [1, 0, 0] /*, 'debug': [255,0,0] */}, 
                    "to_higher_three_quarters": {"point": [0, 0, nativeParams['boxWidth'] - (nativeParams['plankThickness'] + specs["computeds"]['actualSquareSide'])], "axis": [0, -1, 0], "normal": [1, 0, 0] /*, 'debug': [255,0,0] */}, 
                },
                // "Active" or "explicit" joints (their counterparts, or "passive" or "implicit" ones are created based on these)
                "joints": [
                    {"type": 'miter', 'location': 'far', 'side': 'front', 'axis': 'y'},
                    {"type": 'miter', 'location': 'near', 'side': 'front', 'axis': 'y'},
                ]
            },

            "vertical_support": {
                "type": "extrusion",
                "data": { "profile": "vertical_support", "length": specs["computeds"]['verticalSupportLength'], "material": "siberian_larch"},
                "connectors": {
                    "default_passive": {"point": [0, 0, specs["computeds"]['verticalSupportLength'] - specs["computeds"]['verticalSupportTenonLength']], "axis": [0, 0, 1], "normal": [1, 0, 0], /*'debug': [0,0,255] */},
                    "default_active": {"point": [0, 0, specs["computeds"]['verticalSupportTenonLength']], "axis": [0, 0, -1], "normal": [1, 0, 0]/*, 'debug': [255,0,0]*/ },
                    "to_higher": {"point": [0, 0, specs["computeds"]['verticalSupportLength'] - specs["computeds"]['verticalSupportTenonLength']], "axis": [0, 0, 1], "normal": [1, 0, 0]/*, 'debug': [0,255,0] */},
                },
                // "Active" or "explicit" joints (their counterparts, or "passive" or "implicit" ones are created based on these)
                "joints": [
                 	{"type": 'tenon', 'face': 'far_end', 'cut': {'x1': 1/3, 'y1': 1/3, 'x2': 0, 'y2': 0}, 'overrides': {'depth': specs["computeds"]['verticalSupportTenonLength']}},
                 	{"type": 'tenon', 'face': 'near_end', 'cut': {'x1': 1/3, 'y1': 1/3, 'x2': 0, 'y2': 0}, 'overrides': {'depth': specs["computeds"]['verticalSupportTenonLength']}}
                ]
            },

            "vertical_support_middle_back": {
                "type": "extrusion",
                "data": { "profile": "vertical_support", "length": specs["computeds"]['verticalSupportLength'], "material": "siberian_larch"},
                "connectors": {
                     "default_active": {"point": [0, nativeParams['plankThickness']/2, specs["computeds"]['verticalSupportTenonLength']], "axis": [0, 0, -1], "normal": [1, 0, 0]/*, 'debug': [255,0,0]*/ },
                },
                // "Active" or "explicit" joints (their counterparts, or "passive" or "implicit" ones are created based on these)
                "joints": [
                 	{"type": 'tenon', 'face': 'far_end', 'cut': {'x1': 1/3, 'y1': 0, 'x2': 0, 'y2': 0}, 'overrides': {'depth': specs["computeds"]['verticalSupportTenonLength']}},
                 	{"type": 'tenon', 'face': 'near_end', 'cut': {'x1': 1/3, 'y1': 0, 'x2': 0, 'y2': 0}, 'overrides': {'depth': specs["computeds"]['verticalSupportTenonLength']}}
                ]
            },
            
            "slanted_support": {
                "type": "extrusion",
                "data": { 
                    "profile": "vertical_support", 
                    "length": specs["computeds"]["slantedSupportToMiddleSupportDiagonal"] + specs["computeds"]['verticalSupportTenonLength'] * 2,
                    "tilt": [-1 * specs["computeds"]['slantedSupportTiltAngle'], 0], // Negative direction is clockwise
                    "material": "siberian_larch",
                },
                "connectors": {
                    "default_active": {"point": [0, nativeParams['plankThickness']/2, specs["computeds"]['verticalSupportTenonLength']], "axis": [0, 0, -1], "normal": [1, 0, 0]/*, 'debug': [255,0,0]*/ },
                },
                "joints": [
                 	{"type": 'tenon', 'face': 'far_end', 'cut': {'x1': 1/3, 'y1': 0, 'x2': 0, 'y2': 0}, 'overrides': {'depth': specs["computeds"]['verticalSupportTenonLength'], 'slant': [specs['computeds']['slantedSupportTiltAngle'],0]}},
                 	{"type": 'tenon', 'face': 'near_end', 'cut': {'x1': 1/3, 'y1': 0, 'x2': 0, 'y2': 0}, 'overrides': {'depth': specs["computeds"]['verticalSupportTenonLength'], 'slant': [-1*specs['computeds']['slantedSupportTiltAngle'],0]}}
                 	//{"type": 'miter', 'face': 'near_end', 'cut': {'x1': 1/3, 'y1': 0, 'x2': 0, 'y2': 0}, 'overrides': {'depth': specs["computeds"]['verticalSupportTenonLength'], 'slant': [-1*specs['computeds']['slantedSupportTiltAngle'],0]}}
                ],
                "assembly": [
                    {'action': 'translate', 'args': [[0, -1 * nativeParams['plankThickness'], -1 * specs["computeds"]['verticalSupportTenonLength']]]},
                    {'action': 'rotate', 'args': [[-1*specs['computeds']['slantedSupportTiltAngle'], 0, 0]]},
                    {'action': 'truncate', 'args': [[undefined, undefined, undefined], [undefined, specs["computeds"]["slantedSupportEdgeToMiddleSupport"], undefined]]},
                ]
            },
            
            "bottom_lower": {
                "type": "panel",
                "data": {
                    "profile": 'bottom', 
                    "depth": specs["computeds"]["innerBoxDepth"] + specs["computeds"]["bottomRabbetWidth"] * 2 - nativeParams["bottomAssemblyMargin"], 
                    "width": specs["computeds"]["innerBoxWidth"] + specs["computeds"]["bottomRabbetWidth"] * 2 - nativeParams["bottomAssemblyMargin"],
                },
                "connectors": {
                    "default_active": {"point": [-specs["computeds"]['bottomRabbetWidth'], -specs["computeds"]['bottomRabbetWidth'], -1*specs["computeds"]['bottomRabbetWidth']], "axis": [0, 0, 1], "normal": [1, 0, 0]/*, 'debug': [255,0,0]*/ },
                },
                "joints": [],
            },

            "bottom_upper": {
                "type": "panel",
                "data": {
                    "profile": 'bottom', 
                    "depth": specs["computeds"]["upperBoxInnerDepth"] + specs["computeds"]["bottomRabbetWidth"] * 2 - nativeParams["bottomAssemblyMargin"], 
                    "width": specs["computeds"]["innerBoxWidth"] + specs["computeds"]["bottomRabbetWidth"] * 2 - nativeParams["bottomAssemblyMargin"],
                },
                "connectors": {
                    "default_active": {"point": [-specs["computeds"]['bottomRabbetWidth'], -specs["computeds"]['bottomRabbetWidth'], -1*specs["computeds"]['bottomRabbetWidth']], "axis": [0, 0, 1], "normal": [1, 0, 0]/*, 'debug': [255,0,0]*/ },
                },
                "joints": [],
            },
            
        };
        specs["parts"] = {
            "lower_back_bottom":  { "component": "transversal_plank"  },
            "lower_right_bottom": { "component": "longitudinal_plank_lower" },
            "lower_front_bottom": { "component": "transversal_plank"  },
            "lower_left_bottom":  { "component": "longitudinal_plank_lower" },

            "lower_back_top":     { "component": "transversal_plank"  },
            "lower_right_top":    { "component": "longitudinal_plank_lower" },
            "lower_front_top":    { "component": "transversal_plank"  },
            "lower_left_top":     { "component": "longitudinal_plank_lower" },

            "upper_back_bottom":  { "component": "transversal_plank"  },
            "upper_right_bottom": { "component": "longitudinal_plank_upper"  },
            "upper_front_bottom": { "component": "transversal_plank"  },
            "upper_left_bottom":  { "component": "longitudinal_plank_upper"  },
            
            "upper_back_top":     { "component": "transversal_plank"  },
            "upper_right_top":    { "component": "longitudinal_plank_upper"  },
            "upper_front_top":    { "component": "transversal_plank"  },
            "upper_left_top":     { "component": "longitudinal_plank_upper"  },
            
            "back_left_vertical_support":   { "component": "vertical_support" },
            "back_right_vertical_support":  { "component": "vertical_support" },
            "front_left_vertical_support":  { "component": "vertical_support" },
            "front_right_vertical_support": { "component": "vertical_support" },
            //"back_middle_vertical_support": { "component": "vertical_support_middle_back" },

            "back_one_quarter_slanted_support": { "component": "slanted_support" },
            "back_three_quarters_slanted_support": { "component": "slanted_support" },
            "back_left_slanted_support": { "component": "slanted_support" },
            "back_right_slanted_support": { "component": "slanted_support" },

            "bottom_lower":     { "component": "bottom_lower" },
            "bottom_upper":     { "component": "bottom_upper" },
        };
        specs["assembly"] = [
            {'part': 'lower_back_bottom', 'action': 'turn', 'args': ['x', -90]}, // Turn 90 degrees clockwise around x-axis (positive turn direction is counter-clockwise)
            {'part': 'lower_right_bottom', 'action': 'moveTo', 'args': ['default_active', 'lower_back_bottom', 'default_passive']},
            {'part': 'lower_front_bottom', 'action': 'moveTo', 'args': ['default_active', 'lower_right_bottom', 'default_passive']},
            {'part': 'lower_left_bottom', 'action': 'moveTo', 'args': ['default_active', 'lower_front_bottom', 'default_passive']},

            {'part': 'lower_back_top', 'action': 'moveTo', 'args': ['to_lower', 'lower_back_bottom', 'to_higher']},
            {'part': 'lower_right_top', 'action': 'moveTo', 'args': ['default_active', 'lower_back_top', 'default_passive']},
            {'part': 'lower_front_top', 'action': 'moveTo', 'args': ['default_active', 'lower_right_top', 'default_passive']},
            {'part': 'lower_left_top', 'action': 'moveTo', 'args': ['default_active', 'lower_front_top', 'default_passive']},

            {'part': 'back_left_vertical_support', 'action': 'moveTo', 'args': ['default_active', 'lower_back_top', 'to_higher']},
            {'part': 'back_right_vertical_support', 'action': 'mirroredY', 'args': []},
            {'part': 'back_right_vertical_support', 'action': 'moveTo', 'args': ['default_active', 'lower_back_top', 'to_higher_right']},

            {'part': 'upper_back_bottom', 'action': 'moveTo', 'args': ['to_lower', 'back_left_vertical_support', 'default_passive']},
            {'part': 'upper_right_bottom', 'action': 'moveTo', 'args': ['default_active', 'upper_back_bottom', 'default_passive']},
            {'part': 'upper_front_bottom', 'action': 'moveTo', 'args': ['default_active', 'upper_right_bottom', 'default_passive']},
            {'part': 'upper_left_bottom', 'action': 'moveTo', 'args': ['default_active', 'upper_front_bottom', 'default_passive']},

            {'part': 'upper_back_top', 'action': 'moveTo', 'args': ['to_lower', 'upper_back_bottom', 'to_higher']},
            {'part': 'upper_right_top', 'action': 'moveTo', 'args': ['default_active', 'upper_back_top', 'default_passive']},
            {'part': 'upper_front_top', 'action': 'moveTo', 'args': ['default_active', 'upper_right_top', 'default_passive']},
            {'part': 'upper_left_top', 'action': 'moveTo', 'args': ['default_active', 'upper_front_top', 'default_passive']},

            {'part': 'front_left_vertical_support', 'action': 'mirroredX', 'args': []},
            {'part': 'front_left_vertical_support', 'action': 'moveTo', 'args': ['to_higher', 'upper_front_bottom', 'to_lower_front_left']},
            {'part': 'front_right_vertical_support', 'action': 'mirroredX', 'args': []},
            {'part': 'front_right_vertical_support', 'action': 'mirroredY', 'args': []},
            {'part': 'front_right_vertical_support', 'action': 'moveTo', 'args': ['to_higher', 'upper_front_bottom', 'to_lower_front_right']},
            
            //{'part': 'back_middle_vertical_support', 'action': 'moveTo', 'args': ['default_active', 'lower_back_top', 'to_higher_middle']},

            {'part': 'bottom_lower', 'action': 'moveTo', 'args': ['default_active', 'lower_back_bottom', 'to_lower']},
            {'part': 'bottom_upper', 'action': 'moveTo', 'args': ['default_active', 'upper_back_bottom', 'to_lower']},
            
            {'part': 'back_one_quarter_slanted_support', 'action': 'moveTo', 'args': ['default_active', 'lower_back_top', 'to_higher_one_quarter']},

            {'part': 'back_three_quarters_slanted_support', 'action': 'mirroredX', 'args': []},
            {'part': 'back_three_quarters_slanted_support', 'action': 'moveTo', 'args': ['default_active', 'lower_back_top', 'to_higher_three_quarters']},

//             {'part': 'back_left_slanted_support', 'action': 'moveTo', 'args': ['default_active', 'lower_left_top', 'to_higher_left_slanted_support']},
//             {'part': 'back_right_slanted_support', 'action': 'mirroredX', 'args': []},
//             {'part': 'back_right_slanted_support', 'action': 'moveTo', 'args': ['default_active', 'lower_right_top', 'to_higher_right_slanted_support']},
            {'part': 'back_left_slanted_support', 'action': 'mirroredX', 'args': []},
            {'part': 'back_left_slanted_support', 'action': 'moveTo', 'args': ['default_active', 'lower_left_top', 'to_higher_left_slanted_support']},
            {'part': 'back_right_slanted_support', 'action': 'moveTo', 'args': ['default_active', 'lower_right_top', 'to_higher_right_slanted_support']},
            
        ];
        specs["cutting_passive_joints"] = {
            // Key is "cutter" piece and array values are "cuttee"-pieces
            'back_left_vertical_support': [
                "lower_back_bottom",
                "lower_left_bottom",
                "lower_back_top",
                "lower_left_top",
                "upper_back_bottom",
                "upper_left_bottom",
                "upper_back_top",
                "upper_left_top",
                "bottom_lower",
                "bottom_upper",
            ],
            'back_right_vertical_support': [
                "lower_back_bottom",
                "lower_right_bottom",
                "lower_back_top",
                "lower_right_top",
                "upper_back_bottom",
                "upper_right_bottom",
                "upper_back_top",
                "upper_right_top",
                "bottom_lower",
                "bottom_upper",
            ],
            
            'front_left_vertical_support': [
                "lower_front_bottom",
                "lower_left_bottom",
                "lower_front_top",
                "lower_left_top",
                "upper_front_bottom",
                "upper_left_bottom",
                "upper_front_top",
                "upper_left_top",
                "bottom_lower",
                "bottom_upper",
                "back_left_slanted_support",
            ],
            'front_right_vertical_support': [
                "lower_right_bottom",
                "lower_front_bottom",
                "lower_right_top",
                "lower_front_top",
                "upper_right_bottom",
                "upper_front_bottom",
                "upper_right_top",
                "upper_front_top",
                "bottom_lower",
                "bottom_upper",
                "back_right_slanted_support",
            ],
            'back_one_quarter_slanted_support': [
                "lower_back_bottom",
                "lower_back_top",
                "upper_back_bottom",
                "upper_back_top",
                "bottom_lower",
                "bottom_upper",
                "back_three_quarters_slanted_support",
            ],
            'back_three_quarters_slanted_support': [
                "lower_back_bottom",
                "lower_back_top",
                "upper_back_bottom",
                "upper_back_top",
                "bottom_lower",
                "bottom_upper",
            ],
            'back_left_slanted_support': [
                "lower_left_bottom",
                "lower_left_top",
                "upper_left_bottom",
                "upper_left_top",
                "bottom_lower",
                "bottom_upper",
            ],
            'back_right_slanted_support': [
                "lower_right_bottom",
                "lower_right_top",
                "upper_right_bottom",
                "upper_right_top",
                "bottom_lower",
                "bottom_upper",
            ],
            'bottom_lower': [
                "lower_back_bottom",
                "lower_left_bottom",
                "lower_right_bottom",
                "lower_right_top",
            ],
            'bottom_upper': [
                "upper_back_bottom",
                "upper_left_bottom",
                "upper_right_bottom",
                "upper_right_top",
            ],
        };
    }
    return specs;
}

include("util.js");
include("Timber.js");

// This is used by OpenJSCAD to draw the user input form
function getParameterDefinitions() {
    return getSpecification()['user'];
}

function getParameterUnits() {
    return getSpecification()['units'];
}

// Convert params into native units (1 = 1dm => 1dm = 100mm)
function convertParamsToNative(params, paramUnits) {

    // Convert this to functional form (more concise)
    var convertedParams = {};
    for(var key in params) {
        if(paramUnits[key] == 'mm') {
            convertedParams[key] = params[key] / 100 * params['scale']/0.01;
        } else {
            convertedParams[key] = params[key];
        }
    }
    return convertedParams;
}

function performAssemblyStep(parts, step, part_handle) {

    if( ! part_handle ) {
        var part_handle = step['part'];
    }
    var action = step['action'];
    var args = step['args'];

    switch(action) {
        case 'turn':
            parts[part_handle].turn(args[0], args[1]);
            break;
        case 'moveTo':
            parts[part_handle].moveTo(args[0], parts[args[1]], args[2]);
            break;
        case 'translate':
            parts[part_handle].translate(args[0], args[1], args[2]);
            break;
        case 'truncate':
            parts[part_handle].truncate(args[0], args[1]);
            break;
        case 'rotate':
            //Protect default_active-connector from being rotated
            var default_active_connector = parts[part_handle].cadObject.properties.default_active;
            parts[part_handle].rotate(args[0], args[1], args[2]);
            parts[part_handle].cadObject.properties.default_active = default_active_connector;
            break;
        default:
            parts[part_handle][action].apply(this, Array.prototype.slice.call(arguments, 1))
            break;
    }
    
    return parts;
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

	// But only display it if not viewing individual parts
	if(params['assemble'] == '1') {
		o.push(axes);
	}

    var nativeParams = convertParamsToNative(params, getParameterUnits());
    
    var specs = getSpecification(nativeParams);

    var parts = {};

    // ASSEMBLY PHASE 1: CREATE PARTS, ADD CONNECTORS and CUT ACTIVE JOINTS
    for(part_handle in specs['parts']) {
    
        var part = specs['parts'][part_handle];
        var component = specs['components'][part['component']];
        var profile = specs['profiles'][component['data']['profile']]
        if(component['type'] == 'extrusion' || component['type'] == "panel") {

            if(component['type'] == "panel") {
                //console.log(component['data']['depth'], component['data']['width'], profile['z']);
                parts[part_handle] = new Timber(component['data']['depth'], component['data']['width'], profile['z']);
            } else if(component['type'] == 'extrusion') {
                parts[part_handle] = new Timber(profile['x'], profile['y'], component['data']['length']);
            }
            // Create any connectors
            for(var handle in component['connectors']) {
	            var debug = component['connectors'][handle]['debug'] ? component['connectors'][handle]['debug'] : undefined;
                parts[part_handle].createConnector(handle, component['connectors'][handle], debug);
            }
            // Cut any active joints
            for(var index in component['joints']) {
                var joint = component['joints'][index];
                if(joint['type'] == 'miter') {
                    // E.g. {"type": 'miter', 'location': 'far', 'side': 'front', 'axis': 'y'},
                    parts[part_handle].cutMiter(joint['location'], joint['side'], joint['axis']);
                } else if(joint['type'] == 'tenon') {
                    // E.g. {"type": 'miter', 'location': 'far', 'side': 'front', 'axis': 'y'},
                    parts[part_handle].cutTenonJoint(joint['face'], joint['cut'], joint['overrides']);
                } else {
                    console.log('WARNING: Spec-based cutting of part joints only supports miter-types.');
                }
            }
            
            // Perform any pre-assembly steps for the part
            if('assembly' in component) {
                for(var index in component['assembly']) {
                    performAssemblyStep(parts, component['assembly'][index], part_handle);
                }
            }

        } else {
            console.log('WARNING: Spec-based creation of parts only supports material of type rectangular (profile) extrusion (component).');
        }
    }

    // ASSEMBLY PHASE 2: PERFORM ASSEMBLY SCRIPT, STEP-BY-STEP
    for (var index in specs['assembly']) {
        performAssemblyStep(parts, specs['assembly'][index]);
    }

    // ASSEMBLY PHASE 3: CUT PASSIVE JOINTS
    for (var cutter_handle in specs['cutting_passive_joints']) {
        for (var index in specs['cutting_passive_joints'][cutter_handle]) {
            var cuttee_handle = specs['cutting_passive_joints'][cutter_handle][index];
            //console.log('Cutting ' + cutter_handle + ' from ' + cuttee_handle);
            parts[cuttee_handle].cadObject = parts[cuttee_handle].cadObject.subtract(parts[cutter_handle].cadObject);
        }
    }

	// ASSEMBLY PHASE 4: DISPLAY ASSEMBLY or FINALIZED PARTS FOR CAM
    if(params['assemble'] == '1') {

        // Push parts created based on spec to be output by OpenJSCAD.
        for(part_handle in parts) {
            //console.log('outputting');
            o.push(parts[part_handle].cadObject);
            //console.log(part_handle, parts[part_handle].length * 100);
        }
    
    } else {

        // Prepare export of lower planks
        if(params['assemble'] == '3') {
            
//             parts['lower_back_top'].resetPosition();
//             parts['lower_back_top'].turn('z', -90);
//             parts['lower_back_top'].turn('x', -90);
//             parts['lower_back_top'].translate([parts['lower_back_top'].width*0, 0, 0]);
//             //o.push(parts['lower_back_top'].cadObject);
// 
//             parts['lower_back_bottom'].resetPosition();
//             parts['lower_back_bottom'].turn('z', -90);
//             parts['lower_back_bottom'].turn('x', -90);
//             parts['lower_back_bottom'].translate([parts['lower_back_top'].width*1, 0, 0]);
//             //o.push(parts['lower_back_bottom'].cadObject);
//             o.push(parts['lower_back_top'].cadObject.union(parts['lower_back_bottom'].cadObject));

            parts['lower_front_top'].resetPosition();
            parts['lower_front_top'].turn('z', -90);
            parts['lower_front_top'].turn('x', -90);
            parts['lower_front_top'].translate([parts['lower_back_top'].width*3, 0, 0]);
            //o.push(parts['lower_front_top'].cadObject);

            parts['lower_front_bottom'].resetPosition();
            parts['lower_front_bottom'].turn('z', -90);
            parts['lower_front_bottom'].turn('x', -90);
            parts['lower_front_bottom'].translate([parts['lower_back_top'].width*4, 0, 0]);
            //o.push(parts['lower_front_bottom'].cadObject);
            o.push(parts['lower_front_top'].cadObject.union(parts['lower_front_bottom'].cadObject));

            parts['lower_left_top'].resetPosition();
            parts['lower_left_top'].turn('z', -90);
            parts['lower_left_top'].turn('x', -90);
            parts['lower_left_top'].translate([parts['lower_back_top'].width*6, 0, 0]);
            //o.push(parts['lower_left_top'].cadObject);
            parts['lower_left_bottom'].resetPosition();
            parts['lower_left_bottom'].turn('z', -90);
            parts['lower_left_bottom'].turn('x', -90);
            parts['lower_left_bottom'].translate([parts['lower_back_top'].width*7, 0, 0]);
            //o.push(parts['lower_left_bottom'].cadObject);
            o.push(parts['lower_left_top'].cadObject.union(parts['lower_left_bottom'].cadObject));

            parts['lower_right_top'].resetPosition();
            parts['lower_right_top'].turn('z', -90);
            parts['lower_right_top'].turn('x', -90);
            parts['lower_right_top'].translate([parts['lower_back_top'].width*9, 0, 0]);
            //o.push(parts['lower_right_top'].cadObject);
            parts['lower_right_bottom'].resetPosition();
            parts['lower_right_bottom'].turn('z', -90);
            parts['lower_right_bottom'].turn('x', -90);
            parts['lower_right_bottom'].translate([parts['lower_back_top'].width*10, 0, 0]);
            //o.push(parts['lower_right_bottom'].cadObject);
            o.push(parts['lower_right_top'].cadObject.union(parts['lower_right_bottom'].cadObject));
        }

        // Prepare export of lower planks
        if(params['assemble'] == '4') {

            parts['upper_back_top'].resetPosition();
            parts['upper_back_top'].turn('z', -90);
            parts['upper_back_top'].turn('x', -90);
            parts['upper_back_top'].translate([parts['lower_back_top'].width*0, 0, 0]);
            //o.push(parts['upper_back_top'].cadObject);
            parts['upper_back_bottom'].resetPosition();
            parts['upper_back_bottom'].turn('z', -90);
            parts['upper_back_bottom'].turn('x', -90);
            parts['upper_back_bottom'].translate([parts['lower_back_top'].width*1, 0, 0]);
            //o.push(parts['upper_back_bottom'].cadObject);
            o.push(parts['upper_back_top'].cadObject.union(parts['upper_back_bottom'].cadObject));

            parts['upper_front_top'].resetPosition();
            parts['upper_front_top'].turn('z', -90);
            parts['upper_front_top'].turn('x', -90);
            parts['upper_front_top'].translate([parts['lower_back_top'].width*3, 0, 0]);
            //o.push(parts['upper_front_top'].cadObject);
            parts['upper_front_bottom'].resetPosition();
            parts['upper_front_bottom'].turn('z', -90);
            parts['upper_front_bottom'].turn('x', -90);
            parts['upper_front_bottom'].translate([parts['lower_back_top'].width*4, 0, 0]);
            //o.push(parts['upper_front_bottom'].cadObject);
            o.push(parts['upper_front_top'].cadObject.union(parts['upper_front_bottom'].cadObject));

            parts['upper_right_top'].resetPosition();
            parts['upper_right_top'].turn('z', -90);
            parts['upper_right_top'].turn('x', -90);
            parts['upper_right_top'].translate([parts['lower_back_top'].width*6, 0, 0]);
            //o.push(parts['upper_right_top'].cadObject);
            parts['upper_right_bottom'].resetPosition();
            parts['upper_right_bottom'].turn('z', -90);
            parts['upper_right_bottom'].turn('x', -90);
            parts['upper_right_bottom'].translate([parts['lower_back_top'].width*7, 0, 0]);
            //o.push(parts['upper_right_bottom'].cadObject);
            o.push(parts['upper_right_top'].cadObject.union(parts['upper_right_bottom'].cadObject));

            parts['upper_left_top'].resetPosition();
            parts['upper_left_top'].turn('z', -90);
            parts['upper_left_top'].turn('x', -90);
            parts['upper_left_top'].translate([parts['lower_back_top'].width*9, 0, 0]);
            //o.push(parts['upper_left_top'].cadObject);
            parts['upper_left_bottom'].resetPosition();
            parts['upper_left_bottom'].turn('z', -90);
            parts['upper_left_bottom'].turn('x', -90);
            parts['upper_left_bottom'].translate([parts['lower_back_top'].width*10, 0, 0]);
            //o.push(parts['upper_left_bottom'].cadObject);
            o.push(parts['upper_left_top'].cadObject.union(parts['upper_left_bottom'].cadObject));
            
        }
        
        // Prepare export of Supports and upper bottom
        if(params['assemble'] == '5') {
            
            parts['back_left_vertical_support'].resetPosition();
            parts['back_left_vertical_support'].turn('x', -90);
            parts['back_left_vertical_support'].translate([parts['back_left_vertical_support'].width*0, 0, 0]);
            o.push(parts['back_left_vertical_support'].cadObject);
            
            parts['front_left_vertical_support'].resetPosition();
            parts['front_left_vertical_support'].rotate([0,0,-180]); // outputs some problem
            parts['front_left_vertical_support'].turn('x', -90);
            parts['front_left_vertical_support'].translate([parts['back_left_vertical_support'].width*3, 0, 0]);
            o.push(parts['front_left_vertical_support'].cadObject);
            
            parts['front_right_vertical_support'].resetPosition();
            parts['front_right_vertical_support'].turn('x', -90);
            parts['front_right_vertical_support'].translate([parts['back_left_vertical_support'].width*4, 0, 0]);
            o.push(parts['front_right_vertical_support'].cadObject);
            
            parts['back_right_vertical_support'].resetPosition();
            parts['back_right_vertical_support'].rotate([0,0,-180]); // outputs some problem
            parts['back_right_vertical_support'].turn('x', -90);
            parts['back_right_vertical_support'].translate([parts['back_left_vertical_support'].width*7, 0, 0]);
            o.push(parts['back_right_vertical_support'].cadObject);
            //"back_middle_vertical_support": { "component": "vertical_support_middle_back" },

            parts['back_right_slanted_support'].resetPosition();
            parts['back_right_slanted_support'].turn('z', 90);
            parts['back_right_slanted_support'].turn('x', -90);
            parts['back_right_slanted_support'].translate([parts['back_left_vertical_support'].width*8, 0, 0]);
            o.push(parts['back_right_slanted_support'].cadObject);

            parts['back_left_slanted_support'].resetPosition();
            parts['back_left_slanted_support'].turn('z', 90);
            parts['back_left_slanted_support'].turn('x', -90);
            parts['back_left_slanted_support'].translate([parts['back_left_vertical_support'].width*10, parts['back_left_vertical_support'].width, 0]);
            o.push(parts['back_left_slanted_support'].cadObject);

            parts['back_one_quarter_slanted_support'].resetPosition();
            parts['back_one_quarter_slanted_support'].turn('z', 90);
            parts['back_one_quarter_slanted_support'].turn('x', -90);
            parts['back_one_quarter_slanted_support'].translate([parts['back_left_vertical_support'].width*12, 0, 0]);
            o.push(parts['back_one_quarter_slanted_support'].cadObject);

            parts['back_three_quarters_slanted_support'].resetPosition();
            parts['back_three_quarters_slanted_support'].turn('z', 90);
            parts['back_three_quarters_slanted_support'].turn('x', -90);
            parts['back_three_quarters_slanted_support'].translate([parts['back_left_vertical_support'].width*14, parts['back_left_vertical_support'].width, 0]);
            o.push(parts['back_three_quarters_slanted_support'].cadObject);
            
            parts['bottom_upper'].resetPosition();
            parts['bottom_upper'].translate([parts['back_left_vertical_support'].width*16, 0, 0]);
            o.push(parts['bottom_upper'].cadObject);            
            
        }

        // Prepare export of Lower bottom
        if(params['assemble'] == '6') {

            parts['bottom_lower'].resetPosition();
            //parts['bottom_lower'].translate([0, 0, 0]);
            o.push(parts['bottom_lower'].cadObject);            
        }
        
        if(params['assemble'] == '0' || params['assemble'] == '1' || params['assemble'] == '2') {

            // Prepare text export of lower plank
            parts['lower_back_top'].resetPosition();
            parts['lower_back_top'].turn('z', -90);
            parts['lower_back_top'].turn('x', -90);
            parts['lower_back_top'].translate([parts['lower_back_top'].width*0, 0, 0]);
    //         o.push(parts['lower_back_top'].cadObject);

            parts['lower_back_bottom'].resetPosition();
            parts['lower_back_bottom'].turn('z', -90);
            parts['lower_back_bottom'].turn('x', -90);
            parts['lower_back_bottom'].translate([parts['lower_back_top'].width*1, 0, 0]);
    //         o.push(parts['lower_back_bottom'].cadObject);

            o.push(parts['lower_back_top'].cadObject.union(parts['lower_back_bottom'].cadObject));

        }
        if (params['assemble'] == '0') {

            parts['upper_back_top'].resetPosition();
            parts['upper_back_top'].turn('z', -90);
            parts['upper_back_top'].turn('x', -90);
            parts['upper_back_top'].translate([parts['lower_back_top'].width*3, 0, 0]);
            o.push(parts['upper_back_top'].cadObject);
        
            parts['upper_back_bottom'].resetPosition();
            parts['upper_back_bottom'].turn('z', -90);
            parts['upper_back_bottom'].turn('x', -90);
            parts['upper_back_bottom'].translate([parts['lower_back_top'].width*4, 0, 0]);
            o.push(parts['upper_back_bottom'].cadObject);

            parts['lower_front_top'].resetPosition();
            parts['lower_front_top'].turn('z', -90);
            parts['lower_front_top'].turn('x', -90);
            parts['lower_front_top'].translate([parts['lower_back_top'].width*6, 0, 0]);
            o.push(parts['lower_front_top'].cadObject);

            parts['lower_front_bottom'].resetPosition();
            parts['lower_front_bottom'].turn('z', -90);
            parts['lower_front_bottom'].turn('x', -90);
            parts['lower_front_bottom'].translate([parts['lower_back_top'].width*7, 0, 0]);
            o.push(parts['lower_front_bottom'].cadObject);

            parts['upper_front_top'].resetPosition();
            parts['upper_front_top'].turn('z', -90);
            parts['upper_front_top'].turn('x', -90);
            parts['upper_front_top'].translate([parts['lower_back_top'].width*9, 0, 0]);
            o.push(parts['upper_front_top'].cadObject);
        
            parts['upper_front_bottom'].resetPosition();
            parts['upper_front_bottom'].turn('z', -90);
            parts['upper_front_bottom'].turn('x', -90);
            parts['upper_front_bottom'].translate([parts['lower_back_top'].width*10, 0, 0]);
            o.push(parts['upper_front_bottom'].cadObject);

            parts['lower_left_top'].resetPosition();
            parts['lower_left_top'].turn('z', -90);
            parts['lower_left_top'].turn('x', -90);
            parts['lower_left_top'].translate([parts['lower_back_top'].width*12, 0, 0]);
            o.push(parts['lower_left_top'].cadObject);
            parts['lower_left_bottom'].resetPosition();
            parts['lower_left_bottom'].turn('z', -90);
            parts['lower_left_bottom'].turn('x', -90);
            parts['lower_left_bottom'].translate([parts['lower_back_top'].width*13, 0, 0]);
            o.push(parts['lower_left_bottom'].cadObject);

            parts['lower_right_top'].resetPosition();
            parts['lower_right_top'].turn('z', -90);
            parts['lower_right_top'].turn('x', -90);
            parts['lower_right_top'].translate([parts['lower_back_top'].width*15, 0, 0]);
            o.push(parts['lower_right_top'].cadObject);
            parts['lower_right_bottom'].resetPosition();
            parts['lower_right_bottom'].turn('z', -90);
            parts['lower_right_bottom'].turn('x', -90);
            parts['lower_right_bottom'].translate([parts['lower_back_top'].width*16, 0, 0]);
            o.push(parts['lower_right_bottom'].cadObject);

            parts['upper_right_top'].resetPosition();
            parts['upper_right_top'].turn('z', -90);
            parts['upper_right_top'].turn('x', -90);
            parts['upper_right_top'].translate([parts['lower_back_top'].width*18, 0, 0]);
            o.push(parts['upper_right_top'].cadObject);
            parts['upper_right_bottom'].resetPosition();
            parts['upper_right_bottom'].turn('z', -90);
            parts['upper_right_bottom'].turn('x', -90);
            parts['upper_right_bottom'].translate([parts['lower_back_top'].width*19, 0, 0]);
            o.push(parts['upper_right_bottom'].cadObject);

            parts['upper_left_top'].resetPosition();
            parts['upper_left_top'].turn('z', -90);
            parts['upper_left_top'].turn('x', -90);
            parts['upper_left_top'].translate([parts['lower_back_top'].width*21, 0, 0]);
            o.push(parts['upper_left_top'].cadObject);
            parts['upper_left_bottom'].resetPosition();
            parts['upper_left_bottom'].turn('z', -90);
            parts['upper_left_bottom'].turn('x', -90);
            parts['upper_left_bottom'].translate([parts['lower_back_top'].width*22, 0, 0]);
            o.push(parts['upper_left_bottom'].cadObject);

            parts['back_left_vertical_support'].resetPosition();
            parts['back_left_vertical_support'].turn('x', -90);
            parts['back_left_vertical_support'].translate([parts['lower_back_top'].width*24 + parts['back_left_vertical_support'].width*0, 0, 0]);
            o.push(parts['back_left_vertical_support'].cadObject);
            parts['front_left_vertical_support'].resetPosition();
            parts['front_left_vertical_support'].rotate([0,0,-180]); // outputs some problem
            parts['front_left_vertical_support'].turn('x', -90);
            parts['front_left_vertical_support'].translate([parts['lower_back_top'].width*24 + parts['back_left_vertical_support'].width*2, 0, 0]);
            o.push(parts['front_left_vertical_support'].cadObject);
            parts['front_right_vertical_support'].resetPosition();
            parts['front_right_vertical_support'].turn('x', -90);
            parts['front_right_vertical_support'].translate([parts['lower_back_top'].width*24 + parts['back_left_vertical_support'].width*2, 0, 0]);
            o.push(parts['front_right_vertical_support'].cadObject);
            parts['back_right_vertical_support'].resetPosition();
            parts['back_right_vertical_support'].rotate([0,0,-180]); // outputs some problem
            parts['back_right_vertical_support'].turn('x', -90);
            parts['back_right_vertical_support'].translate([parts['lower_back_top'].width*24 + parts['back_left_vertical_support'].width*4, 0, 0]);
            o.push(parts['back_right_vertical_support'].cadObject);
            //"back_middle_vertical_support": { "component": "vertical_support_middle_back" },

            parts['back_right_slanted_support'].resetPosition();
            parts['back_right_slanted_support'].turn('z', 90);
            parts['back_right_slanted_support'].turn('x', -90);
            parts['back_right_slanted_support'].translate([parts['lower_back_top'].width*24 + parts['back_left_vertical_support'].width*6, 0, 0]);
            o.push(parts['back_right_slanted_support'].cadObject);
            parts['back_left_slanted_support'].resetPosition();
            parts['back_left_slanted_support'].turn('z', 90);
            parts['back_left_slanted_support'].turn('x', -90);
            parts['back_left_slanted_support'].translate([parts['lower_back_top'].width*24 + parts['back_left_vertical_support'].width*7, parts['back_left_vertical_support'].width*1, 0]);
            o.push(parts['back_left_slanted_support'].cadObject);
            parts['back_one_quarter_slanted_support'].resetPosition();
            parts['back_one_quarter_slanted_support'].turn('z', 90);
            parts['back_one_quarter_slanted_support'].turn('x', -90);
            parts['back_one_quarter_slanted_support'].translate([parts['lower_back_top'].width*24 + parts['back_left_vertical_support'].width*8, 0, 0]);
            o.push(parts['back_one_quarter_slanted_support'].cadObject);
            parts['back_three_quarters_slanted_support'].resetPosition();
            parts['back_three_quarters_slanted_support'].turn('z', 90);
            parts['back_three_quarters_slanted_support'].turn('x', -90);
            parts['back_three_quarters_slanted_support'].translate([parts['lower_back_top'].width*24 + parts['back_left_vertical_support'].width*9, parts['back_left_vertical_support'].width, 0]);
            o.push(parts['back_three_quarters_slanted_support'].cadObject);

            parts['bottom_lower'].resetPosition();
            parts['bottom_lower'].translate([parts['lower_back_top'].width*25 + parts['back_left_vertical_support'].width*9, 0, 0]);
            o.push(parts['bottom_lower'].cadObject);

            parts['bottom_upper'].resetPosition();
            parts['bottom_upper'].translate([parts['lower_back_top'].width*26 + parts['back_left_vertical_support'].width*9 + parts['bottom_lower'].width, 0, 0]);
            o.push(parts['bottom_upper'].cadObject);
        
        }
    }

   	return o;
}
