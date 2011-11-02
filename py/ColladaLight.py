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


class Light:
  def __init__(self, doc, node):
    lightURL = node.getAttribute('url')
    library_lights = doc.getElementsByTagName('library_lights')[0]
    light = GetChildNodeMatchingAttr(library_lights, 'light', lightURL[1:], 'id')
    technique_common = GetChildNode(light, 'technique_common')
    lightNode = GetChildElement(technique_common)
    self.type = 'light'
    self.subtype = lightNode.tagName
    color = GetChildNode(lightNode, 'color')
    if color != None:
      self.color = [str(s) for s in color.firstChild.data.strip().split(' ')]
    else:
      self.color = [1,1,1]
    
    if lightNode.tagName == 'spot' or lightNode.tagName == 'point':
      self.GetLightParameter(lightNode, 'constant_attenuation')
      self.GetLightParameter(lightNode, 'linear_attenuation')
      self.GetLightParameter(lightNode, 'quadratic_attenuation')
    if lightNode.tagName == 'spot':
      self.GetLightParameter(lightNode, 'falloff_angle')
      self.GetLightParameter(lightNode, 'falloff_exponent')

  def GetLightParameter(self, lightNode, param):
    tmp = GetChildNode(lightNode, param)
    if tmp != None:
      setattr(self, param, float(tmp.firstChild.data.strip()))
    

  def WriteToScene(self, fileHandle, indent, outFolder):
    for i in range(indent):
      fileHandle.write(' ')
    fileHandle.write('{ "type" : "' + self.type + '", "subtype" : "' + self.subtype + '", "color" : ' + str(self.color).replace("'",''))
    if hasattr(self, 'constant_attenuation'):
      fileHandle.write(', "constant_attenuation" : ' + str(self.constant_attenuation))
    if hasattr(self, 'linear_attenuation'):
      fileHandle.write(', "linear_attenuation" : ' + str(self.linear_attenuation))
    if hasattr(self, 'quadratic_attenuation'):
      fileHandle.write(', "quadratic_attenuation" : ' + str(self.quadratic_attenuation))
    if hasattr(self, 'falloff_angle'):
      fileHandle.write(', "falloff_angle" : ' + str(self.falloff_angle))
    if hasattr(self, 'falloff_exponent'):
      fileHandle.write(', "falloff_exponent" : ' + str(self.falloff_exponent))
    fileHandle.write(' }')
    
  def Write(self, outFolder):
    return;
