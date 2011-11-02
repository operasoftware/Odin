import xml.dom.minidom

# Get a child of 'parentNode' with the specified type and name.
def GetChildNode(parentNode, nodeType, nodeName):
  n = parentNode.firstChild
  while n != None:
    if n.nodeType == n.ELEMENT_NODE:
      if n.tagName == nodeType:
        if n.getAttribute("sid") == nodeName:
          return n
    n = n.nextSibling
  return None


class Bone():
  def __init__(self, node):
    self.name = node.getAttribute("name")

    # According to the collada spec we should be able to just convert
    # the transforms to column matrices and do pre multiplication in the
    # listed order, but the exporters seem to be buggy so we'll specifically
    # get the attributes by name.
    self.AddVecAttr(node, "translate", "translate")
    self.AddVecAttr(node, "rotate", "rotateZ")
    self.AddVecAttr(node, "rotate", "rotateY")
    self.AddVecAttr(node, "rotate", "rotateX")
    self.AddVecAttr(node, "rotate", "jointOrientZ")
    self.AddVecAttr(node, "rotate", "jointOrientY")
    self.AddVecAttr(node, "rotate", "jointOrientX")
    self.AddVecAttr(node, "rotate", "rotateAxisZ")
    self.AddVecAttr(node, "rotate", "rotateAxisY")
    self.AddVecAttr(node, "rotate", "rotateAxisX")
    
    self.bindTranslation = [0, 0, 0]
    if hasattr(self, 'translate'):
      self.bindTranslation = self.translate
   
    self.bindRotation = [0, 0, 0]
    if hasattr(self, 'rotateX'):
      self.bindRotation[0] = getattr(self, 'rotateX')[3]
    if hasattr(self, 'rotateY'):
      self.bindRotation[1] = getattr(self, 'rotateY')[3]
    if hasattr(self, 'rotateZ'):
      self.bindRotation[2] = getattr(self, 'rotateZ')[3]
      
    self.jointOrient = [0, 0, 0]
    if hasattr(self, 'jointOrientX'):
      self.jointOrient[0] = getattr(self, 'jointOrientX')[3]
    if hasattr(self, 'jointOrientY'):
      self.jointOrient[1] = getattr(self, 'jointOrientY')[3]
    if hasattr(self, 'jointOrientZ'):
      self.jointOrient[2] = getattr(self, 'jointOrientZ')[3]

    self.postRotate = [0, 0, 0]
    if hasattr(self, 'rotateAxisX'):
      self.postRotate[0] = getattr(self, 'rotateAxisX')[3]
    if hasattr(self, 'rotateAxisY'):
      self.postRotate[1] = getattr(self, 'rotateAxisY')[3]
    if hasattr(self, 'rotateAxisZ'):
      self.postRotate[2] = getattr(self, 'rotateAxisZ')[3]

    self.children = []

  def AddVecAttr(self, parentNode, nodeType, attrName):
    n = GetChildNode(parentNode, nodeType, attrName)
    if n != None:
      setattr(self, attrName, [str(s) for s in n.firstChild.data.strip().split(' ')])

  def Write(self, outFolder):
    for c in self.children:
      c.Write(outFolder);

  def WriteToScene(self, fileHandle, indent, outFolder):
    for i in range(indent):
      fileHandle.write(' ')
    fileHandle.write('{ "type" : "joint"')
    fileHandle.write(', "name" : "' + self.name + '"')
    fileHandle.write(', "bindTranslation" :' + str(getattr(self, 'bindTranslation')).replace("'", ''))
    fileHandle.write(', "bindRotation" : ' + str(getattr(self, 'bindRotation')).replace("'", ''))
    fileHandle.write(', "jointOrient" : ' + str(getattr(self, 'jointOrient')).replace("'", ''))
    fileHandle.write(', "postRotate" : ' + str(getattr(self, 'postRotate')).replace("'", ''))
    
    if len(self.children) != 0:
      fileHandle.write(', "children" : [\n')
      for c in range(len(self.children)):
        if c != 0:
          fileHandle.write(',\n')
        self.children[c].WriteToScene(fileHandle, indent + 2, outFolder)
      fileHandle.write('\n')
      for i in range(indent):
        fileHandle.write(' ')
      fileHandle.write(']')
    fileHandle.write('}')


