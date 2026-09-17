// Keep resource failures recoverable even before the first animation frame exists.
try { await import('./main.js'); }
catch (error) {
  console.error('Expedition could not initialize',error);
  const panel=document.getElementById('loading');
  panel.hidden=false;panel.style.opacity='1';panel.classList.add('error');
  panel.querySelector('p').textContent='La descarga de la expedición no se completó. Tu progreso guardado se conserva.';
  const retry=document.createElement('button');retry.textContent='Reintentar carga';retry.onclick=()=>location.reload();panel.append(retry);
}
