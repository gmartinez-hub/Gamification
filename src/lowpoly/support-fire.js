export function installedTurrets(loadout,hostId){
  const placements=loadout?.placements||{};
  return (loadout?.turrets||[]).filter(turret=>placements[turret.id]?.hostId===hostId).map(turret=>({...turret,placement:placements[turret.id]}));
}

export function selectSupportThreat(candidates){
  return [...(candidates||[])].filter(item=>item.side==='enemy'&&!item.protected).sort((a,b)=>(a.distance??Infinity)-(b.distance??Infinity))[0]||null;
}
