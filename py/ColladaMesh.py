from bisect import bisect
import ColladaMaterial

# Named array of points.
class PointArray():
  def __init__(self, n, ofs):
    self.name = n
    self.points = []
    self.stride = 1
    self.offset = int(ofs)

def GetFirstChildElement(node):
  for elem in node.childNodes:
    if elem.nodeType == elem.ELEMENT_NODE:
      return elem
  return None

def GetChildElements(node):
  elems = []
  for elem in node.childNodes:
    if elem.nodeType == elem.ELEMENT_NODE:
      elems.append(elem)
  return elems

def GetSourceArray(parent, srcId):
  for src in parent.getElementsByTagName('source'):
    if src.getAttribute('id') == srcId[1:]:  
      technique = src.getElementsByTagName('technique_common')[0]
      accessor = GetFirstChildElement(technique)
      sourceURL = accessor.getAttribute('source')
      count = int(accessor.getAttribute('count'))
      param = GetFirstChildElement(accessor)
      paramType = param.getAttribute('type')
      for node in GetChildElements(src):
        if node.getAttribute('id') == sourceURL[1:]:
          data = node.firstChild.data
          data = data.strip()
          data = data.replace('\n', ' ')
          if paramType == 'name':
            data = [str(s) for s in data.split(' ')]
          elif paramType == 'float':
            data = [float(s) for s in data.split(' ')]
          elif paramType == 'float4x4':
            data = [float(s) for s in data.split(' ')]

          return data
      return []

def GetChildArray(parent, tag, typecast):
  for node in GetChildElements(parent):
    if node.tagName == tag:
      return [typecast(x) for x in node.firstChild.data.strip().split(' ')]
  return []

class Skin:
  def __init__(self, skin, numWeights, origPosMap):
    self.bindShapeMatrix = GetChildArray(skin, 'bind_shape_matrix', float)

    jointURL = ""
    for joints in skin.getElementsByTagName('joints'):
      for inp in joints.getElementsByTagName('input'):
        semantic = inp.getAttribute('semantic')
        sourceURL = inp.getAttribute('source')
        if semantic == 'JOINT':
          self.jointNames = GetSourceArray(skin, sourceURL)
          jointURL = sourceURL
        elif semantic == 'INV_BIND_MATRIX':
          self.invBindMatrices = GetSourceArray(skin, sourceURL)
        else:
          print('Skipping input with unknown semantic ' + semantic)

    for vertexWeights in skin.getElementsByTagName('vertex_weights'):
      jointOffset = 0
      weightOffset = 0
      weightURL = ''
      for inp in vertexWeights.getElementsByTagName('input'):
        semantic = inp.getAttribute('semantic')
        offset = int(inp.getAttribute('offset'))
        sourceURL = inp.getAttribute('source')
        if semantic == 'JOINT':
          if sourceURL != jointURL:
            print('TODO: multiple jointURLs specified, need to match up indices.')
          jointOffset = offset
        elif semantic == 'WEIGHT':
          weightURL = sourceURL
          weightOffset = offset
        else:
          print('Skipping input with unknown semantic ' + semantic)

      weights = GetSourceArray(skin, weightURL)
      vertexCount = GetChildArray(vertexWeights, 'vcount', int)
      v = GetChildArray(vertexWeights, 'v', int)
      vstride = max(jointOffset, weightOffset) + 1
      self.vertexWeightCount = numWeights
      self.vertexWeights = []
      self.jointIndices = []
      index = 0
      for vc in vertexCount:
        tempWeights = []
        tempIndices = []
        for c in range(vc):
          tempWeights.append(weights[v[(index + c) * vstride + weightOffset]])
          tempIndices.append(v[(index + c) * vstride + jointOffset])
        temp = zip(tempWeights, tempIndices)
        temp.sort()
        temp.reverse()
        tempWeights = [s[0] for s in temp][:numWeights]
        tempIndices = [s[1] for s in temp][:numWeights]
        for n in range(len(tempWeights), numWeights):
          tempWeights.append(0)
          tempIndices.append(0)
        weightSum = 0
        for n in range(numWeights):
          weightSum = weightSum + tempWeights[n]
        for n in range(numWeights):
          tempWeights[n] = tempWeights[n] / weightSum
        self.vertexWeights.extend(tempWeights)
        self.jointIndices.extend(tempIndices)         
        index = index + vc
      #Expand vertex weights and joint indices according to origPosMap
      newVertexWeights = []
      newJointIndices = []
      for i in range(len(origPosMap)):
        origIndex = int(origPosMap[i])
        for j in range(numWeights):
          newVertexWeights.append(self.vertexWeights[origIndex * numWeights + j])
          newJointIndices.append(self.jointIndices[origIndex * numWeights + j])
      self.vertexWeights = newVertexWeights
      self.jointIndices = newJointIndices

  def Write(self, fileHandle):
    fileHandle.write('  "bindShapeMatrix" : ')
    fileHandle.write(str(self.bindShapeMatrix) + ",\n")

    fileHandle.write('  "jointNames" : ')
    fileHandle.write(str(self.jointNames).replace("'", '"') + ",\n")

    fileHandle.write('  "invBindMatrices" : ')
    fileHandle.write(str(self.invBindMatrices) + ",\n")

    fileHandle.write('  "vertexWeights" : ')
    fileHandle.write(str(self.vertexWeights) + ",\n")

    fileHandle.write('  "jointIndices" : ')
    fileHandle.write(str(self.jointIndices) + ",\n")


