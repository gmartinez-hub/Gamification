import * as THREE from '../../vendor/three.module.js';

// Two small post passes keep glow restrained; the scene remains identical on touch devices.
export function createPresentation(renderer, { bloom = .16 } = {}) {
  const hdr = renderer.extensions.has('EXT_color_buffer_float');
  const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: true, stencilBuffer: false });
  const glowTarget = new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: false });
  sceneTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
  glowTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const vertexShader = 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}';
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: { source: { value: sceneTarget.texture }, texel: { value: new THREE.Vector2() }, threshold: { value: hdr ? 1.35 : .88 } },
    vertexShader, depthTest: false, depthWrite: false, toneMapped: false,
    fragmentShader: `varying vec2 vUv; uniform sampler2D source; uniform vec2 texel; uniform float threshold;
      vec3 bright(vec2 uv){vec3 c=texture2D(source,uv).rgb; float l=dot(c,vec3(.2126,.7152,.0722)); float knee=clamp((l-threshold+.18)/.36,0.,1.); return c*(max(0.,l-threshold)+knee*knee*.08)/max(l,.001);}
      void main(){ vec3 c=bright(vUv)*.227027;
        c+=(bright(vUv+vec2(texel.x*1.3846,0.))+bright(vUv-vec2(texel.x*1.3846,0.)))*.316216;
        c+=(bright(vUv+vec2(texel.x*3.2308,0.))+bright(vUv-vec2(texel.x*3.2308,0.)))*.07027;
        gl_FragColor=vec4(c,1.); }`,
  });
  const outputMaterial = new THREE.ShaderMaterial({
    uniforms: { source: { value: sceneTarget.texture }, glow: { value: glowTarget.texture }, texel: { value: new THREE.Vector2() }, strength: { value: bloom } },
    vertexShader, depthTest: false, depthWrite: false,
    fragmentShader: `varying vec2 vUv; uniform sampler2D source; uniform sampler2D glow; uniform vec2 texel; uniform float strength;
      void main(){vec3 c=texture2D(source,vUv).rgb;
        vec3 b=texture2D(glow,vUv).rgb*.227027;
        b+=(texture2D(glow,vUv+vec2(0.,texel.y*1.3846)).rgb+texture2D(glow,vUv-vec2(0.,texel.y*1.3846)).rgb)*.316216;
        b+=(texture2D(glow,vUv+vec2(0.,texel.y*3.2308)).rgb+texture2D(glow,vUv-vec2(0.,texel.y*3.2308)).rgb)*.07027;
        gl_FragColor=vec4(c+b*strength,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glowMaterial); quadScene.add(plane);
  const size = new THREE.Vector2();
  function resize() {
    renderer.getDrawingBufferSize(size);
    sceneTarget.setSize(size.x, size.y);
    glowTarget.setSize(Math.max(1, Math.floor(size.x / 4)), Math.max(1, Math.floor(size.y / 4)));
    glowMaterial.uniforms.texel.value.set(4 / size.x, 4 / size.y);
    outputMaterial.uniforms.texel.value.set(4 / size.x, 4 / size.y);
    sceneTarget.samples = 2;
  }
  resize(); renderer.autoClear = false; renderer.info.autoReset = false;
  return {
    resize,
    setBloom(value) { if (Number.isFinite(value)) outputMaterial.uniforms.strength.value = THREE.MathUtils.clamp(value, 0, .4); },
    render(scene, camera, world) {
      renderer.info.reset();
      world.updateSky(camera);
      renderer.setRenderTarget(sceneTarget); renderer.clear();
      renderer.render(world.skyScene, world.skyCamera); renderer.clearDepth(); renderer.render(scene, camera);
      renderer.setRenderTarget(glowTarget); plane.material = glowMaterial; renderer.render(quadScene, quadCamera);
      renderer.setRenderTarget(null); plane.material = outputMaterial; renderer.render(quadScene, quadCamera);
    },
    dispose() { sceneTarget.dispose(); glowTarget.dispose(); plane.geometry.dispose(); glowMaterial.dispose(); outputMaterial.dispose(); },
  };
}

export function createReflectionEnvironment(renderer) {
  const studio = new THREE.Scene(); studio.background = new THREE.Color(0x111c2b);
  const geometry = new THREE.PlaneGeometry(20, 16);
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.75, 1.03), side: THREE.DoubleSide });
  const cool = new THREE.MeshBasicMaterial({ color: new THREE.Color(.24, .62, .91), side: THREE.DoubleSide });
  const key = new THREE.Mesh(geometry, warm); key.position.set(-15, 12, 6); key.lookAt(0, 0, 0); studio.add(key);
  const fill = new THREE.Mesh(geometry, cool); fill.position.set(14, 3, -10); fill.lookAt(0, 0, 0); studio.add(fill);
  const edge = new THREE.MeshBasicMaterial({ color: new THREE.Color(.95, 1.05, 1.15), side: THREE.DoubleSide });
  const strip = new THREE.Mesh(geometry, edge); strip.scale.set(.18, 1.6, 1); strip.position.set(1, 16, -5); strip.lookAt(0,0,0); studio.add(strip);
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(studio, .03, .1, 100);
  generator.dispose(); geometry.dispose(); warm.dispose(); cool.dispose(); edge.dispose();
  return target;
}
