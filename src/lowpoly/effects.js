import * as THREE from '../../vendor/three.module.js';

const NO_OPTIONS = Object.freeze({});
const ATLAS_FILES = Object.freeze({ scan: 'scan-atlas.png', ship: 'ship-impact.png', eva: 'eva-impact.png' });
const EFFECTS = Object.freeze({
  evaMuzzle: { atlas:'eva', columns:4, rows:4, duration:.16, scale:.32, color:0xb6f5ff, opacity:.85, rings:0, radius:.2, fragments:5, speed:.6 },
  shipMuzzle: { atlas:'ship', columns:4, rows:4, duration:.24, scale:.85, color:0xadeeff, opacity:.85, rings:0, radius:.4, fragments:9, speed:1.1 },
  scan: { atlas:'scan', columns:4, rows:1, duration:1.1, scale:2.3, color:0xa5ffe8, opacity:.55, rings:0, radius:2.2, fragments:10, speed:.7 },
  eva: { atlas:'eva', columns:4, rows:4, duration:.9, scale:2.0, color:0xb6f5ff, opacity:.72, rings:0, radius:2.2, fragments:14, speed:2.5 },
  ship: { atlas:'ship', columns:4, rows:4, duration:1.45, scale:4.8, color:0xadeeff, opacity:.88, rings:0, radius:5.2, fragments:56, speed:4.5 },
  gem: { atlas:'scan', columns:4, rows:1, duration:2, scale:3.2, color:0xaaf4df, opacity:.64, rings:0, radius:3.3, fragments:0, speed:1.5 },
  collect: { atlas:'scan', columns:4, rows:1, duration:1.5, scale:1.7, color:0xb6ffee, opacity:.60, rings:0, radius:1.1, fragments:0, speed:.65 },
  warp: { atlas:'scan', columns:4, rows:1, duration:2.1, scale:8, color:0xc1e5ff, opacity:.32, rings:0, radius:8.4, fragments:56, speed:6 },
  attach: { atlas:'ship', columns:4, rows:4, duration:.5, scale:.45, color:0xffd3a1, opacity:.22, rings:0, radius:.4, fragments:0, speed:.3 },
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

/** A fixed four-event pool: shared atlas images with independent frame offsets,
 * one wave batch and one fragment batch per event. Missing atlases never hide 3D action. */
export function createEffects(scene) {
  const root = new THREE.Group(); root.name = 'legacy-atlas-effects'; scene.add(root);
  const sources = {};
  const loader = new THREE.TextureLoader();
  let disposed = false, cursor = 0, clock = 0;
  const pending = [];
  for (const kind of Object.keys(ATLAS_FILES)) {
    const source = { ready:false, texture:null }; sources[kind] = source;
    if (typeof document === 'undefined') { source.texture=prepareTexture(new THREE.Texture()); continue; }
    const url = new URL(`../../assets/runtime/lowpoly-textures/${ATLAS_FILES[kind]}`,import.meta.url);
    source.texture=prepareTexture(loader.load(url.href,texture=>{
      if (disposed) return; source.ready=true;
    },undefined,()=>{source.ready=false;}));
  }
  const waveGeometry = new THREE.BufferGeometry();
  const fragmentGeometry = new THREE.IcosahedronGeometry(1,0);
  const streakGeometry = new THREE.BoxGeometry(.025,.025,1);
  const travelMaterial = new THREE.MeshBasicMaterial({color:0x99dfff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const travelField = new THREE.InstancedMesh(streakGeometry,travelMaterial,80);travelField.name='transit-star-drift';travelField.visible=false;travelField.frustumCulled=false;scene.add(travelField);
  const slots = Array.from({length:4},(_,index)=>{
    const group = new THREE.Group(); group.name=`milestone-effect-${index}`;group.visible=false;root.add(group);
    // Keep each Texture's Source fixed for its entire GPU lifetime. Clones share
    // atlas image/storage while every event keeps independent frame UVs.
    const textures=Object.fromEntries(Object.entries(sources).map(([kind,source])=>[kind,source.texture.clone()]));
    const material=new THREE.SpriteMaterial({map:textures.eva,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,toneMapped:false,fog:false});
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
    const fragments=new THREE.InstancedMesh(fragmentGeometry,fragmentMaterial,64);fragments.name='mineral-fragments';fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fragments.frustumCulled=false;group.add(fragments);
    const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(64*3),3));
    const dustMaterial=new THREE.PointsMaterial({color:0xb99c89,size:.14,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    dustMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat gzDust=1.-smoothstep(.1,.5,length(gl_PointCoord-.5)); diffuseColor.a*=gzDust;');};
    dustMaterial.customProgramCacheKey=()=> 'gz-soft-dust-v1';
    const dust=new THREE.Points(dustGeometry,dustMaterial);dust.name='impact-dust';dust.frustumCulled=false;group.add(dust);
    const flash=new THREE.PointLight(0xc5f6ff,0,12,2);flash.name='impact-flash';group.add(flash);
    return {dust,dustGeometry,dustMaterial,flash,velocity:new THREE.Vector3(),target:null,scale:1,group,sprite,material,textures,waves,waveMaterial,fragments,fragmentMaterial,active:false,config:EFFECTS.eva,kind:'eva',start:0,uv:{},from:new THREE.Vector3(),to:new THREE.Vector3(),travel:false};
  });
  const transform=new THREE.Object3D();
  const waveRotation=new THREE.Quaternion();
  const tilt=new THREE.Quaternion();
  const axis=new THREE.Vector3(1,0,0);

  function start(slot,event,time) {
    const {position,kind,options,target}=event, config=EFFECTS[kind];
    slot.active=true;slot.config=config;slot.kind=kind;slot.start=time;slot.travel=Boolean(target);slot.target=target;
    slot.scale=Number.isFinite(options.scale)?Math.max(.05,Math.min(8,options.scale)):1;
    slot.group.scale.setScalar(slot.scale);
    slot.velocity.set(0,0,0);if(finitePoint(options.velocity))slot.velocity.copy(options.velocity);
    slot.material.map=slot.textures[config.atlas];
    slot.from.copy(position);slot.group.position.copy(position);slot.group.visible=false;
    slot.sprite.visible=false;slot.sprite.scale.setScalar(config.scale);slot.material.color.setHex(config.color).multiplyScalar(1.6);
    slot.waveMaterial.color.setHex(config.color);
    slot.fragmentMaterial.color.setHex(kind==='ship'||kind==='attach'?0xbc8f6a:kind==='eva'?0x829599:config.color);
    slot.fragmentMaterial.emissive.setHex(config.color);slot.fragmentMaterial.emissiveIntensity=kind==='ship'||kind==='eva'?.13:.75;
    slot.waves.count=0;slot.fragments.count=config.fragments;
    slot.dustMaterial.size=['collect','gem'].includes(kind)?.025:.14;
    slot.dustMaterial.color.setHex(['collect','gem'].includes(kind)?config.color:0xb99c89);
  }
  function enqueue(position,kind,time,options=NO_OPTIONS,target=null) {
    kind=kind==='impact'?'eva':kind==='travel'?'warp':kind;
    if(disposed||!EFFECTS[kind]||!Number.isFinite(time)||!finitePoint(position))return false;
    const event={time,position:{...position},kind,options:{...options,velocity:finitePoint(options.velocity)?{...options.velocity}:null},target};
    let slot;
    for(let offset=0;offset<slots.length;offset++) {
      const index=(cursor+offset)%slots.length,candidate=slots[index];
      if(!candidate.active || time-candidate.start>=candidate.config.duration){slot=candidate;cursor=(index+1)%slots.length;break;}
    }
    if(slot)start(slot,event,time);
    else {
      // Bound queued data, never overwrite an active gem or impact. Caller may retry on false.
      if(pending.length>=32)return false;
      pending.push(event);
    }
    return true;
  }
  function burst(position,kind,time,options=NO_OPTIONS){return enqueue(position,kind,time,options);}
  function collect(from,to,time) {
    const point=typeof to==='function'?to():to;
    if(!finitePoint(point))return false;
    return enqueue(from,'collect',time,NO_OPTIONS,typeof to==='function'?to:()=>to);
  }

  function update(time,camera,options=NO_OPTIONS) {
    if (disposed || !Number.isFinite(time)) return;
    clock=time;
    const reduced=Boolean(options.reducedMotion);
    // Local star streaks exist only during transit; no permanent corridor mesh.
    const travel=Number.isFinite(options.travel)?THREE.MathUtils.clamp(options.travel,0,1):0;
    travelField.visible=travel>0&&Boolean(camera);travelMaterial.opacity=travel*(reduced?.2:.48);
    if(travelField.visible){
      travelField.position.copy(camera.position);travelField.quaternion.copy(camera.quaternion);
      for(let i=0;i<80;i++){
        const angle=i*2.399963, radius=4+(i%13)*1.2;
        const speed=finitePoint(options.velocity)?Math.min(20,Math.hypot(options.velocity.x,options.velocity.y,options.velocity.z)*.3):0;
        transform.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,-2-((i*3.73-time*(reduced?2:14+speed))%65+65)%65);
        transform.rotation.set(0,0,0);transform.scale.set(1,1,(i%4===0?.12:(reduced?.4:1+travel*7)*(1+i%3)));
        transform.updateMatrix();travelField.setMatrixAt(i,transform.matrix);
      }travelField.instanceMatrix.needsUpdate=true;
    }
    for(const slot of slots){
      while(slot.active&&time-slot.start>=slot.config.duration){
        const available=slot.start+slot.config.duration;
        slot.active=false;slot.group.visible=false;slot.sprite.visible=false;
        if(pending.length){const event=pending.shift();start(slot,event,Math.max(available,event.time));}
      }
      if(!slot.active&&pending.length){const event=pending.shift();start(slot,event,Math.max(time,event.time));}
    }
    for (const slot of slots) {
      if (!slot.active) continue;
      const c=slot.config,age=time-slot.start;
      if (age>=c.duration) {slot.active=false;slot.group.visible=false;slot.sprite.visible=false;continue;}
      if (age<0) {slot.group.visible=false;continue;}
      const progress=age/c.duration,fade=Math.pow(1-progress,.8);
      const isEnergy=['gem','collect','scan','warp'].includes(slot.kind);
      slot.group.visible=true;
      slot.group.position.copy(slot.from).addScaledVector(slot.velocity,age);
      if(slot.travel){
        const target=slot.target();if(finitePoint(target))slot.to.copy(target);
        const travel=reduced?Math.min(1,progress*1.4):progress*progress*(3-2*progress);
        slot.group.position.lerpVectors(slot.from,slot.to,travel);
        if(!reduced)slot.group.position.y+=Math.sin(progress*Math.PI)*1.1;
      }
      const source=sources[c.atlas];
      slot.sprite.visible=source.ready&&!['gem','collect','warp'].includes(slot.kind);
      if(source.ready){
        const texture=slot.textures[c.atlas];
        atlasFrame(c.columns,c.rows,reduced?.55:Math.min(1,progress*1.55),slot.uv);
        texture.repeat.set(slot.uv.width,slot.uv.height);texture.offset.set(slot.uv.x,slot.uv.y);
        slot.sprite.scale.setScalar(c.scale*(reduced?1:1+progress*.12));
        slot.material.opacity=c.opacity*(reduced?.18:1)*Math.pow(1-progress,1.3);
      }
      slot.flash.intensity=(reduced?.4:2.6)*Math.exp(-age*18)*(slot.kind==='ship'?2:1);
      slot.dustMaterial.opacity=(reduced?.12:.36)*Math.sin(Math.PI*Math.min(1,progress*1.6))*fade;
      const dustPositions=slot.dustGeometry.attributes.position;
      for(let i=0;i<64;i++){
        const angle=i*2.399963,y=1-2*(i+.5)/64,r=Math.sqrt(1-y*y),spread=(['collect','gem'].includes(slot.kind)?.12+progress*.12:.3+age*c.speed*.65)*(1+i%3*.14);
        dustPositions.setXYZ(i,Math.cos(angle)*r*spread,y*spread,Math.sin(angle)*r*spread);
      }dustPositions.needsUpdate=true;
      slot.waveMaterial.opacity=0;
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
    for(const slot of slots){for(const texture of Object.values(slot.textures))texture.dispose();slot.material.dispose();slot.waveMaterial.dispose();slot.fragmentMaterial.dispose();slot.waves.dispose();slot.fragments.dispose();slot.dustGeometry.dispose();slot.dustMaterial.dispose();}
    for(const source of Object.values(sources))source.texture.dispose();
    waveGeometry.dispose();fragmentGeometry.dispose();travelField.removeFromParent();travelField.dispose();streakGeometry.dispose();travelMaterial.dispose();pending.length=0;
  }
  function reset(){pending.length=0;clock=0;travelField.visible=false;for(const slot of slots){slot.active=false;slot.group.visible=false;slot.sprite.visible=false;slot.target=null;}}
  function advance(dt,camera,options){if(Number.isFinite(dt)&&dt>=0)update(clock+dt,camera,options);}
  return {burst,collect,update,advance,reset,dispose,get pendingCount(){return pending.length;}};
}

/** Caller owns the shared mission templates. This visual owns only trail/light resources.
 * Add group directly to a world scene: its transform remains identity so old motes stay put. */
export function createProjectileVisual(templates,actor='astronaut') {
  const group=new THREE.Group();group.name='projectile-visual-'+actor;group.visible=false;
  const model=templates.createProjectile(actor);group.add(model);
  const positions=new Float32Array(48*3),alpha=new Float32Array(48),ages=new Float32Array(48).fill(1),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('particleAlpha',new THREE.BufferAttribute(alpha,1));
  const material=new THREE.PointsMaterial({color:0x9cefff,size:actor==='ship'?.11:.025,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float particleAlpha; varying float gzTrailAlpha;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngzTrailAlpha=particleAlpha;');
    shader.fragmentShader='varying float gzTrailAlpha;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=gzTrailAlpha*(1.-smoothstep(.1,.5,length(gl_PointCoord-.5)));');
  };
  material.customProgramCacheKey=()=> 'gz-world-projectile-trail-v1';
  const trail=new THREE.Points(geometry,material);trail.name='projectile-world-trail';trail.frustumCulled=false;group.add(trail);
  const light=new THREE.PointLight(0x8ee8ff,actor==='ship'?1.5:.2,actor==='ship'?5:1);group.add(light);
  const forward=new THREE.Vector3(0,0,-1),aim=new THREE.Vector3(),previous=new THREE.Vector3(),sample=new THREE.Vector3();
  let cursor=0,disposed=false,elapsed=0,started=false;
  function reset(){group.visible=false;ages.fill(1);alpha.fill(0);geometry.attributes.particleAlpha.needsUpdate=true;cursor=0;elapsed=0;started=false;}
  function emit(position,age=0){const index=cursor++%48;ages[index]=age;positions[index*3]=position.x;positions[index*3+1]=position.y;positions[index*3+2]=position.z;}
  function update(position,direction,dt,{visible=true,intensity=1}={}){
    if(disposed||!finitePoint(position)||!finitePoint(direction)||!Number.isFinite(dt)||dt<0)return false;
    if(!visible){reset();return true;}group.visible=true;
    model.position.copy(position);aim.copy(direction);if(aim.lengthSq()>1e-8)model.quaternion.setFromUnitVectors(forward,aim.normalize());
    light.position.copy(position);light.intensity=(actor==='ship'?1.5:.2)*THREE.MathUtils.clamp(intensity,0,2);
    for(let i=0;i<48;i++)ages[i]+=dt;
    if(!started){previous.copy(position);emit(position);started=true;}
    elapsed+=dt;
    const count=Math.min(48,Math.floor(elapsed*90));elapsed-=Math.floor(elapsed*90)/90;
    for(let i=0;i<count;i++){const fraction=(i+1)/Math.max(1,count);sample.lerpVectors(previous,position,fraction);emit(sample,dt*(1-fraction));}
    previous.copy(position);
    for(let i=0;i<48;i++)alpha[i]=Math.max(0,1-ages[i]/.28);
    geometry.attributes.position.needsUpdate=true;geometry.attributes.particleAlpha.needsUpdate=true;return true;
  }
  function dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometry.dispose();material.dispose();}
  reset();return {group,model,update,reset,dispose};
}
