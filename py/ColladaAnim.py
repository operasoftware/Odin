import xml.dom.minidom

# Write a float array as a JSON array and remove any unnecessary
# trailing zeros.
def WriteFloatArray(fileHandle, arr):
  fileHandle.write("[")
  for index in range(len(arr)):
    if index != 0:
      fileHandle.write(", ")
    s = arr[index]
    if s.find(".") != -1:
        while s[-1] == "0" and s[-2] != ".":
          s = s[:-1]
    fileHandle.write(s)
  fileHandle.write("]")

class CurveData:
  def __init__(self):
    self.intan = []
    self.outtan = []
    self.pos = []

# A class for an animated attribute. Contains one or more keys.
class Attribute:
  def __init__(self, pname):
    self.name = pname
    self.type = ""
    self.time = []
    self.curveData = dict()

  def DeleteKey(self, index):
    del(self.time[index])
    del(self.intan[index])
    del(self.outtan[index])
    del(self.pos[index])

  # Optimize the animation by removing unnecessary keys. If there's
  # only a single key, set it to STEP as no interpolation is needed.
  def Optimize(self):
    return
    index = 1
    while index < len(self.time):
      if self.pos[index-1] == self.pos[index]:
        if float(self.intan[index]) == 0 and float(self.outtan[index-1]) == 0:
          self.DeleteKey(index)
          continue
      index = index + 1
    if len(self.time) == 1 and float(self.intan[0]) == 0 and float(self.outtan[0]) == 0:
      self.type = "STEP"

  # Write a single attribute to the JSON file.
  def Write(self, fileHandle, indent):
    indstr = ""
    for i in range(indent):
      indstr = indstr + ' '
    fileHandle.write(indstr + '"' + self.name + '":\n' + indstr + '{\n')
    fileHandle.write(indstr + '  "type" : "' + self.type + '",\n' + indstr + '  "time" : ')
    WriteFloatArray(fileHandle, self.time)

    indstr = indstr + '  '
    for key in self.curveData:
      fileHandle.write(',\n' + indstr + '"' + key + '":\n' + indstr + '{')
      indstr = indstr + '  '
      fileHandle.write('\n' + indstr + '"pos" : ')
      WriteFloatArray(fileHandle, self.curveData[key].pos)
      if self.type == "BEZIER" or self.type == "HERMITE":
        fileHandle.write(',\n' + indstr + '"intan" : ')
        WriteFloatArray(fileHandle, self.curveData[key].intan)
        fileHandle.write(',\n' + indstr + '"outtan" : ')
        WriteFloatArray(fileHandle, self.curveData[key].outtan)
      indstr = indstr[2:]
      fileHandle.write('\n' + indstr + '}')
    indstr = indstr[2:]
    fileHandle.write('\n' + indstr + '}')

# A class for an animated joint, containing one or more animated attributes.
class Joint:
  def __init__(self, pname):
    self.name = pname 
    self.attributes = dict()

  # Delete an animated attribute.
  def DeleteKey(self, key):
    del(self.attributes[key])

  # Optimize the animated joint by first optimizing all the attributes.
  # If there's a translate or rotate attribute that is always set to 0 remove it.
  # If there's a scale or visibility attribute that is always set to 1 remove it.
  def Optimize(self):
    for key in self.attributes:
      self.attributes[key].Optimize()
      if self.attributes[key].type == "STEP" and len(self.attributes[key].time) == 1:
        an = self.attributes[key].name
        av = float(self.attributes[key].pos[0])
        if av == 0:
          if an.find('translate.') >= 0 or an.find('rotate') >= 0:
            self.DeleteKey(key)
            continue
        elif av == 1:
          if an.find('scale.') >= 0 or an.find('visibility') >= 0:
            self.DeleteKey(key)
            continue

  # Write an animated joint to the JSON.
  def Write(self, fileHandle):
    fileHandle.write('  "' + self.name + '" :\n  {')
    first = True
    for attr in self.attributes:
      if not first:
        fileHandle.write(',')
      first = False
      fileHandle.write('\n')
      self.attributes[attr].Write(fileHandle, 6)
    fileHandle.write('\n  }')

