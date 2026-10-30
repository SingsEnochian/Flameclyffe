"""Wayglass architectural blockout. Run with Blender in background mode.

This is a first spatial study, not approved canon or a finished production model.
"""
import bpy
import math
import json
import hashlib
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
import sys
sys.path.insert(0, ROOT)
from layout_audit import audit, PROPOSED
OUT = os.path.join(ROOT, "output")
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != bpy.context.scene.collection.name and c.users == 0:
        bpy.data.collections.remove(c)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
# CPU Cycles provides a predictable fallback for headless Windows sessions.
scene.cycles.samples = 16
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 960, 600, 100
scene.world.color = (0.025, 0.035, 0.055)

def collection(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c

COL = {n: collection(n) for n in ('Hull', 'Structure', 'Core', 'Decks', 'Rooms', 'Cameras', 'Lighting')}
def move(obj, group):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    COL[group].objects.link(obj)
    return obj
def material(name, color, metallic=0.0, roughness=0.35, emission=0.0):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1)
    m.use_nodes = True; p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic; p.inputs['Roughness'].default_value = roughness
    if emission:
        p.inputs['Emission Color'].default_value = (*color, 1); p.inputs['Emission Strength'].default_value = emission
    return m
pearl = material('Pearl #F4F3EA', (.91,.90,.82), .28, .32)
copper = material('Copper #B77844', (.48,.23,.095), .75, .27)
glass = material('Labradorite #172738', (.025,.065,.09), .45, .22)
signal = material('Signal #6DE5DE', (.16,.8,.75), .1, .25, 2)
floor = material('Deck pearl', (.28,.34,.35), .2, .5)
def finish(obj, name, group, mat):
    obj.name = name; move(obj, group); obj.data.materials.append(mat); return obj
def cube(name, center, size, group, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center); o=bpy.context.object
    o.dimensions=size; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o,name,group,mat)
def curve(name, points, radius, group, mat, cyclic=False):
    d=bpy.data.curves.new(name,'CURVE'); d.dimensions='3D'; d.resolution_u=12; d.bevel_depth=radius; d.bevel_resolution=3
    s=d.splines.new('POLY'); s.points.add(len(points)-1)
    for p, co in zip(s.points, points): p.co=(*co,1)
    s.use_cyclic_u=cyclic
    o=bpy.data.objects.new(name,d); COL[group].objects.link(o); d.materials.append(mat); return o

# X is bow-forward, Y port, Z up; meters. A closed faceted envelope around the deck.
sections=[(-80,1,1),(-72,9,6),(-55,16,10),(-30,20,12),(0,21,13),(30,18,11),(58,12,8),(80,1,1)]
vertices=[]; count=16
for x,w,h in sections:
    for j in range(count):
        a=2*math.pi*j/count; vertices.append((x,w*math.cos(a),h*math.sin(a)))
faces=[]
for i in range(len(sections)-1):
    for j in range(count): faces.append((i*count+j,i*count+(j+1)%count,(i+1)*count+(j+1)%count,(i+1)*count+j))
faces.extend([tuple(reversed(range(count))), tuple((len(sections)-1)*count+j for j in range(count))])
mesh=bpy.data.meshes.new('Hull envelope mesh'); mesh.from_pydata(vertices,[],faces); mesh.update()
hull=bpy.data.objects.new('Hull envelope',mesh); COL['Hull'].objects.link(hull); hull.data.materials.append(pearl)
for x,w,h in sections[1:-1]:
    curve('Copper transverse rib',[(x,w*math.cos(a),h*math.sin(a)) for a in [2*math.pi*i/64 for i in range(64)]],.22,'Structure',copper,True)
for side in (-1,1):
    curve('Longitudinal rail',[(x,side*w*.94,h*.15) for x,w,h in sections],.18,'Structure',signal)
for offset,phase in [(-3,0),(5,.4)]:
    pts=[]
    for i in range(101):
        a=2*math.pi*i/100; pts.append((offset+7*math.sin(a+phase),23*math.cos(a),15*math.sin(a)))
    curve('Offset core arc',pts,.3,'Structure',copper)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=3.3, location=(0,0,7.8))