#TODO: passing in the doc is like begging for trouble, pass in the needed elements instead.
class Mesh:
  def __init__(self, doc, node):

    self.materialLUT = dict()
    instanceMaterials = node.getElementsByTagName('instance_material')
    for mat in instanceMaterials:
      self.materialLUT[mat.getAttribute('symbol')] = mat.getAttribute('target')

    geometry = None
    instanceGeometryURL = ''
    if node.tagName == 'instance_controller':
      instanceControllerURL = node.getAttribute('url')
      controllers = doc.getElementsByTagName('controller')
      controller = None
      for c in controllers:
        if c.getAttribute('id') == instanceControllerURL[1:]:
          controller = c
          break
      if c == None:
        print("Couldn't find the controller with id '" + instanceControllerURL + "', skipping")
        return
      skins = c.getElementsByTagName('skin')
      if len(skins) != 1:
        print("Controller doesn't contain exactly one skin, skipping.")
        return
      instanceGeometryURL = skins[0].getAttribute('source');
    elif node.tagName == 'instance_geometry':          
      instanceGeometryURL = node.getAttribute('url')

    if len(instanceGeometryURL) != 0:
      if instanceGeometryURL[0] != '#':
        print('Geometry URL pointing outside of this document, skipping.')
        return
      geometries = doc.getElementsByTagName('geometry')
      geometry = None
      for g in geometries:
        if g.getAttribute('id') == instanceGeometryURL[1:]:
          geometry = g
          break
      if geometry == None:
        print("Couldn't find the geometry with id '" + instanceGeometryURL + "', skipping")
        return   
    
    self.faces = []
    self.materials = []
    self.verts = []
    geometryId = geometry.getAttribute("id")
    self.uniqueVerts = dict()
    self.sourceArrays = dict()
    self.outFileName = geometry.getAttribute('name') + '.json'
    self.skin = None
    self.origPosMap = dict()
    self.skinNode = None

    # Check if there's a skin node for this mesh.
    for controller in doc.getElementsByTagName("controller"):
      if self.skinNode != None:
        break
      controllerId = controller.getAttribute("id")
      for skin in controller.getElementsByTagName("skin"):
        if skin.getAttribute("source")[1:] == geometryId:
          self.skinNode = skin
          break

    for mesh in geometry.getElementsByTagName("mesh"):
      # TODO: This assumes there's only one <mesh> per <geometry>, check spec.
      # Only export normals and uv's if they're required by the material.
      self.needsNormals = False
      self.needsUV = False

      # Get all the triangles and polygons in the mesh.
      polygons = mesh.getElementsByTagName("polygons")
      triangles = mesh.getElementsByTagName("triangles")
      for tri in triangles:
        polygons.append(tri)

      # Get all the materials in the mesh.
      self.BuildMaterials(doc, polygons)

      # Create a list of all the sources
      sourceList = self.BuildSourceList(mesh, polygons)

      # Look up the source and pull the data.
      for srcItem in sourceList:
        sourceURL = srcItem[0]
        offset = srcItem[1]
        targetAttr = srcItem[2]
        foundSource = False
        for source in mesh.getElementsByTagName('source'):
          if source.getAttribute('id') == sourceURL[1:]:
            foundSource = True
            if not self.sourceArrays.has_key(targetAttr):
              self.sourceArrays[targetAttr] = []
            self.GetSrcArray(source, targetAttr, offset)
            break
        if not foundSource:
          print("Couldn't find matching source.")
          break

      # Get unique indices.
      for polygon in polygons:
        for p in polygon.getElementsByTagName("p"):
          face = p.firstChild.data.strip().split(' ');
          stride = len(face) / (int(polygon.getAttribute("count")) * 3)
          for i in range(0, len(face), stride):
            posArr = self.sourceArrays["vertexPositions"][0]
            fIndex = int(face[i+posArr.offset])
            px = posArr.points[fIndex*3]
            py = posArr.points[fIndex*3+1]
            pz = posArr.points[fIndex*3+2]
            vert = (px,py,pz)
            if self.needsNormals:
              for nc in range(0, len(self.sourceArrays["vertexNormals"])):
                normArr = self.sourceArrays["vertexNormals"][nc]
                fIndex = int(face[i+normArr.offset])
                nx = normArr.points[fIndex*3]
                ny = normArr.points[fIndex*3+1]
                nz = normArr.points[fIndex*3+2]
                vert = vert + (nx,ny,nz)
            if self.needsUV:
              for tn in range(0, len(self.sourceArrays["vertexTextureCoords"])):
                texArr = self.sourceArrays["vertexTextureCoords"][tn]
                fIndex = int(face[i+texArr.offset])
                u = texArr.points[fIndex*2]
                v = texArr.points[fIndex*2+1]
                vert = vert + (u,v)
            index = self.GetUniqueVertexIndex(vert)
            self.origPosMap[index] = face[i]
            self.faces.append(index)
            
      self.vertArrays = [None]*len(self.uniqueVerts)
      for v in self.uniqueVerts.iteritems():
        self.vertArrays[v[1]] = v[0]
      offs = 0
      arr = PointArray("vertexPositions", 0)
      for v in self.vertArrays:
        arr.points.append(v[offs+0])
        arr.points.append(v[offs+1])
        arr.points.append(v[offs+2])
      self.verts.append([arr])
      offs += 3

      if (self.needsNormals):
        self.verts.append([])
        for nc in range(0, len(self.sourceArrays["vertexNormals"])):
          arr = PointArray("vertexNormals", 3)
          for v in self.vertArrays:
            arr.points.append(v[offs+0])
            arr.points.append(v[offs+1])
            arr.points.append(v[offs+2])
          self.verts[-1].append(arr)
          offs += 3

      if (self.needsUV):
        self.verts.append([])
        for tn in range(0, len(self.sourceArrays["vertexTextureCoords"])):
          arr = PointArray("vertexTextureCoords", offs)
          for v in self.vertArrays:
            arr.points.append(v[offs+0])
            arr.points.append(v[offs+1])
          self.verts[-1].append(arr)
          offs += 2

    # If there's a skin node set, create the skin.
    if self.skinNode:
      self.skin = Skin(self.skinNode, 4, self.origPosMap)

  def BuildSourceList(self, mesh, polygons):
    # Build a list of (sourceURL, offset, targetAttr) tuples to extract.
    srcArray = []  
    for polygon in polygons:
      for input in polygon.getElementsByTagName("input"):
        semantic =  input.getAttribute("semantic")
        offset = input.getAttribute('offset')
        sourceURL = input.getAttribute('source')
        targetAttr = 'vertexPositions'
        if semantic == 'NORMAL':
          targetAttr = 'vertexNormals'
          if not self.needsNormals:
            continue
        elif semantic == 'TEXCOORD':
          targetAttr = 'vertexTextureCoords'
          if not self.needsUV:
            continue
        # There's an extra level of indirection for vertex semantics.
        if semantic == 'VERTEX':
          for vertex in mesh.getElementsByTagName('vertices'):
            for input in vertex.getElementsByTagName('input'):
              sourceURL = input.getAttribute('source')
              semantic = input.getAttribute('semantic')
              if semantic == 'NORMAL':
                if not self.needsNormals:
                  continue
                targetAttr = 'vertexNormals'
              elif semantic == 'POSITION':
                targetAttr = 'vertexPositions'
              if [sourceURL, offset, targetAttr] not in srcArray:
                srcArray.append([sourceURL, offset, targetAttr])
        else:
          if [sourceURL, offset, targetAttr] not in srcArray:
            srcArray.append([sourceURL, offset, targetAttr])
    return srcArray

  def BuildMaterials(self, doc, polygons):
      # Get all the materials in the mesh.
      gcount = 0
      for polygon in polygons:
        materialSymbol = polygon.getAttribute('material')
        if materialSymbol == '':
            continue
        materialURL = self.materialLUT[materialSymbol]
        material = None
        for mat in doc.getElementsByTagName('material'):
          if mat.getAttribute('id') == materialURL[1:]:
            material = mat;
            break
        if material == None:
          print("Couldn't find material '" + materialURL + "'.")
        instanceEffects = material.getElementsByTagName('instance_effect')
        if len(instanceEffects) == 0:
          print('No instance effects')
        effectURL = instanceEffects[0].getAttribute('url')
        if effectURL[0] != '#':
          print('Effect URL points outside document.')

        for fx in doc.getElementsByTagName("effect"):
          fxId = fx.getAttribute('id')
          if fxId == effectURL[1:]:
            mat = ColladaMaterial.Material(fx, doc, self.skinNode != None)
            mat.count = gcount
            self.materials.append(mat)
            if mat.materialType != "matte":
              self.needsNormals = True
            if mat.HasTextureChannel():
              self.needsUV = True
            break
        gcount += int(polygon.getAttribute("count")) * 3
    

    

  def WriteToScene(self, fileHandle, indent, outFolder):
    for i in range(indent):
      fileHandle.write(' ')
    fileHandle.write('{ "type" : "mesh", "file" : "' + outFolder + '/' + self.outFileName + '" }')
    
  # Write the mesh as a JSON file.
  def Write(self, outFolder):
    print('Writing mesh ' + outFolder + '/' + self.outFileName)
    fileHandle = open(outFolder + '/' + self.outFileName, 'w')
    fileHandle.write('{\n')
    fileHandle.write('  "materials" : \n  [\n')
    for m in range(len(self.materials)):
      self.materials[m].Write(outFolder)
      fileHandle.write('    { "file" : "' + outFolder + '/' + self.materials[m].name + '.json", "start" : ' + str(self.materials[m].count) + ' }')
      if m != len(self.materials) - 1:
        fileHandle.write(',')
      fileHandle.write('\n')
    fileHandle.write('  ],\n')
    fileHandle.write('  "indices" : ')
    fileHandle.write(str(self.faces))
    fileHandle.write(',\n')

    if self.skin != None:
      self.skin.Write(fileHandle)
      
    for pa in range(len(self.verts)):
      fileHandle.write('  "' + self.verts[pa][0].name + '" : [')
      for vsi in range(len(self.verts[pa])):
        fileHandle.write(str(self.verts[pa][vsi].points).replace("'", ""))
        if vsi != len(self.verts[pa]) - 1:
          fileHandle.write(', ')
      fileHandle.write(']')
      if pa != len(self.verts) - 1:
        fileHandle.write(',')
        fileHandle.write('\n')
      
    fileHandle.write('\n}')
    fileHandle.close()

  def GetUniqueVertexIndex(self, a):
     if a not in self.uniqueVerts:
       self.uniqueVerts[a] = len(self.uniqueVerts)
     return self.uniqueVerts[a];

  # Pull a float_array from the Collada format and store it as a PointArray in the mesh.
  def GetSrcArray(self, source, dstName, offset):
    the_array = source.getElementsByTagName("float_array")[0];
    arr = the_array.firstChild.data
    arr = arr.strip();
    arr = arr.replace('\n', ' ')
    newArray = PointArray(dstName, offset)
    newArray.points = [str(s) for s in arr.split(' ')]   
    s = source.getElementsByTagName("accessor")[0].getAttribute("stride")
    if s == "":
      newArray.stride = 1
    else:
      newArray.stride = int(s)
    #print("Got source " + newArray.name + ", count " + str(len(newArray.points)) + ", stride " + str(newArray.stride) + ", offset " + str(newArray.offset))
    self.sourceArrays[dstName].append(newArray)

