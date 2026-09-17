import * as THREE from '../../vendor/three.module.js';

export function fractureGeometry(coreGeometry, count = 24) {
  // Partition the actual outside into angular cells, then close the cut edges
  // toward the core centre. Initial matrices reconstruct the source exactly.
  // All pieces share one draw; their rigid matrices move in the vertex shader.
  const fallback = !coreGeometry, source = coreGeometry || new THREE.IcosahedronGeometry(1, 35);
  const attribute = source.getAttribute('position'), sourceColor = source.getAttribute('color'), index = source.index;
  const bounds = new THREE.Box3().setFromBufferAttribute(attribute), centre = bounds.getCenter(new THREE.Vector3());
  const directions = [], cells = Array.from({ length: count }, () => []), centroids = Array.from({ length: count }, () => new THREE.Vector3());
  const edges = new Map(), vertices = [], triangles = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + .5) / count, r = Math.sqrt(1 - y * y), a = i * 2.399963;
    directions.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  for (let i = 0; i < attribute.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(attribute, i);
    if (fallback) { const d = p.clone().normalize(); p.multiplyScalar(.9 + .08 * Math.sin(d.x * 7 + d.z * 3) + .04 * Math.sin(d.y * 11 - d.z * 5)); }
    vertices.push(p);
  }
  const key = p => `${Math.round(p.x * 1e5)},${Math.round(p.y * 1e5)},${Math.round(p.z * 1e5)}`;
  const ids = vertices.map(key), direction = new THREE.Vector3();
  for (let i = 0; i < (index?.count || attribute.count); i += 3) {
    const ids3 = [0, 1, 2].map(j => index ? index.getX(i + j) : i + j);
    direction.copy(vertices[ids3[0]]).add(vertices[ids3[1]]).add(vertices[ids3[2]]).multiplyScalar(1 / 3).sub(centre).normalize();
    let cell = 0, best = -Infinity;
    for (let j = 0; j < count; j++) { const score = direction.dot(directions[j]); if (score > best) { best = score; cell = j; } }
    const triangle = { ids: ids3, cell }; triangles.push(triangle); cells[cell].push(triangle);
    for (let e = 0; e < 3; e++) {
      const a = ids3[e], b = ids3[(e + 1) % 3], ka = ids[a], kb = ids[b], edgeKey = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      if (!edges.has(edgeKey)) edges.set(edgeKey, []); edges.get(edgeKey).push({ a, b, cell });
    }
  }
  const sourceUV=source.getAttribute('uv');
  const positions = [], colors = [], uvs = [], pieceIds = [], perPiece = new Uint32Array(count);
  function face(a, b, c, cell, inside, indices) {
    for (const [i, p] of [a, b, c].entries()) {
      positions.push(p.x, p.y, p.z);
      if(!inside && sourceUV)uvs.push(sourceUV.getX(indices[i]),sourceUV.getY(indices[i]));else uvs.push(p.x*.35,p.z*.35);
      pieceIds.push(cell);
      if (!inside && sourceColor) { const j = indices[i]; colors.push(sourceColor.getX(j), sourceColor.getY(j), sourceColor.getZ(j)); }
      else { const shade = inside ? .67 + (cell % 5) * .035 : .95; colors.push(shade, shade * .985, shade * .96); }
    }
    perPiece[cell]++;
  }
  for (const triangle of triangles) {
    const p = triangle.ids.map(i => vertices[i]); face(...p, triangle.cell, false, triangle.ids);
    for (const point of p) centroids[triangle.cell].add(point);
  }
  for (const edge of edges.values()) for (const side of edge) {
    if (edge.length === 1 || edge.some(other => other.cell !== side.cell)) face(vertices[side.b], vertices[side.a], centre, side.cell, true);
  }
  for (let i = 0; i < count; i++) {
    centroids[i].multiplyScalar(1 / Math.max(1, cells[i].length * 3)).lerp(centre, .27);
    directions[i].copy(centroids[i]).sub(centre).normalize();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('fractureId', new THREE.Float32BufferAttribute(pieceIds, 1));
  geometry.computeVertexNormals();
  if (fallback) source.dispose();
  return { geometry, centroids, directions, perPiece, fallback };
}

// Source geometry is prepared once, reused for repeated hits, and released at disposal.
export function createDestruction(scene, { maxSourceTriangles = Infinity } = {}) {
  const templates=new Map(),active=[];
  const root=new THREE.Group();root.name='closed-mineral-fractures';scene.add(root);
  function body(record){let largest=null;record.object.userData.body.traverse(o=>{if(o.isMesh&&(!largest||o.geometry.attributes.position.count>largest.geometry.attributes.position.count))largest=o;});return largest;}
  function prepare(record){const mesh=body(record);if(!mesh)return null;
    // Mobile derivatives fit this budget. If a future asset exceeds it, the
    // existing particle burst still plays without a full-mesh CPU allocation.
    const geometry = mesh.userData.fractureGeometry || mesh.geometry;
    if((geometry.index?.count || geometry.attributes.position.count)/3 > maxSourceTriangles)return null;
    if(!templates.has(geometry))templates.set(geometry,fractureGeometry(geometry));return templates.get(geometry);}
  function burst(record,time){
    const original=body(record),source=prepare(record);if(!original||!source)return;
    original.updateWorldMatrix(true,false);
    const material=original.material.clone();material.transparent=true;material.depthWrite=false;material.vertexColors=true;
    const matrices=source.centroids.map(()=>new THREE.Matrix4());
    const prior=original.material.onBeforeCompile,priorKey=original.material.customProgramCacheKey();
    material.onBeforeCompile=(shader,renderer)=>{
      prior.call(material,shader,renderer);shader.uniforms.fractureMatrices={value:matrices};
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nattribute float fractureId; uniform mat4 fractureMatrices[${matrices.length}];`)
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=mat3(fractureMatrices[int(fractureId)])*objectNormal;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=(fractureMatrices[int(fractureId)]*vec4(transformed,1.)).xyz;');
    };
    material.customProgramCacheKey=()=>priorKey+'closed-fracture24';
    const mesh=new THREE.Mesh(source.geometry,material);mesh.name='fractured-'+record.id;mesh.matrixAutoUpdate=false;mesh.matrix.copy(original.matrixWorld);mesh.frustumCulled=false;root.add(mesh);
    active.push({mesh,material,source,matrices,start:time,radius:record.radius});
  }
  const translate=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),matrix=new THREE.Matrix4(),pivot=new THREE.Matrix4();
  function update(time){for(let n=active.length-1;n>=0;n--){const event=active[n],age=Math.max(0,time-event.start);
    if(age>3.6){root.remove(event.mesh);event.material.dispose();active.splice(n,1);continue;}
    event.material.opacity=Math.min(1,(3.6-age)/1.3);
    const travel=Math.min(age,.22)*.24+Math.max(0,age-.22);
    event.source.centroids.forEach((p,i)=>{const d=event.source.directions[i];translate.copy(p).addScaledVector(d,travel*(.48+(i%5)*.15));rotation.setFromAxisAngle(d,travel*((i%3)-1)*.9);matrix.compose(translate,rotation,scale);pivot.makeTranslation(-p.x,-p.y,-p.z);event.matrices[i].multiplyMatrices(matrix,pivot);});
  }}
  return {prepare,burst,update,dispose(){for(const event of active)event.material.dispose();for(const f of templates.values())f.geometry.dispose();root.removeFromParent();templates.clear();active.length=0;}};
}
