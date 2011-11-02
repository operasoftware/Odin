import ColladaMesh
import ColladaBone
import ColladaNode
import ColladaLight
import ColladaCamera
import os

class Scene:
  def __init__(self, doc, visualScene, outFolder):
    self.jnodes = []
    for node in visualScene.childNodes:
      if node.nodeType == node.ELEMENT_NODE and node.tagName == 'node':
        self.jnodes.append(self.ProcessElement(doc, node))

  def ProcessElement(self, doc, node):
    ret = None
    if node.getAttribute('type') == 'JOINT':
      ret = ColladaBone.Bone(node)
    else:
      ret = ColladaNode.Node(node)
    for child in node.childNodes:
      if child.nodeType == node.ELEMENT_NODE:
        if child.tagName == 'instance_controller' or child.tagName == 'instance_geometry':
          ret.children.append(ColladaMesh.Mesh(doc, child))
        elif child.tagName == 'instance_light':
          ret.children.append(ColladaLight.Light(doc, child))
        elif child.tagName == 'instance_camera':
          ret.children.append(ColladaCamera.Camera(doc, child))
        elif child.tagName == 'node':
          ret.children.append(self.ProcessElement(doc, child))
    return ret

  # Write the scene as a JSON file.
  def Write(self, fFolder, fName):
    fileHandle = open(fFolder + fName + '.json', 'w')
    fileHandle.write('{\n')
    fileHandle.write('  "nodes" : \n  [\n')

    sceneFolder = fFolder + fName
    if not os.path.exists(sceneFolder):
      os.makedirs(sceneFolder)
    
    for m in range(len(self.jnodes)):
      if m != 0:
        fileHandle.write(',\n')
      self.jnodes[m].WriteToScene(fileHandle, 4, sceneFolder)
      self.jnodes[m].Write(sceneFolder)
      
    fileHandle.write('\n  ]\n}\n')
    fileHandle.close()
