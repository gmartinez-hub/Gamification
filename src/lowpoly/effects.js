import * as THREE from '../../vendor/three.module.js';

const NO_OPTIONS = Object.freeze({});
const ATLAS_FILES = Object.freeze({ scan: 'scan-atlas.png', ship: 'ship-impact.png', eva: 'eva-impact.png' });
const EFFECTS = Object.freeze({
  scan: { atlas:'scan', columns:4, rows:1, duration:1.1, scale:2.3, color:0xa5ffe8, opacity:.55, rings:1, radius:2.2, fragments:10, speed:.7 },
  eva: { atlas:'eva', columns:4, rows:4, duration:.9, scale:2.0, color:0xb6f5ff, opacity:.72, rings:1, radius:2.2, fragments:14, speed:2.5 },
  ship: { atlas:'ship', columns:4, rows:4, duration:1.45, scale:4.8, color:0xffd1a1, opacity:.88, rings:2, radius:5.2, fragments:28, speed:4.5 },
  gem: { atlas:'scan', columns:4, rows:1, duration:2, scale:3.2, color:0xaaf4df, opacity:.64, rings:3, radius:3.3, fragments:24, speed:1.5 },
  collect: { atlas:'scan', columns:4, rows:1, duration:1.5, scale:1.7, color:0xb6ffee, opacity:.60, rings:2, radius:1.1, fragments:20, speed:.65 },
  warp: { atlas:'scan', columns:4, rows:1, duration:2.1, scale:8, color:0xc1e5ff, opacity:.32, rings:3, radius:8.4, fragments:28, speed:6 },
  attach: { atlas:'ship', columns:4, rows:4, duration:1.9, scale:3, color:0xffd3a1, opacity:.38, rings:2, radius:3.8, fragments:24, speed:2.7 },
});

/** Atlas files run left-to-right, top-to-bottom; texture UVs start below.
 * The caller supplies scratch storage so frame sampling never allocates. */
export function atlasFrame(columns, rows, progress, out) {
  const count = columns * rows;
  const frame = Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
  out.frame = frame;
  out.x = (frame % columns) / columns;
  out.y = 1 - (Math.floor(frame / columns) + 1) / rows;
  out.width = 1 / columns;
  out.height = 1 / rows;
  return out;
}

function prepareTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
const finitePoint = point => point && [point.x,point.y,point.z].every(Number.isFinite);

/** A fixed four-event pool: one atlas, one wave batch and one fragment batch
 * per event. All are depth tested; a missing atlas never hides the 3D action. */
