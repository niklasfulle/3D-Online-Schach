from pathlib import Path
import math

import bpy


OUTPUT_DIR = Path(__file__).resolve().parents[2] / "apps" / "client" / "public" / "models" / "chess"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def finish_object(obj, bevel=0.025):
    if obj.type != "MESH":
        return obj
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    if bevel:
        modifier = obj.modifiers.new(name="Soft edges", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def cylinder(name, radius, depth, z, vertices=32, bevel=0.02):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(0, 0, z))
    obj = bpy.context.object
    obj.name = name
    return finish_object(obj, bevel)


def cone(name, radius1, radius2, depth, z, vertices=32, bevel=0.02):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=(0, 0, z),
    )
    obj = bpy.context.object
    obj.name = name
    return finish_object(obj, bevel)


def sphere(name, radius, z, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=radius, location=(0, 0, z))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_object(obj, 0.015)


def cube(name, scale, location, rotation=(0, 0, 0), bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_object(obj, bevel)


def torus(name, major_radius, minor_radius, z):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=32,
        minor_segments=10,
        location=(0, 0, z),
    )
    obj = bpy.context.object
    obj.name = name
    return finish_object(obj, 0.012)


def add_base():
    cylinder("base", 0.36, 0.10, 0.05)
    cylinder("base_ring", 0.31, 0.09, 0.145)
    cone("base_shoulder", 0.29, 0.22, 0.16, 0.27)


def build_pawn():
    add_base()
    cone("pawn_body", 0.20, 0.12, 0.28, 0.48)
    cylinder("pawn_collar", 0.15, 0.055, 0.64)
    sphere("pawn_head", 0.18, 0.79)


def build_rook():
    add_base()
    cone("rook_body", 0.21, 0.18, 0.38, 0.54)
    cylinder("rook_neck", 0.23, 0.08, 0.75)
    cylinder("rook_crown", 0.29, 0.12, 0.84, vertices=24)
    for index in range(6):
        angle = index * math.tau / 6
        cube(
            f"rook_merlon_{index}",
            (0.075, 0.075, 0.075),
            (math.cos(angle) * 0.22, math.sin(angle) * 0.22, 0.96),
            rotation=(0, 0, angle),
            bevel=0.012,
        )


def build_bishop():
    add_base()
    cone("bishop_body", 0.21, 0.105, 0.42, 0.56)
    torus("bishop_collar", 0.135, 0.035, 0.77)
    sphere("bishop_mitre", 0.18, 0.91, scale=(0.82, 0.82, 1.18))
    cone("bishop_tip", 0.08, 0.0, 0.18, 1.13)


def build_knight():
    add_base()
    cone("knight_body", 0.22, 0.14, 0.30, 0.50)
    cube(
        "knight_neck",
        (0.14, 0.12, 0.31),
        (0, -0.05, 0.73),
        rotation=(math.radians(-22), 0, 0),
        bevel=0.055,
    )
    sphere("knight_head", 0.20, 0.97, scale=(0.9, 1.2, 0.9))
    cube(
        "knight_muzzle",
        (0.13, 0.22, 0.10),
        (0, -0.22, 0.92),
        rotation=(math.radians(-10), 0, 0),
        bevel=0.045,
    )
    for x in (-0.08, 0.08):
        cone(f"knight_ear_{x}", 0.045, 0.0, 0.17, 1.17, vertices=16).location.x = x


def build_queen():
    add_base()
    cone("queen_body", 0.22, 0.105, 0.48, 0.59)
    torus("queen_collar", 0.16, 0.038, 0.84)
    cone("queen_crown", 0.19, 0.24, 0.20, 0.96)
    for index in range(8):
        angle = index * math.tau / 8
        sphere(
            f"queen_point_{index}",
            0.052,
            1.12,
            scale=(0.9, 0.9, 1.25),
        ).location.xy = (math.cos(angle) * 0.18, math.sin(angle) * 0.18)
    sphere("queen_finial", 0.075, 1.19)


def build_king():
    add_base()
    cone("king_body", 0.22, 0.11, 0.52, 0.61)
    torus("king_collar", 0.17, 0.04, 0.89)
    sphere("king_head", 0.13, 1.02)
    cube("king_cross_vertical", (0.045, 0.045, 0.18), (0, 0, 1.25), bevel=0.012)
    cube("king_cross_horizontal", (0.13, 0.045, 0.045), (0, 0, 1.27), bevel=0.012)


def export_piece(name, builder):
    clear_scene()
    builder()
    for obj in bpy.context.scene.objects:
        obj.select_set(obj.type == "MESH")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_DIR / f"{name}.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )


for piece_name, piece_builder in {
    "pawn": build_pawn,
    "rook": build_rook,
    "knight": build_knight,
    "bishop": build_bishop,
    "queen": build_queen,
    "king": build_king,
}.items():
    export_piece(piece_name, piece_builder)

print(f"Exported chess models to {OUTPUT_DIR}")
