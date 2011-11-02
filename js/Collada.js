/*

NOTE: this is work in progress and is not yet functional.

*/


function getChildNodeByAttrib(node, attr, val) {
    var child = node.firstChild;
    while (child) {
        if (child.nodeType == child.ELEMENT_NODE) {
            if (child.attributes[attr] && child.attributes[attr].nodeValue == val) {
                return child;
            }
        }
        child = child.nextSibling;
    }
    return null;
}

function getChildNodesByNodeName(node, name) {
    var children = [];
    var child = node.firstChild;
    while (child) {
        if (child.nodeType == child.ELEMENT_NODE) {
            if (child.nodeName == name) {
                children.push(child);
            }
        }
        child = child.nextSibling;
    }
    return children;
}

function getTransformation(node, sid) {
    var child = getChildNodeByAttrib(node, 'sid', sid);
    if (child) {
        return child.firstChild.nodeValue.trim().split(' ');
    }
    return undefined;
}

function ColladaNode() {

    this.parse = function(xmlDoc, node) {
        this.type = 'node';
        this.name = node.attributes['name'].nodeValue;
        this.translate = getTransformation(node, 'translate');
        var rotateZ = getTransformation(node, 'rotateZ');
        var rotateY = getTransformation(node, 'rotateY');
        var rotateX = getTransformation(node, 'rotateX');
        this.scale = getTransformation(node, 'scale');
        this.rotatePivot = getTransformation(node, 'rotatePivot');
        this.scalePivot = getTransformation(node, 'scalePivot');
        this.rotate = [0, 0, 0];
        if (rotateX)
            this.rotate[0] = rotateX[3];
        if (rotateY)
            this.rotate[1] = rotateY[3];
        if (rotateZ)
            this.rotate[2] = rotateZ[3];

        this.children = [];
        for (var x = 0; x < node.childNodes.length; ++x) {
            var child = node.childNodes[x];
            if (child.nodeType == child.ELEMENT_NODE) {
                var newNode = createColladaNode(child);
                if (newNode) {
                    newNode.parse(xmlDoc, child);
                    this.children.push(newNode);
                }
            }
        }
    }

    this.print = function() {
        var str = '{ "type" : "' + this.type + '", "name" : "' + this.name + '", "translate" : [' + this.translate + '], "rotate" : [' + this.rotate + '], "scale" : [' + this.scale + '], "children" : [';
        for (var i = 0; i < this.children.length; ++i) {
            if (i != 0) {
                str += ', ';
            }
            str += this.children[i].print();
        }
        return str + '] }';
    }
}

