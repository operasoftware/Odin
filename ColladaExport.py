import xml.dom.minidom
import sys
sys.path.append('py')
import ColladaScene
import ColladaAnim
import os
import shutil
import re

#matchThis = '.'
matchThis = 'space-station'

outFolder = './json/'
#if os.path.exists(outFolder[:-1]):
#  shutil.rmtree(outFolder[:-1])
#os.makedirs(outFolder[:-1])

fileHandle = open(outFolder + 'index.json', 'w')
fileHandle.write('{\n  "scenes" : [\n')

numWritten = 0
dirList = os.listdir('./dae');
for dae in dirList:
  if dae[0] == '.' or re.search(matchThis, dae) == None:
    continue
  print('Reading file ' + dae)
  doc = xml.dom.minidom.parse('./dae/' + dae)

  scenes = doc.getElementsByTagName('scene');
  if len(scenes) != 1:
    print('Multiple scenes, skipping.')
    continue

  sceneInstances = scenes[0].getElementsByTagName('instance_visual_scene');
  if len(sceneInstances) != 1:
    print('Multiple scene instances, skipping.')
    continue

  visualSceneURL = sceneInstances[0].getAttribute('url')
  if visualSceneURL[0] != '#':
    print('Scene URL pointing outside of this document, skipping.')
    continue

  visualScene = None
  for vs in doc.getElementsByTagName('visual_scene'):
    if vs.getAttribute('id') == visualSceneURL[1:]:
      visualScene = vs
      break

  if visualScene == None:
    print("Couldn't find visual scene with id '" + visualSceneURL + "', skipping.")
    continue

  outFileName = dae.split('.')[0]
  outFilePath = outFolder + outFileName + '.json'

  cScene = ColladaScene.Scene(doc, visualScene, outFolder)
  cScene.Write(outFolder, outFileName);
  numWritten = numWritten + 1

  animList = ''
  for libAnims in doc.getElementsByTagName('library_animations'):
    anim = ColladaAnim.Anim(libAnims)
    anim.Write(outFolder + outFileName + '_anim.json')
    if len(animList):
      animList = animList + ', '
    animList = animList + '"' + outFolder + outFileName + '_anim.json"'
  

  if numWritten != 1:
    fileHandle.write(',\n')
  fileHandle.write('               { "name" : "' + outFilePath + '", "anims" : [' + animList + '] }')

fileHandle.write('\n             ]\n}\n')
fileHandle.close()
