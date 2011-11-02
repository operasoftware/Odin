import json
import sys
import os
import re

folder = './json/character'
jsons = []

# Read and parse the json files, storing them in a list.
dirList = os.listdir(folder);
for dae in dirList:
  if dae[0] == '.' or re.search('-fx', dae) != None:
    continue
  print('Reading file ' + dae)
  f = open(folder + '/' + dae, 'r')
  s = f.read();
  f.close()
  jsons.append(json.loads(s))

# For each of the jsons
for j in jsons:
  # except the first one which we'll merge into.
  if j == jsons[0]:
    continue
  # Append the indices, but increase them with the number of vertices in the merged one.
  l = len(jsons[0]['vertexPositions'][0]) / 3
  for i in j['indices']:
    jsons[0]['indices'].append(i + l)

  # Build a joint remap table.
  jointRemap = []
  ji = 0
  for joint in j['jointNames']:
    found = False
    index = 0
    for jn in jsons[0]['jointNames']:
      if jn == joint:
        found = True
        jointRemap.append(index)
        # This just assumes all skins have the same inverse bind transform for the bone in question.
        break
      index = index + 1
      if found:
        break
    if not found:
      jointRemap.append(len(jsons[0]['jointNames']))
      jsons[0]['jointNames'].append(joint)
      for x in range(ji * 16, (ji + 1) * 16):
        jsons[0]['invBindMatrices'].append(j['invBindMatrices'][x])
    ji = ji + 1

  # Append all the joint indices, but use the remap table.
  for i in j['jointIndices']:
    jsons[0]['jointIndices'].append(jointRemap[i])

  # Append all the data that isn't affected by the merge.
  jsons[0]['vertexWeights'] = jsons[0]['vertexWeights'] + j['vertexWeights']
  jsons[0]['vertexNormals'][0] = jsons[0]['vertexNormals'][0] + j['vertexNormals'][0]
  jsons[0]['vertexTextureCoords'][0] = jsons[0]['vertexTextureCoords'][0] + j['vertexTextureCoords'][0]
  jsons[0]['vertexPositions'][0] = jsons[0]['vertexPositions'][0] + j['vertexPositions'][0]

# Write out the merged json.
f = open('./json/character/merged.json', 'w')
f.write(json.dumps(jsons[0]))
f.close()