# Class for a full animation.
class Anim:
  def __init__(self, libAnims):
    self.joints = dict()
    # Iterate over all the animated joints.
    jointAnim = libAnims.firstChild
    while jointAnim != None:
      if jointAnim.nodeType == jointAnim.ELEMENT_NODE and jointAnim.tagName == "animation":
        self.InitChannel(jointAnim)

        # Iterate over all the animations for this joint.
        channelAnim = jointAnim.firstChild
        while channelAnim != None:
          if channelAnim.nodeType == channelAnim.ELEMENT_NODE and channelAnim.tagName == "animation":
            self.InitChannel(channelAnim)
          channelAnim = channelAnim.nextSibling

      jointAnim = jointAnim.nextSibling
    self.Optimize()

  def InitChannel(self, channelAnim):
    # Find what channel we're animating
    channel = channelAnim.firstChild
    while channel != None:
      if channel.nodeType == channel.ELEMENT_NODE and channel.tagName == "channel":
        # Add the attribute for the animated channel.

        jointName = channel.getAttribute('target').split('/')[0]
        if not jointName in self.joints:
          # Add this joint to the list (it may be optimized out later)
          self.joints[jointName] = Joint(jointName)

        # Get the channel target without the member
        channelTarget = channel.getAttribute("target")
        lastDot = channelTarget.rfind('.')
        if lastDot != -1:
          channelTarget = channelTarget[:lastDot]
        lastSlash = channelTarget.rfind('/')
        if lastSlash != -1:
          channelTarget = channelTarget[lastSlash+1:]

        # Make sure the attribute for the channel target is there
        if not channelTarget in self.joints[jointName].attributes:
          self.joints[jointName].attributes[channelTarget] = Attribute(channelTarget)

        channelSourceName = channel.getAttribute("source")
        # Find the sampler where the semantics are defined.
        channelSampler = channelAnim.firstChild
        while channelSampler != None:
          if channelSampler.nodeType == channelSampler.ELEMENT_NODE and channelSampler.tagName == "sampler":
            # Check that it's the right sampler we found.
            if (channelSampler.getAttribute("id")) == channelSourceName[1:]:

              # find the member value fields (i.e. X, Y, Z, ANGLE..no support for array indices)
              members = []
              inputItem = channelSampler.firstChild
              while inputItem != None:
                if inputItem.nodeType == inputItem.ELEMENT_NODE and inputItem.tagName == "input" and (inputItem.getAttribute("semantic") == "OUTPUT" or inputItem.getAttribute("semantic") == "POSITION"):
                  inputSourceName = inputItem.getAttribute("source")
                  # Find the source data for this input by iterating over the sources.
                  inputSource = channelAnim.firstChild
                  while inputSource != None:
                    if inputSource.nodeType == inputSource.ELEMENT_NODE and inputSource.tagName == "source":
                      if (inputSource.getAttribute("id")) == inputSourceName[1:]:
                        accessor = inputSource.getElementsByTagName("technique_common")[0].getElementsByTagName("accessor")[0];
                        member = accessor.firstChild
                        while member != None:
                          if member.nodeType == member.ELEMENT_NODE:
                            mName = member.getAttribute("name")
                            if mName == '':
                              mName = 'VALUE';
                            members.append(mName)
                          member = member.nextSibling
                        break
                    inputSource = inputSource.nextSibling
                  break
                inputItem = inputItem.nextSibling
              
              # Iterate over the inputs.
              inputItem = channelSampler.firstChild
              while inputItem != None:
                if inputItem.nodeType == inputItem.ELEMENT_NODE and inputItem.tagName == "input":
                  inputSemantic = inputItem.getAttribute("semantic")
                  inputSourceName = inputItem.getAttribute("source")
                  # Find the source data for this input by iterating over the sources.
                  inputSource = channelAnim.firstChild
                  while inputSource != None:
                    if inputSource.nodeType == inputSource.ELEMENT_NODE and inputSource.tagName == "source":
                      # If it's a match, get either float input data or the interpolation type.
                      if (inputSource.getAttribute("id")) == inputSourceName[1:]:
                        if inputSemantic == "INTERPOLATION":
                          self.GetAnimInterpolation(inputSource, jointName, channelTarget)
                        else:
                          data = self.GetFloatData(inputSource)
                          if inputSemantic == "IN_TANGENT" or inputSemantic == "OUT_TANGENT":
                            channelSplit = dict()
                            for key in members:
                              channelSplit[key + '.' + inputSemantic] = []
                            for i in range(len(data)):
                              channelSplit[members[(i / 2) % len(members)] + '.' + inputSemantic].append(data[i])
                            for key in members:
                              if not key in self.joints[jointName].attributes[channelTarget].curveData:
                                self.joints[jointName].attributes[channelTarget].curveData[key] = CurveData()
                              if inputSemantic == "IN_TANGENT":
                                setattr(self.joints[jointName].attributes[channelTarget].curveData[key], 'intan', channelSplit[key + '.' + inputSemantic])
                              else:
                                setattr(self.joints[jointName].attributes[channelTarget].curveData[key], 'outtan', channelSplit[key + '.' + inputSemantic])                               
                          elif inputSemantic == "INPUT":
                            setattr(self.joints[jointName].attributes[channelTarget], 'time', data)
                          elif inputSemantic == "POSITION" or inputSemantic == "OUTPUT":
                            channelSplit = dict()
                            for key in members:
                              channelSplit[key] = []
                            for i in range(len(data)):
                              channelSplit[members[i % len(members)]].append(data[i])
                            for key in members:
                              if not key in self.joints[jointName].attributes[channelTarget].curveData:
                                self.joints[jointName].attributes[channelTarget].curveData[key] = CurveData()
                              setattr(self.joints[jointName].attributes[channelTarget].curveData[key], 'pos', channelSplit[key])
                        break
                    inputSource = inputSource.nextSibling
                inputItem = inputItem.nextSibling
              break
          channelSampler = channelSampler.nextSibling
      channel = channel.nextSibling

      
  # Optimize an animation by calling optimize on all the joints and then removing any
  # joint that has no animated attributes.
  def Optimize(self):
    for j in self.joints.keys():
      self.joints[j].Optimize()
      if len(self.joints[j].attributes) == 0:
        del(self.joints[j])

  # Write the anim as a JSON file.
  def Write(self, fName):
    print('Writing animation "' + fName + '" with ' + str(len(self.joints)) + ' joints.')
    fileHandle = open(fName, 'w')
    fileHandle.write('{\n')
    first = True
    for m in self.joints:
      if not first:
        fileHandle.write(',')
      fileHandle.write('\n')
      first = False
      self.joints[m].Write(fileHandle)
    fileHandle.write('\n}')
    fileHandle.close()

  # Pull a float_array
  def GetFloatData(self, source):
    #print(channelTarget + " " + semantic)
    accessor = source.getElementsByTagName("technique_common")[0].getElementsByTagName("accessor")[0];
    accessorSource = accessor.getAttribute("source")
    the_array = source.firstChild
    while the_array != None:
      if the_array.nodeType == the_array.ELEMENT_NODE and the_array.tagName == "float_array":
        if the_array.getAttribute("id") == accessorSource[1:]:
          arr = the_array.firstChild.data
          arr = arr.strip();
          arr = arr.replace('\n', ' ')
          data = [str(s) for s in arr.split(' ')]
          return data
      the_array = the_array.nextSibling
    return []


  def GetAnimInterpolation(self, source, jointName, channelTarget):
    the_array = source.getElementsByTagName("Name_array")[0];
    arr = the_array.firstChild.data
    arr = arr.strip();
    arr = arr.replace('\n', ' ')
    data = [str(s) for s in arr.split(' ')]   
    for d in data:
      if d != data[0]:
        print("Animatied attribute has multiple interpolation types!")
        return
    self.joints[jointName].attributes[channelTarget].type = data[0]
