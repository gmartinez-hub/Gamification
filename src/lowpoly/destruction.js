import * as THREE from '../../vendor/three.module.js';

export function fractureGeometry(coreGeometry, count = 24) {
  // Retain every source face/UV. Typed corner lists and numeric welded-edge keys
  // avoid constructing hundreds of thousands of JS triangle/edge objects.
  const fallback = !coreGeometry;
  const source = coreGeometry || new THREE.IcosahedronGeometry(1, 35);
  const attribute = source.getAttribute('position'), sourceColor = source.getAttribute('color');
  const sourceUV = source.getAttribute('uv'), index = source.index;
  const cornerCount = index?.count || attribute.count, triangleCount = cornerCount / 3;
  const bounds = new THREE.Box3().setFromBufferAttribute(attribute), centre = bounds.getCenter(new THREE.Vector3());
  const positions = new Float32Array(attribute.count * 3), weldIds = new Uint32Array(attribute.count);
  const weld = new Map(), point = new THREE.Vector3(), direction = new THREE.Vector3();
  for (let i = 0; i < attribute.count; i++) {
    point.fromBufferAttribute(attribute, i);
    if (fallback) {
      direction.copy(point).normalize();
      point.multiplyScalar(.9 + .08*Math.sin(direction.x*7+direction.z*3) + .04*Math.sin(direction.y*11-direction.z*5));
    }
    point.toArray(positions, i*3);
    const key = `${Math.round(point.x*1e5)},${Math.round(point.y*1e5)},${Math.round(point.z*1e5)}`;
    let id = weld.get(key);
    if (id === undefined) { id = weld.size; weld.set(key,id); }
    weldIds[i] = id;
  }
  const vertexCount = weld.size; weld.clear();
  const directions = [], centroids = [], facesPerCell = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const y=1-2*(i+.5)/count, r=Math.sqrt(1-y*y), a=i*2.399963;
    directions.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));
    centroids.push(new THREE.Vector3());
  }
  const cells = new Uint16Array(triangleCount), nextCorner = new Int32Array(cornerCount);
  nextCorner.fill(-1);
  const firstCorner = new Map();
  const vertexAt = corner => index ? index.getX(corner) : corner;
  for (let face=0; face<triangleCount; face++) {
    const start=face*3;
    direction.set(0,0,0);
    for(let j=0;j<3;j++) direction.add(point.fromArray(positions,vertexAt(start+j)*3));
    direction.multiplyScalar(1/3).sub(centre).normalize();
    let cell=0,best=-Infinity;
    for(let j=0;j<count;j++){const score=direction.dot(directions[j]);if(score>best){best=score;cell=j;}}
    cells[face]=cell;facesPerCell[cell]++;
    for(let j=0;j<3;j++) {
      const corner=start+j, a=vertexAt(corner), b=vertexAt(start+(j+1)%3);
      centroids[cell].add(point.fromArray(positions,a*3));
      const wa=weldIds[a],wb=weldIds[b],key=Math.min(wa,wb)*vertexCount+Math.max(wa,wb);
      const previous=firstCorner.get(key);
      if(previous!==undefined)nextCorner[corner]=previous;
      firstCorner.set(key,corner);
    }
  }
  for(let i=0;i<count;i++) {
    centroids[i].multiplyScalar(1/Math.max(1,facesPerCell[i]*3)).lerp(centre,.36);
    directions[i].copy(centroids[i]).sub(centre).normalize();
  }
  // Mark each side only when the welded edge is open or crosses a cell. Caps
  // close around the local interior of a chunk, never the common rock center.
  const caps = new Uint8Array(cornerCount); let capCount=0;
  for(const first of firstCorner.values()) {
    const cell=cells[Math.floor(first/3)];let crossing=false;
    for(let c=nextCorner[first];c!==-1;c=nextCorner[c])if(cells[Math.floor(c/3)]!==cell){crossing=true;break;}
    if(nextCorner[first]!==-1&&!crossing)continue;
    for(let c=first;c!==-1;c=nextCorner[c]){caps[c]=1;capCount++;}
  }
  firstCorner.clear();
  const outputCorners=cornerCount+capCount*3;
  const output=new Float32Array(outputCorners*3),colors=new Float32Array(outputCorners*3);
  const uvs=new Float32Array(outputCorners*2),interiors=new Float32Array(outputCorners),pieceIds=new Float32Array(outputCorners);
  const perPiece = facesPerCell.slice(); let cursor=0;
  function writeVertex(p,cell,inside,sourceIndex) {
    p.toArray(output,cursor*3);pieceIds[cursor]=cell;interiors[cursor]=Number(inside);
    uvs[cursor*2]=!inside&&sourceUV?sourceUV.getX(sourceIndex):p.x*.35;
    uvs[cursor*2+1]=!inside&&sourceUV?sourceUV.getY(sourceIndex):p.z*.35;
    if(!inside&&sourceColor){colors[cursor*3]=sourceColor.getX(sourceIndex);colors[cursor*3+1]=sourceColor.getY(sourceIndex);colors[cursor*3+2]=sourceColor.getZ(sourceIndex);}
    else {const shade=inside?.67+(cell%5)*.035:.95;colors[cursor*3]=shade;colors[cursor*3+1]=shade*.985;colors[cursor*3+2]=shade*.96;}
    cursor++;
  }
  for(let corner=0;corner<cornerCount;corner++) {
    const i=vertexAt(corner);writeVertex(point.fromArray(positions,i*3),cells[Math.floor(corner/3)],false,i);
  }
  for(let corner=0;corner<cornerCount;corner++)if(caps[corner]) {
    const face=Math.floor(corner/3),cell=cells[face],a=vertexAt(corner),b=vertexAt(face*3+(corner%3+1)%3);
    writeVertex(point.fromArray(positions,b*3),cell,true,0);
    writeVertex(point.fromArray(positions,a*3),cell,true,0);
    writeVertex(centroids[cell],cell,true,0);perPiece[cell]++;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(output,3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.setAttribute('fractureInterior',new THREE.BufferAttribute(interiors,1));
  geometry.setAttribute('fractureId',new THREE.BufferAttribute(pieceIds,1));
  geometry.computeVertexNormals();
  if(fallback)source.dispose();
  return {geometry,centroids,directions,perPiece,fallback};
}

// Source geometry is prepared once, reused for repeated hits, and released at disposal.
export function createDestruction(scene, { maxSourceTriangles = Infinity } = {}) {
  const templates=new Map(),active=[],pending=[];let disposed=false;
  const root=new THREE.Group();root.name='closed-mineral-fractures';scene.add(root);
  function body(record){let largest=null;(record?.object?.userData?.body || record?.object)?.traverse(o=>{if(o.isMesh&&(!largest||o.geometry.attributes.position.count>largest.geometry.attributes.position.count))largest=o;});return largest;}
  function prepare(record){if(disposed)return null;const mesh=body(record);if(!mesh)return null;
    // Optional explicit budget for embedders. The game uses the full source
    // on both profiles, with compact typed-buffer preparation above.
    const geometry = mesh.userData.fractureGeometry || mesh.geometry;
    if((geometry.index?.count || geometry.attributes.position.count)/3 > maxSourceTriangles)return null;
    if(!templates.has(geometry))templates.set(geometry,fractureGeometry(geometry));return templates.get(geometry);}
  function burst(record,time,{velocity=record?.velocity}={}){
    if(disposed||!Number.isFinite(time))return false;
    const original=body(record),source=prepare(record);if(!original||!source)return false;
    original.updateWorldMatrix(true,false);
    const inherited=new THREE.Vector3();if(velocity&&[velocity.x,velocity.y,velocity.z].every(Number.isFinite))inherited.copy(velocity);
    const event={source,id:record.id,start:time,radius:record.radius,baseMatrix:original.matrixWorld.clone(),velocity:inherited,originalMaterial:original.material};
    if(active.length>=8){
      if(pending.length>=32)return false;
      // Schedule against the earliest slot, keeping all captured transforms at impact time.
      const ends=active.map(e=>e.start+3.6);
      for(const queued of pending){const earliest=ends.indexOf(Math.min(...ends));ends[earliest]=Math.max(ends[earliest],queued.start)+3.6;}
      event.start=Math.max(time,Math.min(...ends));pending.push(event);return true;
    }
    activate(event);return true;
  }
  function activate(event){
    const {source,originalMaterial}=event;
    const material=originalMaterial.clone();material.transparent=false;material.depthWrite=true;material.alphaHash=true;material.vertexColors=true;
    const matrices=source.centroids.map(()=>new THREE.Matrix4()),heat={value:1};
    const prior=originalMaterial.onBeforeCompile,priorKey=originalMaterial.customProgramCacheKey();
    material.onBeforeCompile=(shader,renderer)=>{
      prior.call(material,shader,renderer);shader.uniforms.fractureMatrices={value:matrices};shader.uniforms.fractureHeat=heat;shader.uniforms.fractureCutNormals={value:source.directions.map(d=>d.clone().negate())};
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nattribute float fractureId; attribute float fractureInterior; varying float gzInterior; varying vec3 gzCutPosition; varying vec3 gzCutNormal; uniform vec3 fractureCutNormals[${matrices.length}]; uniform mat4 fractureMatrices[${matrices.length}];`)
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=mat3(fractureMatrices[int(fractureId)])*objectNormal;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ngzInterior=fractureInterior; gzCutPosition=position; gzCutNormal=normalMatrix*mat3(fractureMatrices[int(fractureId)])*fractureCutNormals[int(fractureId)]; transformed=(fractureMatrices[int(fractureId)]*vec4(transformed,1.)).xyz;');
      shader.fragmentShader='varying float gzInterior; varying vec3 gzCutPosition; varying vec3 gzCutNormal; uniform float fractureHeat;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal=normalize(mix(normal,normalize(gzCutNormal),gzInterior));')
        .replace('#include <lights_physical_fragment>', `
          // Cut surfaces own a matte mineral interior. Exterior mapping remains untouched.
          float gzCutGrain=fract(sin(dot(floor(gzCutPosition*180.),vec3(12.9898,78.233,37.719)))*43758.5453);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.115,.105,.09)*(.85+gzCutGrain*.3),gzInterior);
          roughnessFactor=mix(roughnessFactor,.96,gzInterior);
          metalnessFactor=mix(metalnessFactor,0.,gzInterior);
          totalEmissiveRadiance=mix(totalEmissiveRadiance,vec3(.18,.055,.008)*fractureHeat,gzInterior);
          #include <lights_physical_fragment>`);
    };
    material.customProgramCacheKey=()=>priorKey+'closed-fracture24-matte-cut-v3';
    const mesh=new THREE.Mesh(source.geometry,material);mesh.name='fractured-'+event.id;mesh.matrixAutoUpdate=false;mesh.matrix.copy(event.baseMatrix);mesh.frustumCulled=false;root.add(mesh);
    Object.assign(event,{mesh,material,matrices,heat,emissive:material.emissiveIntensity||0});active.push(event);
  }
  const translate=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),matrix=new THREE.Matrix4(),pivot=new THREE.Matrix4();
  function update(time){
    if(disposed||!Number.isFinite(time))return;
    for(let n=active.length-1;n>=0;n--)if(time-active[n].start>=3.6){active[n].mesh.removeFromParent();active[n].material.dispose();active.splice(n,1);}
    while(pending.length&&active.length<8&&pending[0].start<=time){const next=pending.shift();if(time-next.start<3.6)activate(next);}
    for(const event of active){const age=Math.max(0,time-event.start);
      event.mesh.matrix.copy(event.baseMatrix);event.mesh.matrix.elements[12]+=event.velocity.x*age;event.mesh.matrix.elements[13]+=event.velocity.y*age;event.mesh.matrix.elements[14]+=event.velocity.z*age;event.mesh.matrixWorldNeedsUpdate=true;
      event.material.opacity=Math.min(1,(3.6-age)/1.3);
      event.heat.value=Math.exp(-age*5);
      event.material.emissiveIntensity=event.emissive+Math.exp(-age*12)*1.4;
      const travel=Math.min(age,.22)*.24+Math.max(0,age-.22);
      event.source.centroids.forEach((p,i)=>{const d=event.source.directions[i];translate.copy(p).addScaledVector(d,travel*(.48+(i%5)*.15));rotation.setFromAxisAngle(d,travel*((i%3)-1)*.9);matrix.compose(translate,rotation,scale);pivot.makeTranslation(-p.x,-p.y,-p.z);event.matrices[i].multiplyMatrices(matrix,pivot);});
    }
  }
  function reset(){for(const event of active){event.mesh.removeFromParent();event.material.dispose();}active.length=0;pending.length=0;}
  return {prepare,burst,update,reset,dispose(){if(disposed)return;disposed=true;reset();for(const f of templates.values())f.geometry.dispose();root.removeFromParent();templates.clear();}};
}
