"""Construye la maqueta 3D de Cali en Blender y la exporta a GLB para la app.

Entrada: prototipo/datos/procesados/ciudad3d/ciudad.json (prototipo/scripts/ciudad3d.py).
Salida: prototipo/datos/procesados/ciudad3d/cali_sin_comprimir.glb → (Draco) maqueta3d/public/ciudad/cali.glb.
Uso: blender -b --python maqueta3d/scripts/blender/ciudad.py
     (o por MCP: exec(open(RUTA).read())).
Ejes: Blender x = este, y = norte, z = altura; el GLB queda en Y arriba
(three: x = este, y = altura, z = -norte).
"""
import json
from pathlib import Path

import bmesh
import bpy

REPO = Path("/home/leonidas/hackathon-cali-2026")
DATOS = json.loads((REPO / "prototipo/datos/procesados/ciudad3d/ciudad.json").read_text())
SALIDA = REPO / "prototipo/datos/procesados/ciudad3d/cali_sin_comprimir.glb"  # luego Draco → maqueta3d/public/ciudad/cali.glb
R = DATOS["relieve"]
X0, Y0 = R["oeste_sur"]
PASO, ANCHO, ALTO, Z = R["paso"], R["ancho"], R["alto"], R["alturas"]


def altura(x, y):
    """Bilineal sobre la grilla del relieve."""
    i = min(max((x - X0) / PASO, 0), ANCHO - 1.001)
    j = min(max((y - Y0) / PASO, 0), ALTO - 1.001)
    i0, j0 = int(i), int(j)
    fx, fy = i - i0, j - j0
    z = lambda a, b: Z[b * ANCHO + a]
    return (z(i0, j0) * (1 - fx) * (1 - fy) + z(i0 + 1, j0) * fx * (1 - fy)
            + z(i0, j0 + 1) * (1 - fx) * fy + z(i0 + 1, j0 + 1) * fx * fy)


def material(nombre, color, rugosidad=0.85):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rugosidad
    return m


def objeto(nombre, bm, mat):
    vieja = bpy.data.objects.get(nombre)
    if vieja:
        bpy.data.objects.remove(vieja)
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def terreno():
    bm = bmesh.new()
    v = [bm.verts.new((X0 + i * PASO, Y0 + j * PASO, Z[j * ANCHO + i]))
         for j in range(ALTO) for i in range(ANCHO)]
    for j in range(ALTO - 1):
        for i in range(ANCHO - 1):
            a = j * ANCHO + i
            bm.faces.new((v[a], v[a + 1], v[a + 1 + ANCHO], v[a + ANCHO]))
    for f in bm.faces:
        f.smooth = True
    return objeto("Terreno", bm, material("Terreno", (0.55, 0.62, 0.45), 0.95))


def extruir(anillos, nombre, mat, alto_de, hundir=2.0):
    """Cada anillo se vuelve un prisma con base en el relieve; alto_de(item) en metros.
    UV 'indice' (u = posición del anillo en la lista) para que la app coloree cada manzana.
    Se arma con from_pydata (lineal); bmesh.ops por anillo tardaba 12 min."""
    verts, caras, indice = [], [], []
    for k, item in enumerate(anillos):
        pts = item["anillo"][:-1] if item["anillo"][0] == item["anillo"][-1] else item["anillo"]
        if len(pts) < 3:
            continue
        doble = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]))
        if doble < 0:
            pts = pts[::-1]  # antihorario visto desde arriba: la tapa mira hacia +z
        base = altura(*item.get("centro", pts[0])) - hundir
        tope = base + hundir + alto_de(item)
        n, o = len(pts), len(verts)
        verts += [(x, y, base) for x, y in pts] + [(x, y, tope) for x, y in pts]
        caras.append([o + n + i for i in range(n)])
        caras += [[o + i, o + (i + 1) % n, o + n + (i + 1) % n, o + n + i] for i in range(n)]
        indice += [k] * (n + 1)
    me = bpy.data.meshes.new(nombre)
    me.from_pydata(verts, [], caras)
    uv = me.uv_layers.new(name="indice")
    for cara, k in zip(me.polygons, indice):
        for li in cara.loop_indices:
            uv.data[li].uv = (k, 0)
    me.validate()
    me.materials.append(mat)
    vieja = bpy.data.objects.get(nombre)
    if vieja:
        bpy.data.objects.remove(vieja)
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    print(nombre, len(anillos), "prismas,", len(verts), "vértices", flush=True)
    return ob


def main():
    for nombre in ("Cube", "Light", "Camera"):
        if nombre in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[nombre])
    terreno()
    extruir(DATOS["manzanas"], "Manzanas", material("Manzanas", (0.93, 0.91, 0.87), 0.7),
            lambda m: max(m["h"], 3))
    rios = [{**r, "centro": r["anillo"][0]} for r in DATOS["rios"]]
    extruir(rios, "Rios", material("Rios", (0.25, 0.55, 0.78), 0.2), lambda r: 0.6, hundir=1)
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(SALIDA), export_format="GLB", use_selection=False,
                              export_apply=True, export_yup=True)
    print("GLB", SALIDA, round(SALIDA.stat().st_size / 1e6, 1), "MB")
    bpy.ops.wm.save_as_mainfile(filepath=str(SALIDA.with_name("cali.blend")))
    # El Blender de Ubuntu no trae Draco: comprimir aparte (44 MB → 2 MB). Cuantizar UV a 16 bits
    # conserva el índice de manzana (paso ≈ 0,2 con 14.000 manzanas; la app redondea):
    # npx @gltf-transform/cli@4 draco cali_sin_comprimir.glb cali.glb \
    #   --quantize-position 16 --quantize-texcoord 16 --quantize-normal 10


main()