finish(bpy.context.object,'Observer core','Core',signal)
cube('Main deck', (0,0,-4.1), (92,24,.4),'Decks',floor)
cube('Corridor guide light',(0,0,-3.85),(88,.12,.04),'Decks',signal)
rooms=[('Living Observer',-33,1),('Nikola Research',-11,1),('ArcSweep Writing Room',11,1),('Universal Codex Library',33,1),('Atelier',-33,-1),('Crew Commons',-11,-1),('Dreaming Toybox',11,-1),('Return',33,-1)]
for name,x,side in rooms:
    y=side*7.0
    # Door is a 3 m opening facing a continuous 4 m central corridor.
    for yy in (y-side*5.1,y+side*5.1):
        if abs(yy)<3:
            for dx in (-6.125,6.125): cube(name+' door wall',(x+dx,yy,-.8),(9.25,.2,6.4),'Rooms',glass)
        else: cube(name+' outer wall',(x,yy,-.8),(21.5,.2,6.4),'Rooms',glass)
    for xx in (x-10.75,x+10.75): cube(name+' end wall',(xx,y,-.8),(.2,10.2,6.4),'Rooms',glass)
    cube(name+' threshold',(x,side*1.9,-3.9),(3,.25,.1),'Rooms',signal)
    marker=cube(name+' marker',(x,y,-3.85),(2,2,.12),'Rooms',copper); marker['room']=name
    if name=='ArcSweep Writing Room': cube('Dabble export reader blockout',(x,y+side*3,-2.9),(3,1,2),'Rooms',pearl)

def camera(name, loc, target, ortho=None):
    d=bpy.data.cameras.new(name); o=bpy.data.objects.new(name,d); COL['Cameras'].objects.link(o); o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    if ortho: d.type='ORTHO'; d.ortho_scale=ortho
    else: d.lens=35
    return o
cams={}
for name,loc,target,scale in [
 ('hero',(130,-160,100),(0,0,0),None),('port',(0,170,0),(0,0,0),180),('starboard',(0,-170,0),(0,0,0),180),
 ('dorsal',(0,0,190),(0,0,0),180),('ventral',(0,0,-190),(0,0,0),180),('bow',(190,0,0),(0,0,0),65),('aft',(-190,0,0),(0,0,0),65),
 ('cutaway',(100,-125,130),(0,0,-2),180),('deck_plan',(0,0,120),(0,0,-3),150)]: cams[name]=camera(name,loc,target,scale)
for name,x,side in rooms:
    cams['interior_'+name]=camera('interior_'+name,(x-8,side*4,-1.5),(x+3,side*8,-1),None)
def light(name,location,power,size):
    d=bpy.data.lights.new(name,'AREA'); d.energy=power; d.shape='DISK'; d.size=size
    o=bpy.data.objects.new(name,d); COL['Lighting'].objects.link(o); o.location=location; o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
light('Key',(25,-60,100),180000,80); light('Fill',(-60,45,55),120000,70)
scene.camera=cams['hero']
assert all(COL[n].objects for n in COL)
assert all(o.dimensions.length > 0 for o in COL['Rooms'].objects if o.type=='MESH')
# Coarse tapered-hull feasibility check; still not exact Blender mesh clearance.
feasibility = audit(sections, rooms, PROPOSED['room'], PROPOSED['deck'], PROPOSED['corridor'], PROPOSED['core'])
assert feasibility['passes_coarse_geometry'], feasibility
blend=os.path.join(OUT,'wayglass-master.blend'); bpy.ops.wm.save_as_mainfile(filepath=blend)
manifest={'status':'architectural blockout, proposed, not visual signoff','generator_sha256':hashlib.sha256(open(__file__,'rb').read()).hexdigest(),'coordinate_frame':'meters; +X bow, +Y port, +Z up', 'sources':['Issue #507','PR #506 proposed visual canon','WAYGLASS_N017_INTEGRATED_SHIP.md'], 'materials':['Pearl #F4F3EA','Copper #B77844','Labradorite #172738','Signal #6DE5DE'], 'images':[]}
for key in ('hero','cutaway','interior_ArcSweep Writing Room'):
    scene.camera=cams[key]; COL['Hull'].hide_render=(key!='hero'); COL['Structure'].hide_render=(key.startswith('interior'))
    filename=key.replace(' ','_')+'.png'; scene.render.filepath=os.path.join(OUT,filename)
    bpy.ops.render.render(write_still=True)
    manifest['images'].append({'file':filename,'camera':key,'room':'ArcSweep Writing Room' if key.startswith('interior') else None,'status':'rendered'})
COL['Hull'].hide_render=False; COL['Structure'].hide_render=False
for key in cams:
    if key not in ('hero','cutaway','interior_ArcSweep Writing Room'): manifest['images'].append({'file':None,'camera':key,'status':'planned'})
bpy.ops.object.select_all(action='DESELECT')
for group in ('Hull','Structure','Core','Decks','Rooms'):
    for o in COL[group].objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'wayglass-blockout.glb'),export_format='GLB',use_selection=True)
assert os.path.getsize(os.path.join(OUT,'wayglass-blockout.glb'))>0
with open(os.path.join(OUT,'atlas.json'),'w',encoding='utf8') as f: json.dump(manifest,f,indent=2)
print('WAYGLASS_BUILD_OK',OUT)
