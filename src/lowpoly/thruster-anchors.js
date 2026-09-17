// Runtime metres: GLTF (x,y,z) -> ship (2.5x,2.5z,-2.5y).
// Measured from the unmodified runtime GLBs, rear vertex projection and bell lips.
// These are the peripheral outlets; the central mating hatches are NOT engines.
export const SHIP_NOZZLES = Object.freeze([
  ...[[2.225,.075,1.54],[-2.225,.075,1.54],[0,2.2,1.55],[0,-2.15,1.54]].map((position,i)=>({name:`pod-${i}`,module:0,position,radius:.125,exposed:[1,2,3]})),
  ...[[1.625,.425,1.71],[-1.625,.425,1.71],[1.625,-.425,1.71],[-1.625,-.425,1.71]].map((position,i)=>({name:`habitat-${i}`,module:1,position,radius:.16,exposed:[2]})),
  ...[[1.475,0,2.11],[1.15,1.15,2.35],[0,1.55,2.39],[-1.15,1.15,2.35],[-1.475,0,2.11],[-1.15,-1.15,2.35],[0,-1.55,2.39],[1.15,-1.15,2.35]].map((position,i)=>({name:`main-ring-${i}`,module:2,position,radius:i%2?.43:.48,exposed:[3]})),
]);