function trim(str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

function makeArray(str, stride) {
    str = trim(str);
    var arr = str.split(' ');
    var res = [];
    for (var x = 0; x < arr.length; x = x + stride)
        res.push(arr.slice(x, x + stride));
    return res;
}

function validateFragmentURI(uri) {
    if (uri.length == 0 || uri[0] != '#') {
        alert(uri + ' is not a fragment URI.');
    }
    return uri.slice(1);
}

function getSource(node) {
    var source = { 'id' : node.attributes['id'].nodeValue };
    var techniqueCommonArray = getChildNodesByNodeName(node, 'technique_common');
    if (techniqueCommonArray.length == 0)
        alert('No technique_common... dunno what to do!');
    var techniqueCommon = techniqueCommonArray[0];
    var accessorsArray = getChildNodesByNodeName(techniqueCommon, 'accessor');
    for (var a = 0; a < accessorsArray.length; ++a) {
        var sourceURI = validateFragmentURI(accessorsArray[a].attributes['source'].nodeValue);
        var sourceCount = accessorsArray[a].attributes['count'].nodeValue;
        var sourceStride = accessorsArray[a].attributes['stride'].nodeValue;
        var dataArray = getChildNodeByAttrib(node, 'id', sourceURI);
        var dataCount = dataArray.attributes['count'].nodeValue;
        if (dataCount != sourceCount * sourceStride)
            alert('Ooops params may be repeating!');
        source.data = makeArray(dataArray.firstChild.nodeValue, sourceStride);
        break; // TODO: what do we do if there are more accessors?
    }
    return source;
}

function ColladaMesh() {
    this.parse = function(xmlDoc, node) {
        var instanceGeometryURI = validateFragmentURI(node.attributes['url'].nodeValue);
        this.file = '';
        var collada = xmlDoc.documentElement;
        var libraryGeometriesArray = collada.getElementsByTagName('library_geometries');
        if (libraryGeometriesArray.length == 0)
            return;
        var libraryGeometries = libraryGeometriesArray[0];
        for (var x = 0; x < libraryGeometries.childNodes.length; ++x) {
            var node = libraryGeometries.childNodes[x];
            if (node.nodeType == node.ELEMENT_NODE && node.nodeName == 'geometry' && node.attributes['id'].nodeValue == instanceGeometryURI) {
                var meshArray = getChildNodesByNodeName(node, 'mesh');
                if (meshArray.length == 0)
                    alert('Geometry containing spline or convex_mesh is unsupported.')
                var mesh = meshArray[0];

                var sources = [];
                var triangles = [];
                var child = mesh.firstChild;
                while (child) {
                    if (child.nodeType == child.ELEMENT_NODE) {
                        switch (child.nodeName) {
                            case 'source':
                                sources.push(getSource(child));
                                break;
                            case 'triangles':
                                triangles.push(child);
                                break;
                            case 'lines':
                            case 'linestrips':
                            case 'polygons':
                            case 'polylists':
                            case 'trifans':
                            case 'tristrips':
                                alert('Unsupported mesh primitive ' + child.nodeName);
                                break;
                            default:
                                break;
                        }
                    }
                    child = child.nextSibling;
                }

                var inputList = [];
                for (var t = 0; t < triangles.length; ++t) {
                    var material = triangles[t].attributes['material'].nodeValue;
                    var count = triangles[t].attributes['count'].nodeValue;
                    var inputArray = getChildNodesByNodeName(triangles[t], 'input');
                    for (var i = 0; i < inputArray.length; ++i) {
                        var semantic = inputArray[i].attributes['semantic'].nodeValue;
                        var sourceURI = validateFragmentURI(inputArray[i].attributes['source'].nodeValue);
                        var offset = inputArray[i].attributes['offset'].nodeValue;
                        var set = inputArray[i].attributes['set'] ? inputArray[i].attributes['set'].nodeValue : 0;

                        if (semantic == 'VERTEX') {
                            var vert = getChildNodeByAttrib(mesh, 'id', sourceURI);
                            var vertInputArray = getChildNodesByNodeName(vert, 'input');
                            for (var j = 0; j < vertInputArray.length; ++j) {
                                var semantic = vertInputArray[j].attributes['semantic'].nodeValue;
                                var sourceURI = validateFragmentURI(vertInputArray[j].attributes['source'].nodeValue);
                                inputList.push({ 'semantic' : semantic, 'source' : sourceURI, 'offset' : offset, 'set' : set });
                            }
                        } else {
                            inputList.push({ 'semantic' : semantic, 'source' : sourceURI, 'offset' : offset, 'set' : set });
                        }
                    }
                    // KEEP GOING
                    var pArray = getChildNodesByNodeName(triangles[t], 'p');
                    var p = pArray[0];
                }
            }
        }

        this.file = './json/space-station/matte_geoShape.json';
    }

    this.print = function() {
        return '{ "type" : "mesh", "file" : "' + this.file + '" }';
    }
}

function ColladaLight() {
    this.parse = function(xmlDoc, node) {
    }

    this.print = function() {
        return '{ "type" : "light", "subtype" : "spot", "color" : [1, 1, 1], "constant_attenuation" : 0.0, "linear_attenuation" : 1.0, "quadratic_attenuation" : 0.0, "falloff_angle" : 40.0, "falloff_exponent" : 1.0 }';
    }
}

function ColladaCamera() {
    this.parse = function(xmlDoc, node) {
    }

    this.print = function() {
        return '{ "type" : "camera", "subtype" : "perspective", "yfov" : 37.84928, "znear" : 0.1, "zfar" : 10000.0 }';
    }
}

function createColladaNode(node) {
    if (node.nodeName == 'instance_controller' || node.nodeName == 'instance_geometry') {
      return new ColladaMesh();
    } else if (node.nodeName == 'instance_light') {
      return new ColladaLight();
    } else if (node.nodeName == 'instance_camera') {
      return new ColladaCamera();
    } else if (node.nodeName == 'node' && node.attributes['type'].nodeValue == 'JOINT') {
      alert('joint');
    } else if (node.nodeName == 'node') {
        return new ColladaNode();
    }
    return null;
}

function ColladaScene() {

    this.parse = function(xmlDoc, visualScene) {
        this.nodes = [];

        for (var x = 0; x < visualScene.childNodes.length; ++x) {
            var node = visualScene.childNodes[x];
            if (node.nodeType == node.ELEMENT_NODE) {
                var newNode = createColladaNode(node);
                newNode.parse(xmlDoc, node);
                this.nodes.push(newNode);
            }
        }
    }

    this.print = function() {
        var str = '{ "nodes" : [ ';
        for (var i = 0; i < this.nodes.length; ++i) {
            if (i != 0)
                str += ', ';
            str += this.nodes[i].print();
        }
        str += ' ] }';
        return str;
    }
}

function collada2JSON(xmlDoc) {
    var emptyScene = '{ "nodes" : [ ] }';
    var collada = xmlDoc.documentElement;

    if (!collada)
        return emptyScene;

    var sceneArray = collada.getElementsByTagName('scene');
    if (sceneArray.length == 0)
        return emptyScene;

    // There can be zero or one scenes in a collada element.
    var scene = sceneArray[0];

    var ivSceneList = scene.getElementsByTagName('instance_visual_scene');
    if (ivSceneList.length == 0)
        return emptyScene;

    // There can be zero or one instance_visual_scene in a scene element.
    var instance_visual_scene = ivSceneList[0];
    var visualSceneURI = validateFragmentURI(instance_visual_scene.attributes['url'].nodeValue);

    var libraryVisualScenesArray = collada.getElementsByTagName('library_visual_scenes');
    if (libraryVisualScenesArray.length == 0)
        return emptyScene;

    // There can be zero or one library_visual_scenes in a collada element.
    var libraryVisualScenes = libraryVisualScenesArray[0];
    for (var x = 0; x < libraryVisualScenes.childNodes.length; ++x) {
        var node = libraryVisualScenes.childNodes[x];
        if (node.nodeType == node.ELEMENT_NODE && node.nodeName == 'visual_scene' && node.attributes['id'].nodeValue == visualSceneURI) {
            var scene = new ColladaScene();
            scene.parse(xmlDoc, node);
            var jsonString = scene.print();
            return jsonString;
        }
    }
    return emptyScene;
}