"""Non-destructive Blender exporter for the four Gravedad Zero closeout assets."""

import bpy
import hashlib
import json
import math
import os
import sys


def digest(path):
    value = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def add_anchor(name, location, parent=None):
    anchor = bpy.data.objects.new(name, None)
    anchor.empty_display_type = "ARROWS"
    anchor.empty_display_size = 0.12
    anchor.location = location
    bpy.context.scene.collection.objects.link(anchor)
    if parent:
        anchor.parent = parent
    return anchor


def rename_sources(asset_id):
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    for index, obj in enumerate(meshes):
        obj.name = f"{asset_id}-mesh-{index:02d}"
        obj.data.name = f"{asset_id}-geometry-{index:02d}"
    for index, material in enumerate(bpy.data.materials):
        material.name = f"{asset_id}-material-{index:02d}"
    for index, image in enumerate(bpy.data.images):
        image.name = f"{asset_id}-texture-{index:02d}"
    return meshes


def build_ally(meshes):
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    rig = bpy.context.object
    rig.name = "green-ally-rig"
    edit = rig.data.edit_bones
    root = edit[0]
    root.name = "root"
    root.head = (0, 0, -0.92)
    root.tail = (0, 0, -0.1)
    bones = {
        "spine": ((0, 0, -0.1), (0, 0, 0.55), "root"),
        "head": ((0, 0, 0.55), (0, 0, 0.92), "spine"),
        "upper_arm.L": ((0, 0, 0.38), (0.48, 0, 0.20), "spine"),
        "forearm.L": ((0.48, 0, 0.20), (0.72, -0.08, -0.02), "upper_arm.L"),
        "upper_arm.R": ((0, 0, 0.38), (-0.48, 0, 0.20), "spine"),
        "forearm.R": ((-0.48, 0, 0.20), (-0.72, -0.08, -0.02), "upper_arm.R"),
    }
    for name, (head, tail, parent) in bones.items():
        bone = edit.new(name)
        bone.head, bone.tail = head, tail
        bone.parent = edit[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    for mesh in meshes:
        modifier = mesh.modifiers.new("green-ally-armature", "ARMATURE")
        modifier.object = rig
        mesh.parent = rig
        groups = {name: mesh.vertex_groups.new(name=name) for name in ["root", *bones]}
        for vertex in mesh.data.vertices:
            x, _, z = vertex.co
            if z > 0.55:
                groups["head"].add([vertex.index], 1.0, "REPLACE")
            elif x > 0.18 and z > -0.12:
                target = "forearm.L" if x > 0.48 else "upper_arm.L"
                groups[target].add([vertex.index], 1.0, "REPLACE")
            elif x < -0.18 and z > -0.12:
                target = "forearm.R" if x < -0.48 else "upper_arm.R"
                groups[target].add([vertex.index], 1.0, "REPLACE")
            elif z > -0.20:
                groups["spine"].add([vertex.index], 1.0, "REPLACE")
            else:
                groups["root"].add([vertex.index], 1.0, "REPLACE")
    add_anchor("weapon-grip", (0.58, -0.18, 0.02), rig)
    add_anchor("muzzle-support", (0.58, -0.78, 0.02), rig)
    add_anchor("formation-anchor", (0, 0, 0), rig)
    clip_specs = {
        "AllyIdle": (0.0, 0.05),
        "AllyMove": (-0.12, 0.16),
        "AllyAim": (-0.34, -0.12),
        "AllyFire": (-0.46, -0.20),
        "AllyReact": (0.16, 0.32),
        "AllyNarrative": (0.28, -0.26),
    }
    for clip, (left, right) in clip_specs.items():
        rig.animation_data_clear()
        for frame, multiplier in ((1, 0.0), (16, 1.0), (32, 0.0)):
            rig.pose.bones["upper_arm.L"].rotation_mode = "XYZ"
            rig.pose.bones["upper_arm.R"].rotation_mode = "XYZ"
            rig.pose.bones["upper_arm.L"].rotation_euler.x = left * multiplier
            rig.pose.bones["upper_arm.R"].rotation_euler.x = right * multiplier
            rig.pose.bones["upper_arm.L"].keyframe_insert("rotation_euler", frame=frame)
            rig.pose.bones["upper_arm.R"].keyframe_insert("rotation_euler", frame=frame)
        if rig.animation_data and rig.animation_data.action:
            rig.animation_data.action.name = clip
    return rig


def build_turret(meshes):
    root = add_anchor("turret-mount", (0, 0, -0.55))
    yaw = add_anchor("turret-yaw", (0, 0, -0.20), root)
    pitch = add_anchor("turret-pitch", (0, 0, 0.10), yaw)
    for mesh in meshes:
        mesh.parent = pitch
    add_anchor("turret-muzzle", (0, -0.88, 0.08), pitch)
    add_anchor("turret-clearance", (0, 0, 0.12), root)


def build_cell(meshes):
    root = add_anchor("energy-cell-root", (0, 0, 0))
    for mesh in meshes:
        mesh.parent = root
    add_anchor("energy-emitter", (0, 0, 0.82), root)
    add_anchor("inventory-grip", (0, 0, 0), root)


def build_hangar(meshes):
    root = add_anchor("hangar-root", (0, 0, 0))
    for mesh in meshes:
        mesh.parent = root
    add_anchor("service-long-ship", (0, 0, 0.16), root)
    add_anchor("service-bike", (-0.68, 0.18, 0.06), root)
    add_anchor("service-crew", (0.68, 0.18, 0.06), root)
    add_anchor("inspection-camera", (0, -2.8, 1.15), root)


def update_manifest(destination, record):
    manifest_path = os.path.join(destination, "manifest.json")
    manifest = {"version": 1, "description": "Canonical closeout runtime assets exported from preserved Blender sources.", "assets": []}
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as handle:
            manifest = json.load(handle)
    manifest["assets"] = [asset for asset in manifest["assets"] if asset["id"] != record["id"]]
    manifest["assets"].append(record)
    order = {name: index for index, name in enumerate(["green-ally", "energy-cell", "modular-turret", "orbital-service-bay"])}
    manifest["assets"].sort(key=lambda asset: order[asset["id"]])
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


source, asset_id, output = sys.argv[sys.argv.index("--") + 1:sys.argv.index("--") + 4]
destination = os.path.dirname(output)
os.makedirs(destination, exist_ok=True)
meshes = rename_sources(asset_id)
if asset_id == "green-ally":
    build_ally(meshes)
elif asset_id == "energy-cell":
    build_cell(meshes)
elif asset_id == "modular-turret":
    build_turret(meshes)
elif asset_id == "orbital-service-bay":
    build_hangar(meshes)
else:
    raise ValueError(f"Unsupported asset id: {asset_id}")
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 32
bpy.ops.export_scene.gltf(
    filepath=output,
    export_format="GLB",
    export_apply=True,
    export_animations=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
)
triangles = sum(sum(len(poly.vertices) - 2 for poly in mesh.data.polygons) for mesh in meshes)
texture_sizes = sorted([list(image.size) for image in bpy.data.images if image.size[0] and image.size[1]])
dimensions = [0.0, 0.0, 0.0]
for mesh in meshes:
    dimensions = [max(dimensions[index], float(mesh.dimensions[index])) for index in range(3)]
record = {
    "id": asset_id,
    "file": os.path.basename(output),
    "source": os.path.basename(source),
    "sourceSha256": digest(source),
    "sha256": digest(output),
    "bytes": os.path.getsize(output),
    "dimensions": [round(value, 5) for value in dimensions],
    "meshes": len(meshes),
    "triangles": triangles,
    "materials": len(bpy.data.materials),
    "textureSizes": texture_sizes,
    "armatures": len(bpy.data.armatures),
    "clips": sorted(action.name for action in bpy.data.actions),
}
update_manifest(destination, record)
print("GZ_CLOSEOUT=" + json.dumps(record, ensure_ascii=False))