export function createEffects(scene) {
  const root = new THREE.Group(); root.name = 'legacy-atlas-effects'; scene.add(root);
  const sources = {};
  const loader = new THREE.TextureLoader();
  let disposed = false, cursor = 0;
  for (const kind of Object.keys(ATLAS_FILES)) {
    const source = { ready:false, texture:null }; sources[kind] = source;
    if (typeof document === 'undefined') { source.texture=prepareTexture(new THREE.Texture()); continue; }
    const url = new URL(`../../assets/runtime/lowpoly-textures/${ATLAS_FILES[kind]}`,import.meta.url);
    source.texture=prepareTexture(loader.load(url.href,texture=>{
      if (disposed) { texture.dispose(); return; } source.ready=true;
    },undefined,()=>{source.ready=false;}));
  }
  const waveGeometry = new THREE.TorusGeometry(1,.017,4,64);
  const fragmentGeometry = new THREE.IcosahedronGeometry(1,0);
  const slots = Array.from({length:4},(_,index)=>{
    const group = new THREE.Group(); group.name=`milestone-effect-${index}`;group.visible=false;root.add(group);
    const texture=prepareTexture(new THREE.Texture());
    const material=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,toneMapped:false,fog:false});
    // Keep the verified atlas timing and alpha, while removing the legacy
    // magenta/green artwork so each weapon follows this expedition's palette.
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      #ifdef USE_MAP
        vec4 atlas=texture2D(map,vMapUv);
        float light=dot(atlas.rgb,vec3(.2126,.7152,.0722));
        diffuseColor*=vec4(vec3(light),atlas.a);
      #endif
    `);};
    material.customProgramCacheKey=()=> 'neutral-atlas-v4';
    const sprite=new THREE.Sprite(material);sprite.name=`atlas-burst-${index}`;sprite.visible=false;group.add(sprite);
    const waveMaterial=new THREE.MeshBasicMaterial({color:0xb6f5ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,toneMapped:false});
    const waves=new THREE.InstancedMesh(waveGeometry,waveMaterial,3);waves.name='curved-energy-waves';waves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);waves.frustumCulled=false;group.add(waves);
    const fragmentMaterial=new THREE.MeshStandardMaterial({color:0xa8b7b1,emissive:0x285653,emissiveIntensity:.45,metalness:.22,roughness:.6,transparent:true,opacity:0,depthWrite:false,flatShading:true});
    const fragments=new THREE.InstancedMesh(fragmentGeometry,fragmentMaterial,28);fragments.name='mineral-fragments';fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fragments.frustumCulled=false;group.add(fragments);
    return {group,sprite,material,texture,waves,waveMaterial,fragments,fragmentMaterial,active:false,attached:false,config:EFFECTS.eva,kind:'eva',start:0,uv:{},from:new THREE.Vector3(),to:new THREE.Vector3(),travel:false};
  });
  const transform=new THREE.Object3D();
  const waveRotation=new THREE.Quaternion();
  const tilt=new THREE.Quaternion();
  const axis=new THREE.Vector3(1,0,0);

  function burst(position,kind,time) {
    const config=EFFECTS[kind];
    if (disposed || !config || !Number.isFinite(time) || !finitePoint(position)) return false;
    const slot=slots[cursor];cursor=(cursor+1)%slots.length;
    slot.active=true;slot.attached=false;slot.config=config;slot.kind=kind;slot.start=time;slot.travel=false;
    slot.from.copy(position);slot.group.position.copy(position);slot.group.visible=false;
    slot.sprite.visible=false;slot.sprite.scale.setScalar(config.scale);slot.material.color.setHex(config.color).multiplyScalar(kind==='ship'||kind==='warp'?2:1.6);
    slot.waveMaterial.color.setHex(config.color).multiplyScalar(1.65);
    slot.fragmentMaterial.color.setHex(kind==='ship'||kind==='attach'?0xbc8f6a:kind==='eva'?0x829599:config.color);
    slot.fragmentMaterial.emissive.setHex(config.color);slot.fragmentMaterial.emissiveIntensity=kind==='ship'||kind==='eva'?.13:.75;
    slot.waves.count=config.rings;slot.fragments.count=config.fragments;
    return true;
  }

  function collect(from,to,time) {
    if (!finitePoint(to) || !burst(from,'collect',time)) return false;
    const slot=slots[(cursor+slots.length-1)%slots.length];slot.to.copy(to);slot.travel=true;return true;
  }

  function update(time,camera,options=NO_OPTIONS) {
    if (disposed || !Number.isFinite(time)) return;
    const reduced=Boolean(options.reducedMotion);
    for (const slot of slots) {
      if (!slot.active) continue;
      const c=slot.config,age=time-slot.start;
      if (age>=c.duration) {slot.active=false;slot.group.visible=false;slot.sprite.visible=false;continue;}
      if (age<0) {slot.group.visible=false;continue;}
      const progress=age/c.duration,fade=Math.pow(1-progress,.8);
      const isEnergy=['gem','collect','scan','warp'].includes(slot.kind);
      slot.group.visible=true;
      if(slot.travel){
        const travel=reduced?Math.min(1,progress*1.4):progress*progress*(3-2*progress);
        slot.group.position.lerpVectors(slot.from,slot.to,travel);
        if(!reduced)slot.group.position.y+=Math.sin(progress*Math.PI)*1.1;
      }
      const source=sources[c.atlas];
      slot.sprite.visible=source.ready;
      if(source.ready){
        if(!slot.attached){slot.texture.source=source.texture.source;slot.texture.needsUpdate=true;slot.attached=true;}
        atlasFrame(c.columns,c.rows,reduced?.55:Math.min(1,progress*1.55),slot.uv);
        slot.texture.repeat.set(slot.uv.width,slot.uv.height);slot.texture.offset.set(slot.uv.x,slot.uv.y);
        slot.sprite.scale.setScalar(c.scale*(reduced?1:1+progress*.12));
        slot.material.opacity=c.opacity*(reduced?.18:1)*Math.pow(1-progress,1.3);
      }
      slot.waveMaterial.opacity=(reduced?.10:.58)*fade;
      if(camera)waveRotation.copy(camera.quaternion);else waveRotation.identity();
      for(let i=0;i<slot.waves.count;i++){
        const pulse=Math.max(0,progress-i*.08);
        const expansion=reduced?.55:.18+Math.pow(pulse,.65)*.82;
        transform.position.set(0,0,isEnergy?(i-1)*.16:0);
        tilt.setFromAxisAngle(axis,isEnergy?(i-1)*.82:(i-.5)*.28);
        transform.quaternion.copy(waveRotation).multiply(tilt);
        transform.scale.setScalar(c.radius*expansion*(1-i*.16));transform.updateMatrix();slot.waves.setMatrixAt(i,transform.matrix);
      }
      slot.waves.instanceMatrix.needsUpdate=true;
      slot.fragments.visible=!reduced;
      slot.fragmentMaterial.opacity=fade;
      if(!reduced)for(let i=0;i<slot.fragments.count;i++){
        const phi=i*2.399963,vertical=1-2*(i+.5)/slot.fragments.count,radial=Math.sqrt(1-vertical*vertical);
        const distance=isEnergy ? c.speed*(.45+progress*.65) : .25+c.speed*age*(.5+(i%5)*.12);
        const angle=phi+(isEnergy?age*(.55+(i%3)*.15):0);
        transform.position.set(Math.cos(angle)*radial*distance,vertical*distance,Math.sin(angle)*radial*distance);
        if(slot.kind==='warp')transform.position.z-=age*(3+i%4);
        transform.rotation.set(age*(i%3+1),phi+age,age*.8);
        const size=(isEnergy?.035:.075)+(i%4)*.025;
        transform.scale.set(size*fade,size*(slot.kind==='attach'||slot.kind==='warp'?3.8:1.2)*fade,size*.7*fade);
        transform.updateMatrix();slot.fragments.setMatrixAt(i,transform.matrix);
      }
      slot.fragments.instanceMatrix.needsUpdate=true;
    }
  }

  function dispose() {
    if(disposed)return;disposed=true;root.removeFromParent();
    for(const slot of slots){slot.texture.dispose();slot.material.dispose();slot.waveMaterial.dispose();slot.fragmentMaterial.dispose();slot.waves.dispose();slot.fragments.dispose();}
    for(const source of Object.values(sources))source.texture.dispose();
    waveGeometry.dispose();fragmentGeometry.dispose();
  }
  return {burst,collect,update,dispose};
}
