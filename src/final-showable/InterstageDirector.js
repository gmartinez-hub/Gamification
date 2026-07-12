export class InterstageDirector {
  constructor({ THREE, scene, cameraDirector, audio, onComplete }) {
    this.THREE = THREE;
    this.scene = scene;
    this.cameraDirector = cameraDirector;
    this.audio = audio;
    this.onComplete = onComplete;
    this.active = false;
    this.time = 0;
    this.duration = 0;
    this.targetStage = 0;
    this.firstVisit = true;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.group.renderOrder = 1000;
    this.scene.add(this.group);

    const texture = new THREE.TextureLoader().load("/assets/runtime/final-showable/textures/gate.png");
    this.overlay = new THREE.Sprite(new THREE.SpriteMaterial({ map:texture, transparent:true, opacity:0, depthTest:false, depthWrite:false }));
    this.overlay.scale.set(2.4,2.4,1);
    this.group.add(this.overlay);

    this.streaks = Array.from({length:22},(_,i)=>{
      const m=new THREE.MeshBasicMaterial({color:i%2?0x6ee9ff:0xd66cff,transparent:true,opacity:0,depthTest:false});
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(0.012,0.7+Math.random()*0.8),m);
      mesh.position.set(-1.2+Math.random()*2.4,-1.2+Math.random()*2.4,0.2);
      mesh.rotation.z=(Math.random()-0.5)*0.3;
      this.group.add(mesh);return mesh;
    });
  }

  start(targetStage, { firstVisit=true, duration } = {}) {
    if (this.active) return false;
    this.active=true;
    this.time=0;
    this.targetStage=targetStage;
    this.firstVisit=firstVisit;
    this.duration=duration ?? (firstVisit?30:6.5);
    this.group.visible=true;
    this.audio?.play("gate_open",0.26);
    this.audio?.play("interstage_enter",0.24);
    this.cameraDirector?.cue("INTERSTAGE",this.duration,1);
    return true;
  }

  update(rawDelta) {
    if (!this.active) return;
    this.time += rawDelta;
    const t=Math.min(1,this.time/this.duration);
    const pulse=Math.sin(Math.PI*t);
    this.overlay.material.opacity=0.18+0.34*pulse;
    this.overlay.rotation.z+=rawDelta*0.28;
    this.streaks.forEach((s,i)=>{
      s.material.opacity=0.12+0.52*pulse;
      s.position.y-=rawDelta*(1.2+i%5*0.16);
      if(s.position.y<-1.4)s.position.y=1.4;
    });
    if (t>=1) {
      this.active=false;
      this.group.visible=false;
      this.audio?.play("interstage_exit",0.24);
      this.onComplete?.(this.targetStage);
    }
  }
}
