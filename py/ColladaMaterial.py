import xml.dom.minidom
import os

# Basic material info.
class Material():
  def __init__(self, fx, doc, skin):
    if hasattr(fx, "name"):
      self.name = fx.getAttribute("name")
    else:
      self.name = fx.getAttribute("id")
    self.count = 0
    self.diffuse = "0,0,0,1"
    self.materialType = "unknown"
    self.ambient = "0,0,0,1"
    self.shininessTex = ""
    self.shininess = "10"
    self.skinned = skin
    self.channelNames = ["ambient", "bump", "diffuse", "emission", "shininess", "specular"]

    if len(fx.getElementsByTagName("lambert")) != 0:
      self.materialType = "lambert"
    if len(fx.getElementsByTagName("phong")) != 0:
      self.materialType = "phong"
    if len(fx.getElementsByTagName("blinn")) != 0:
      self.materialType = "phong"

    self.commonLUT = dict()
    for profile in fx.getElementsByTagName('profile_COMMON'):
      for newparam in profile.getElementsByTagName('newparam'):
        sid = newparam.getAttribute('sid')
        for node in newparam.childNodes:
          if node.nodeType == node.ELEMENT_NODE:
            if node.tagName == 'surface':
              self.commonLUT[sid] = ('surface', str(node.childNodes[1].childNodes[0].nodeValue))
            elif node.tagName == 'sampler2D':
              self.commonLUT[sid] = ('sampler2D', str(node.childNodes[1].childNodes[0].nodeValue))

    for channel in self.channelNames:
      self.AddChannel(doc, fx, channel);


  def AddChannel(self, doc, fx, channelName):
    for channel in fx.getElementsByTagName(channelName):
      for col in channel.getElementsByTagName("color"):
        setattr(self, channelName, col.firstChild.data.strip().replace('  ', ',').replace(' ', ','))
      for tex in channel.getElementsByTagName("texture"):
        texName = tex.getAttribute("texture")
        uvSetName = tex.getAttribute("texcoord")
        while texName in self.commonLUT:
          texName = self.commonLUT[texName][1]
        libraryImages = doc.getElementsByTagName('library_images')[0]
        for img in libraryImages.getElementsByTagName("image"):
          if img.getAttribute("id") == texName:
            for src in img.getElementsByTagName("init_from"):
              texName = src.firstChild.data
        setattr(self, channelName, texName)
        setattr(self, channelName + "_uv", uvSetName)

  def ChannelHasTexture(self, channel):
    return hasattr(self, channel) and not getattr(self, channel)[0].isdigit()

  def HasTextureChannel(self):
    for channel in self.channelNames:
      if self.ChannelHasTexture(channel):
        return True
    return False

  def WriteChannel(self, channel, fileHandle):
    if hasattr(self, channel):
      if getattr(self, channel)[0].isdigit():
        fileHandle.write(',\n  "' + channel + '" : [' + getattr(self, channel) + ']')
      else:
        fileHandle.write(',\n  "' + channel + '" : "' + 'textures/' + getattr(self, channel).split("/")[-1] + '"')
        fileHandle.write(',\n  "' + channel + '_uv" : ' + getattr(self, channel + "_uv")[3:])
    

  def Write(self, outFolder):
    fileHandle = open(outFolder + '/' + self.name + '.json', 'w')
    fileHandle.write('{\n  "name" : "' + self.name + '",\n  "skinned" : ' + str(self.skinned).lower() + ',\n  "type" : "' + self.materialType + '"')

    for channel in self.channelNames:
      self.WriteChannel(channel, fileHandle)

    fileHandle.write('\n}') 
    fileHandle.close()


