"""Coarse Wayglass hull/room/core feasibility audit. Blender not required.

Run: python assets/wayglass/blender/layout_audit.py [build_wayglass.py]
Reads literal source geometry; never edits .blend files or launches Blender.
NOT an exact mesh collision test or verified walkable-space simulation.
"""
from __future__ import annotations
import ast
import json
import sys
from pathlib import Path

# Dimensions transcribed from the initial #508 build script, in metres.
# The AST reads room centers and hull stations from the chosen script.
CURRENT_ROOM = {'half_length': 13.0, 'side_min': 2.0,
                'side_max': 13.0, 'z_min': -4.0, 'z_max': 2.4}
CURRENT_CORRIDOR = {'minimum': (-54, -2, -3.95),
                    'maximum': (54, 2, 2.4)}

# Feasibility proposal only! Blender geometry has NOT been modified.
PROPOSED = {
    'room_x': [-33, -11, 11, 33],
    'room': {'half_length': 10.85, 'side_min': 1.8,
             'side_max': 12.2, 'z_min': -4.0, 'z_max': 2.4},
    'deck': {'center': (0, 0, -4.1), 'size': (92, 24, .4)},
    'corridor': {'minimum': (-44, -1.9, -3.9),
                 'maximum': (44, 1.9, 2.4)},
    'core': {'center': (0, 0, 7.8), 'radius': 3.3},
}

def literal_assignment(source, key):
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            if any(isinstance(t, ast.Name) and t.id == key for t in targets):
                return ast.literal_eval(node.value)
    raise ValueError(f'Expected literal {key!r} in generator. Audit requires updating if generator changed.')

def section_at(sections, x):
    """Interpolate elliptical section radii, matching generator's piecewise stations."""
    if x < sections[0][0] or x > sections[-1][0]:
        return None
    for (x0, w0, h0), (x1, w1, h1) in zip(sections, sections[1:]):
        if x0 <= x <= x1:
            f = (x-x0)/(x1-x0)
            return (w0 + f*(w1-w0), h0 + f*(h1-h0))
    return sections[-1][1:]

def inside(sections, x, y, z):
    radius = section_at(sections, x)
    if radius is None or min(radius) <= 0:
        return False
    w, h = radius
    return (y/w)**2 + (z/h)**2 <= 0.99

def box_corners(center, size):
    return [(center[0]+sx*size[0]/2, center[1]+sy*size[1]/2,
             center[2]+sz*size[2]/2)
            for sx in (-1,1) for sy in (-1,1) for sz in (-1,1)]

def room_corners(x, side, spec):
    return [(x+dx*spec['half_length'], side*y, z)
            for dx in (-1,1)
            for y in (spec['side_min'],spec['side_max'])
            for z in (spec['z_min'],spec['z_max'])]

def outside(sections, points):
    return [tuple(round(v,3) for v in p) for p in points
            if not inside(sections,*p)]

def sphere_box_intersection(sphere, rect):
    c, r = sphere['center'], sphere['radius']
    closest_sq = sum(max(a-v, 0, v-b)**2 for v,a,b in zip(c,rect['minimum'],rect['maximum']))
    return closest_sq < r*r

def audit(sections, rooms, room, deck, corridor, core):
    rooms_out = {}
    for name,x,side in rooms:
        bad = outside(sections,room_corners(x,side,room))
        if bad: rooms_out[name] = bad
    deck_out = outside(sections,box_corners(deck['center'],deck['size']))
    obstructed = sphere_box_intersection(core,corridor)
    return {
      'room_corners_outside_hull':rooms_out,
      'deck_corners_outside_hull':deck_out,
      'core_obstructs_corridor':obstructed,
      'passes_coarse_geometry':not rooms_out and not deck_out and not obstructed,
    }

def evaluate_source(source):
    sections = literal_assignment(source,'sections')
    rooms = literal_assignment(source,'rooms')
    coords = [rooms[i][1] for i in range(4)]
    is_proposed = coords == PROPOSED['room_x']
    if not is_proposed and coords != [-39,-13,13,39]:
        raise ValueError('Unrecognized room grid; update audit dimensions before trusting result.')
    active = audit(sections,rooms,PROPOSED['room'] if is_proposed else CURRENT_ROOM,
                   PROPOSED['deck'] if is_proposed else {'center':(0,0,-4.2),'size':(112,27,.4)},
                   PROPOSED['corridor'] if is_proposed else CURRENT_CORRIDOR,
                   PROPOSED['core'] if is_proposed else {'center':(0,0,3),'radius':5})
    repositioned = [(name,PROPOSED['room_x'][i%4],side)
                    for i,(name,_x,side) in enumerate(rooms)]
    proposed = audit(sections,repositioned,PROPOSED['room'],
                     PROPOSED['deck'],PROPOSED['corridor'],PROPOSED['core'])
    return {'type':'blender_free_feasibility_audit',
            'active_layout_version':'proposed_v2' if is_proposed else 'original_v1',
            'active_script_layout':active,
            'v2_feasibility_reference':proposed,
            'proposal_meters':PROPOSED,
            'limitations':[
              'Room volumes are inferred from original hardcoded wall extents.',
              'Conservative elliptical-envelope approximation, not Blender mesh collision.',
              'Does not prove interior door openings, path clearance, accessibility or deck links.',
              'Proposed positions require geometry changes and render inspection.',
              'No visual signoff, Blender render, GLB validation or functional integration claimed.']}

def self_test():
    stations=[(-80,1,1),(-72,9,6),(-55,16,10),(-30,20,12),
              (0,21,13),(30,18,11),(58,12,8),(80,1,1)]
    names=['Living Observer','Nikola Research','ArcSweep Writing Room',
           'Universal Codex Library','Atelier','Crew Commons','Dreaming Toybox','Return']
    rooms=[(name,[-39,-13,13,39][i%4],1 if i<4 else -1)
           for i,name in enumerate(names)]
    first=audit(stations,rooms,CURRENT_ROOM,
        {'center':(0,0,-4.2),'size':(112,27,.4)},
        CURRENT_CORRIDOR, {'center':(0,0,3),'radius':5})
    assert not first['passes_coarse_geometry'] and first['core_obstructs_corridor']
    assert first['deck_corners_outside_hull']
    shifted=[(name,PROPOSED['room_x'][i%4],side)
             for i,(name,_x,side) in enumerate(rooms)]
    alternative=audit(stations,shifted,PROPOSED['room'],PROPOSED['deck'],
                      PROPOSED['corridor'],PROPOSED['core'])
    assert alternative['passes_coarse_geometry'],alternative
    example='sections='+repr(stations)+'\nrooms='+repr(rooms)+'\n'
    checked=evaluate_source(example)
    assert checked['active_script_layout']==first
    assert checked['v2_feasibility_reference']==alternative
    assert checked['active_layout_version']=='original_v1'
    assert not sphere_box_intersection({'center':(0,0,20),'radius':1},CURRENT_CORRIDOR)
    print('WAYGLASS_LAYOUT_AUDIT_TEST_OK')

if __name__=='__main__':
    self_test()
    if len(sys.argv)>1:
        report=evaluate_source(Path(sys.argv[1]).read_text(encoding='utf-8'))
        print(json.dumps(report,indent=2))
