const enabled=(action,label,details={})=>({action,label,disabled:false,...details});
const waiting=(label,details={})=>({action:'none',label,disabled:true,...details});
const valid=value=>Number.isFinite(value)&&value>=0;
/** Nearby actions preserve discovery. A bearing is a hint, never an autopilot. */
export function getMobileAction({phase,actor,returning=false,scanning=false,shotActive=false,cooldown=0,blocked=false,
 actionDistance=Infinity,targetDistance=Infinity,weaponRange=0,chance,assemblyLocked=false,sequence=false,
 cabinMode=null,canSit=false,targetKind=null,freeAim=false,shipDiscovered=true,canBoardShip=false,base='ship'}){
 if(assemblyLocked)return waiting('Ensamblando nave…');
 if(phase==='transit')return waiting('Viajando al próximo sector…');
 if(sequence||phase==='return')return waiting('Gema recuperada · Próximo horizonte');
 if(cabinMode)return canSit?enabled('cabin','Sentarse y pilotear'):waiting('Preparando el puesto…');
 if(blocked)return waiting('Controles en pausa');
 if(returning)return waiting('Volviendo a la nave…');
 if(shotActive)return waiting('Apuntando y disparando…');
 if(phase==='complete')return enabled('restart','Nueva expedición');
 if(freeAim){
  if(!shipDiscovered)return enabled('navigate','Encontrar la nave');
  if(actor==='astronaut'&&phase==='scan'&&actionDistance<=3.8)return scanning?waiting('Escaneando…'):enabled('interact','Escanear baliza');
  if(actor==='astronaut'&&phase==='gem'&&actionDistance<=3)return enabled('interact','Recoger gema');
  if(canBoardShip)return enabled('return','Abordar la nave');
  if(actor!=='astronaut'&&['scan','gem'].includes(phase)&&actionDistance<(actor==='bike'?15:23))return enabled('deploy',actor==='bike'?'Bajar de la moto':'Salir / EVA');
  if(actor==='ship'&&phase==='small'&&targetDistance<23)return enabled('deploy','Salir / EVA');
  if(actor==='astronaut')return enabled('return',base==='bike'?'Volver a la moto':'Abordar la nave');
  return enabled('navigate',phase==='large'&&actor==='bike'?'Ubicar la nave':'Consultar rumbo');
 }
 const near=valid(targetDistance)&&targetDistance<=weaponRange&&weaponRange>0;
 const fire=()=>({action:'fire',label:cooldown>0?'Recargando…':actor==='ship'?'Disparar cañón':'Disparar',disabled:cooldown>0,secondary:'target',hint:Number.isFinite(chance)?`${Math.round(chance*100)}% de acierto`:'Objetivo al alcance'});
 const hint=label=>enabled('navigate',label,{hint:'El rumbo es orientativo. Movete para explorar.'});
 if(phase==='scan'&&actor==='astronaut'&&actionDistance<=3.8)return scanning?waiting('Escaneando…'):enabled('interact','Escanear baliza');
 if(phase==='gem'&&actor==='astronaut'&&actionDistance<=3)return enabled('interact','Recoger gema');
 if(['hazard','breakable'].includes(targetKind)&&near)return fire();
 if(phase==='scan')return actor==='ship'&&actionDistance<23?enabled('deploy','Salir hacia la baliza'):hint('Buscar la señal');
 if(phase==='small'||phase==='large'){
  const secondary=valid(targetDistance)?'target':undefined;
  if(phase==='large'&&actor==='astronaut')return enabled('return','Volver a la nave',{secondary});
  if(phase==='small'&&actor==='ship')return targetDistance<23?enabled('deploy','Salir / EVA',{secondary}):hint('Explorar las regiones');
  if(near)return fire();
  if(actor==='astronaut')return enabled('return','Abordar y mover la nave',{hint:'El cable delimita esta zona de exploración.'});
  return hint('Explorar las regiones');
 }
 if(phase==='gem')return actor==='ship'&&actionDistance<23?enabled('deploy','Salir por la gema'):hint('Ubicar la gema');
 return waiting('Preparando expedición…');
}
