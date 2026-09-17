import * as THREE from '../../vendor/three.module.js';

// Layered volume and filament surface, plus a bounded world-space particle history.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const vertexShader = /* glsl */`
uniform float time; uniform float power; uniform float length;
uniform float radius; uniform float motion; uniform float seed;
varying vec2 plasmaUv; varying vec3 plasmaNormal; varying vec3 plasmaWorld;
void main() {
  plasmaUv = uv;
  float t = uv.y;
  float wave = sin(t * 32.0 - time * 15.0 + seed + uv.x * 12.56637);
  float tail = pow(max(.001, 1.0 - t), .74);
  float taper = (.84 + .16 * exp(-t * 12.0)) * tail;
  vec3 p = position;
  p.xy *= radius * taper * (1.0 + wave * .035 * motion);
  p.xy += vec2(sin(t * 21.0 - time * 8.0 + seed), cos(t * 17.0 - time * 7.0 + seed))
    * t * t * .024 * motion * power;
  p.z *= length;
  vec4 world = modelMatrix * vec4(p, 1.0);
  plasmaWorld = world.xyz;
  plasmaNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const fragmentShader = /* glsl */`
uniform float time; uniform float power; uniform float motion;
uniform float layer; uniform float seed; uniform float gain; uniform float boost;
varying vec2 plasmaUv; varying vec3 plasmaNormal; varying vec3 plasmaWorld;
void main() {
  float t = plasmaUv.y, a = plasmaUv.x * 6.2831853;
  float clock = time * motion;
  float longitudinal = 1.0 - smoothstep(.40, 1.0, t);
  float base = smoothstep(0.0, .035, t);
  float facing = abs(dot(normalize(plasmaNormal), normalize(cameraPosition - plasmaWorld)));
  float strand = pow(.5 + .5 * sin(a * 7.0 + t * 23.0 - clock * 14.0 + seed), 7.0);
  float fine = .5 + .5 * sin(a * 19.0 - t * 71.0 + clock * 23.0 + seed * 3.0);
  float diamonds = pow(.5 + .5 * sin(t * 38.0 - clock * 4.0 + seed), 10.0);
  vec3 color; float opacity;
  if (layer < .5) {
    color = mix(vec3(.15, 1.4, 3.8), vec3(1.9, 3.1, 3.5), exp(-t * 4.5));
    color += vec3(.35, .65, .75) * diamonds * .55;
    opacity = (.36 + .24 * facing) * (.86 + .14 * fine);
  } else if (layer < 1.5) {
    color = mix(vec3(.035, .24, 1.6), vec3(.10, 1.8, 3.0), strand);
    opacity = (.07 + .30 * strand + .075 * diamonds) * (.45 + .55 * facing);
  } else {
    color = vec3(.02, .42, 1.8);
    opacity = .075 * pow(facing, .65);
  }
  color = mix(color, color * vec3(1.32, 1.1, 1.24) + vec3(.8, .65, .6) * diamonds, boost * .65);
  opacity *= (1.0 + boost * .35) * longitudinal * base * smoothstep(0.0, .12, power) * gain;
  if (opacity < .001) discard;
  gl_FragColor = vec4(color * (.62 + power * .38), opacity);
}`;

/** Call after ship.update(), which still drives the approved legacy exhausts. */
export function createPropulsion(shipGroup, { gain = 1 } = {}) {
  const sources = [];
  shipGroup?.traverse(object => { if (object.isMesh && /-exhaust$/.test(object.name)) sources.push(object); });
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 24, 32, true);
  geometry.rotateX(Math.PI / 2); geometry.translate(0, 0, .5);
  const level = Number.isFinite(gain) ? clamp(gain, 0, 2) : 1;
  const engines = [], materials = [], forward = new THREE.Vector3(0, 0, 1);
  const stats = { engines: sources.length, layers: sources.length * 3, lights: 0, triangles: sources.length * 3 * 24 * 32 * 2 };
  for (let i = 0; i < sources.length; i++) {
    const original = sources[i], parent = original.parent;
    original.updateMatrix();
    // A ConeGeometry has its base at -height/2 along local Y. Its factory moves
    // and scales it about a fixed exit plane; recover that plane from the mesh.
    const height = original.geometry.parameters?.height || 2.3;
    const base = new THREE.Vector3(0, -height / 2, 0).applyMatrix4(original.matrix);
    const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(original.quaternion).normalize();
    const root = new THREE.Group(); root.name = `plasma-engine-${i}`;
    root.position.copy(base); root.quaternion.setFromUnitVectors(forward, direction); parent.add(root);
    const layers = [];
    for (let layer = 0; layer < 3; layer++) {
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, power: { value: 0 }, length: { value: 1 }, radius: { value: .3 }, motion: { value: 1 }, seed: { value: i * 1.71 }, layer: { value: layer }, gain: { value: level }, boost: { value: 0 } },
        vertexShader, fragmentShader, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.FrontSide, toneMapped: false,
      });
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `plasma-${['core', 'filaments', 'halo'][layer]}-${i}`;
      mesh.frustumCulled = false; mesh.renderOrder = 3 + layer; root.add(mesh);
      layers.push(material.uniforms); materials.push(material);
    }
    let light;
    if (i < 2 || /^main-ring-[0246]-/.test(original.name)) { light = new THREE.PointLight(0x40bcff, 0, 5.5, 2); light.position.z = .18; root.add(light); stats.lights++; }
    engines.push({ original, priorVisible: original.visible, root, layers, light });
    original.visible = false; root.visible = false;
  }
  // Particle coordinates and velocities are WORLD space, sampled at birth. The
  // shader deliberately ignores modelMatrix, even before a Scene is attached.
  const capacity = Math.max(128, sources.length * 64), positions = new Float32Array(capacity*3);
  const velocities = new Float32Array(capacity*3), life = new Float32Array(capacity), ages = new Float32Array(capacity);
  const strengths = new Float32Array(capacity), sizes = new Float32Array(capacity);
  const plumeGeometry = new THREE.BufferGeometry();
  plumeGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  plumeGeometry.setAttribute('energy',new THREE.BufferAttribute(strengths,1).setUsage(THREE.DynamicDrawUsage));
  plumeGeometry.setAttribute('size',new THREE.BufferAttribute(sizes,1).setUsage(THREE.DynamicDrawUsage));
  const plumeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
    vertexShader:`attribute float energy;attribute float size;varying float fade;
      void main(){vec4 mv=viewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*280./max(.2,-mv.z),1.,18.);fade=energy;}`,
    fragmentShader:`varying float fade;void main(){float r=length(gl_PointCoord-.5)*2.;float alpha=exp(-r*r*4.)*(1.-smoothstep(.65,1.,r))*fade;if(alpha<.003)discard;gl_FragColor=vec4(.25,1.25,3.,alpha);}`});
  const points=new THREE.Points(plumeGeometry,plumeMaterial);points.name='world-exhaust-history';points.frustumCulled=false;points.renderOrder=4;shipGroup.add(points);materials.push(plumeMaterial);
  for(const engine of engines){const marker=new THREE.Object3D();marker.name='exhaust-plasma-motes';engine.root.add(marker);engine.credit=0;}
  const origin=new THREE.Vector3(),direction=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  let cursor=0,serial=0,activeCount=0,lastTime=null;
  const history={points,positions,get activeCount(){return activeCount;}};
  function reset(){life.fill(0);ages.fill(0);strengths.fill(0);positions.fill(0);cursor=0;activeCount=0;lastTime=null;for(const engine of engines){engine.credit=0;engine.root.visible=false;engine.original.userData.power=0;if(engine.light)engine.light.intensity=0;}points.visible=false;plumeGeometry.attributes.energy.needsUpdate=true;plumeGeometry.attributes.position.needsUpdate=true;}
  let disposed = false;
  function update(time = 0, { thrust = 0, reducedMotion = false, boost = false, dt, velocity } = {}) {
    if (disposed) return;
    const t = Number.isFinite(time) ? time : 0;
    if(lastTime!==null&&t<lastTime)reset();
    const delta=clamp(Number.isFinite(dt)?dt:lastTime===null?1/60:t-lastTime,0,.1);lastTime=t;
    let scene=shipGroup;while(scene.parent)scene=scene.parent;
    if(scene.isScene&&points.parent!==scene)scene.add(points);
    shipGroup.updateWorldMatrix(true,true);
    activeCount=0;
    for(let p=0;p<capacity;p++){
      if(life[p]<=0)continue;ages[p]+=delta;
      if(ages[p]>=life[p]||reducedMotion){life[p]=0;strengths[p]=0;continue;}
      const offset=p*3;for(let k=0;k<3;k++)positions[offset+k]+=velocities[offset+k]*delta;
      strengths[p]=Math.pow(1-ages[p]/life[p],2)*.7;activeCount++;
    }
    for (let i = 0; i < engines.length; i++) {
      const engine = engines[i]; engine.original.visible = false;
      let visible=true;for(let parent=engine.original.parent;parent;parent=parent.parent)if(!parent.visible)visible=false;
      const power = visible && !engine.original.userData.blocked ? clamp(engine.original.userData.power ?? thrust) : 0;
      engine.root.visible = power > .015 && level > 0;
      const boosted = boost && !/^rcs-/.test(engine.original.name) ? 1 : 0;
      const nozzleRadius=engine.original.userData.radius ?? .32;
      engine.root.getWorldScale(scale);const nozzleScale=Math.max(scale.x,scale.y,scale.z);
      if(power>.015&&!reducedMotion&&level>0){
        engine.credit+=delta*(35+power*65)*(1+boosted*.4);
        engine.root.getWorldPosition(origin);engine.root.getWorldQuaternion(rotation);
        while(engine.credit>=1){
          engine.credit--;const p=cursor++%capacity,offset=p*3,phase=serial++*2.399963;
          const spread=.08+((serial*17)%11)/55;
          direction.set(Math.cos(phase)*spread,Math.sin(phase)*spread,1).normalize().applyQuaternion(rotation);
          const speed=(3.5+power*6+boosted*7)*Math.max(.12,nozzleScale)*Math.sqrt(nozzleRadius/.32);
          positions[offset]=origin.x;positions[offset+1]=origin.y;positions[offset+2]=origin.z;
          velocities[offset]=direction.x*speed+(velocity?.x||0);velocities[offset+1]=direction.y*speed+(velocity?.y||0);velocities[offset+2]=direction.z*speed+(velocity?.z||0);
          if(life[p]<=0)activeCount++;life[p]=.32+(serial%13)/26;ages[p]=0;strengths[p]=.7*power;sizes[p]=nozzleRadius*nozzleScale*(.12+(serial%5)*.03);
        }
      }else engine.credit=0;
      const breathe = reducedMotion ? 1 : 1 + Math.sin(t * 17 + i * 1.7) * .018;
      for (let j = 0; j < engine.layers.length; j++) {
        const u = engine.layers[j];
        u.time.value = t; u.power.value = power; u.boost.value = boosted; u.motion.value = reducedMotion ? 0 : 1;
        u.length.value = (.24 + power * (4.8 + boosted * 4.2)) * (nozzleRadius / .32) * (j === 0 ? .82 : j === 1 ? 1 : 1.06) * breathe;
        u.radius.value = nozzleRadius * (.66 + power * (.42 + boosted * .13)) * (j === 0 ? .61 : j === 1 ? 1 : 1.32);
      }
      if (engine.light) engine.light.intensity = power * level * Math.pow(nozzleRadius/.32,2) * (reducedMotion ? 1.15 : 3.2 + boosted * 3.2);
    }
    points.visible=activeCount>0&&!reducedMotion;
    plumeGeometry.attributes.position.needsUpdate=true;plumeGeometry.attributes.energy.needsUpdate=true;plumeGeometry.attributes.size.needsUpdate=true;
  }
  function dispose() {
    if (disposed) return; disposed = true;reset();points.removeFromParent();
    for (const engine of engines) { engine.root.removeFromParent(); engine.original.visible = engine.priorVisible; }
    for (const material of materials) material.dispose(); geometry.dispose(); plumeGeometry.dispose();
  }
  return { update, reset, dispose, stats, history };
}
