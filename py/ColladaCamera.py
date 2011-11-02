# Get a child of 'parentNode' with the specified type and name.
def GetChildNodeMatchingAttr(parentNode, nodeType, nodeName, attrName):
  n = parentNode.firstChild
  while n != None:
    if n.nodeType == n.ELEMENT_NODE:
      if n.tagName == nodeType:
        if n.getAttribute(attrName) == nodeName:
          return n
    n = n.nextSibling
  return None

def GetChildNode(parentNode, nodeType):
  n = parentNode.firstChild
  while n != None:
    if n.nodeType == n.ELEMENT_NODE:
      if n.tagName == nodeType:
        return n
    n = n.nextSibling
  return None

def GetChildElement(parentNode):
  n = parentNode.firstChild
  while n != None:
    if n.nodeType == n.ELEMENT_NODE:
      return n
    n = n.nextSibling
  return None


class Camera:
  def __init__(self, doc, node):
    cameraURL = node.getAttribute('url')
    library_cameras = doc.getElementsByTagName('library_cameras')[0]
    camera = GetChildNodeMatchingAttr(library_cameras, 'camera', cameraURL[1:], 'id')
    optics = GetChildNode(camera, 'optics')
    technique_common = GetChildNode(optics, 'technique_common')
    cameraNode = GetChildElement(technique_common)

    self.type = 'camera'
    self.subtype = cameraNode.tagName
    
    self.GetCameraParameter(cameraNode, 'znear')
    self.GetCameraParameter(cameraNode, 'zfar')
    if cameraNode.tagName == 'perspective':
      self.GetCameraParameter(cameraNode, 'xfov')
      self.GetCameraParameter(cameraNode, 'yfov')
    elif cameraNode.tagName == 'orthographic':
      self.GetCameraParameter(cameraNode, 'xmag')
      self.GetCameraParameter(cameraNode, 'ymag')


  def GetCameraParameter(self, cameraNode, param):
    tmp = GetChildNode(cameraNode, param)
    if tmp != None:
      setattr(self, param, float(tmp.firstChild.data.strip()))
    

  def WriteToScene(self, fileHandle, indent, outFolder):
    for i in range(indent):
      fileHandle.write(' ')
    fileHandle.write('{ "type" : "' + self.type + '", "subtype" : "' + self.subtype + '"')
    if hasattr(self, 'xfov'):
      fileHandle.write(', "xfov" : ' + str(self.xfov))
    if hasattr(self, 'yfov'):
      fileHandle.write(', "yfov" : ' + str(self.yfov))
    if hasattr(self, 'xmag'):
      fileHandle.write(', "xmag" : ' + str(self.xmag))
    if hasattr(self, 'ymag'):
      fileHandle.write(', "ymag" : ' + str(self.ymag))
    if hasattr(self, 'znear'):
      fileHandle.write(', "znear" : ' + str(self.znear))
    if hasattr(self, 'zfar'):
      fileHandle.write(', "zfar" : ' + str(self.zfar))
    fileHandle.write(' }')
    
  def Write(self, outFolder):
    return;
