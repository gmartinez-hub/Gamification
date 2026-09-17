import * as THREE from '../../vendor/three.module.js';
import { loadModelSet, releaseModelAssets } from './asset-loading.js';

export async function loadMissionAssets(options = {}) {
  return loadModelSet([['gem','gema'],['projectile','proyectil']], { ...options, directory:'mission-models' });
}

// The source crystal and its metallic setting share one atlas. This chromatic
// mask follows the cyan mineral already painted in that atlas; bronze remains
// opaque metal. It does not retexture or simplify either original asset.
function mineralMaterial(source) {
  const material = new THREE.MeshPhysicalMaterial({
    map:source.map, normalMap:source.normalMap, normalScale:source.normalScale?.clone(),
    roughnessMap:source.roughnessMap, metalnessMap:source.metalnessMap,
    color:source.color, metalness:source.metalness, roughness:source.roughness,
    side:THREE.DoubleSide, clearcoat:.7, clearcoatRoughness:.14, envMapIntensity:1.15,
    transmission:.32, thickness:.1, ior:1.46, attenuationColor:0x91e5eb, attenuationDistance:.55,
    emissive:0x218496, emissiveIntensity:.2,
  });
  material.name='Aether Shard · opaque setting / mineral optics';
  material.onBeforeCompile = shader => {
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float gzCrystal = smoothstep(0.025, 0.17, min(diffuseColor.g, diffuseColor.b) - diffuseColor.r);
        roughnessFactor = mix(roughnessFactor, 0.18, gzCrystal);`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - gzCrystal;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= gzCrystal;')
      .replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment.replace(
        'material.transmission = transmission;', 'material.transmission = transmission * gzCrystal;'));
  };
  material.customProgramCacheKey=()=>'gz-mineral-optics-v1';
  return material;
}

function projectileMaterial(source) {
  const material=source.clone();
  material.name='Aethercore · original alloy and energy windows';
  material.envMapIntensity=1.1;
  material.emissive=new THREE.Color(0xffb850); material.emissiveIntensity=.7;
  material.onBeforeCompile=shader => {
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float gzEnergy = smoothstep(0.04, 0.23, diffuseColor.r-diffuseColor.b)
        * smoothstep(0.01, 0.1, diffuseColor.g-diffuseColor.b);
      totalEmissiveRadiance *= gzEnergy;`);
  };
  material.customProgramCacheKey=()=>'gz-projectile-energy-v1';
  return material;
}

export function createMissionAssetTemplates(assets) {
  const materials=new Set();
  function template(asset,kind) {
    if(!asset?.scene) throw new Error('Missing '+kind+' model');
    const model=asset.scene.clone(true), replacements=new Map();
    model.traverse(object=>{
      if(!object.isMesh) return;
      const adapt=source=>{
        if(!replacements.has(source)) {
          const adapted=kind==='gem'?mineralMaterial(source):projectileMaterial(source);
          replacements.set(source,adapted); materials.add(adapted);
        }
        return replacements.get(source);
      };
      object.material=Array.isArray(object.material)?object.material.map(adapt):adapt(object.material);
      object.castShadow=true; object.receiveShadow=true;
    });
    const bounds=new THREE.Box3().setFromObject(model), center=bounds.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const root=new THREE.Group(); root.add(model);
    if(kind==='projectile') {
      // Source inspection: pointed nose is -X; runtime forward is -Z.
      model.rotation.y=-Math.PI/2;
      model.position.applyAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2);
    }
    root.userData.sourceLength=bounds.getSize(new THREE.Vector3())[kind==='gem'?'y':'x'];
    return root;
  }
  const gem=template(assets.gem,'gem'), projectile=template(assets.projectile,'projectile');
  function instantiate(source,name,length) {
    const group=source.clone(true); group.name=name;
    group.scale.setScalar(length/source.userData.sourceLength);
    group.userData.noseAxis=new THREE.Vector3(0,0,-1);
    return group;
  }
  return {
    // One physical scale in the world and on the open palm; collection never
    // shrinks the relic to make a first-person framing work.
    createGem:()=>instantiate(gem,'aether-shard',.28),
    createProjectile:(actor='astronaut')=>instantiate(projectile,'aethercore-'+actor,actor==='ship'?1.35:.24),
    dispose(){ for(const material of materials) material.dispose(); materials.clear(); releaseModelAssets(assets); },
  };
}
