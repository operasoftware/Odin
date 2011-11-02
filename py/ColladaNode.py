import xml.dom.minidom

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


class Node():
  def __init__(self, node):
    self.name = node.getAttribute("name")
    self.children = []

    # According to the collada spec we should be able to just convert
    # the transforms to column matrices and do pre multiplication in the
    # listed order, but the exporters seem to be buggy so we'll specifically
    # get the attributes by name.
    self.AddVecAttr(node, "translate", "translate")
    self.AddVecAttr(node, "rotate", "rotateZ")
    self.AddVecAttr(node, "rotate", "rotateY")
    self.AddVecAttr(node, "rotate", "rotateX")
    self.AddVecAttr(node, "scale", "scale")
    self.AddVecAttr(node, "translate", "rotatePivot")
    #self.AddVecAttr(node, "translate", "rotatePivotInverse")
    #self.AddVecAttr(node, "translate", "rotatePivotTranslation")
    self.AddVecAttr(node, "translate", "scalePivot")
    #self.AddVecAttr(node, "translate", "scalePivotInverse")
    #self.AddVecAttr(node, "translate", "scalePivotTranslation")
    
    self.rotate = [0, 0, 0]
    if hasattr(self, 'rotateX'):
        self.rotate[0] = getattr(self, 'rotateX')[3]
    if hasattr(self, 'rotateY'):
        self.rotate[1] = getattr(self, 'rotateY')[3]
    if hasattr(self, 'rotateZ'):
        self.rotate[2] = getattr(self, 'rotateZ')[3]


  def AddVecAttr(self, parentNode, nodeType, attrName):
    n = GetChildNodeMatchingAttr(parentNode, nodeType, attrName, 'sid')
    if n != None:
      setattr(self, attrName, [str(s) for s in n.firstChild.data.strip().split(' ')])

  def Write(self, outFolder):
    for c in self.children:
      c.Write(outFolder);

  def WriteToScene(self, fileHandle, indent, outFolder):
    for i in range(indent):
      fileHandle.write(' ')
    fileHandle.write('{ "type" : "node"')
    fileHandle.write(', "name" : "' + self.name + '"')
    if hasattr(self, 'translate') and self.translate != [0,0,0]:
      fileHandle.write(', "translate" : ' + str(self.translate).replace("'", ''))
    if hasattr(self, 'rotate') and self.rotate != [0,0,0]:
      fileHandle.write(', "rotate" : ' + str(self.rotate).replace("'", ''))
    if hasattr(self, 'scale') and self.scale != [1,1,1]:
      fileHandle.write(', "scale" : ' + str(self.scale).replace("'", ''))
    if hasattr(self, 'rotatePivot') and self.rotatePivot != [0,0,0]:
      fileHandle.write(', "rotatePivot" : ' + str(self.rotatePivot).replace("'", ''))
    if hasattr(self, 'scalePivot') and self.scalePivot != [0,0,0]:
      fileHandle.write(', "scalePivot" : ' + str(self.scalePivot).replace("'", ''))
      
    
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


