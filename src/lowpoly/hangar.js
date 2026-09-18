import { createLoadoutState } from './loadout.js';

export function createHangarSession(initial,{prepare=async()=>true}={}) {
  let confirmed=createLoadoutState(initial),draft=createLoadoutState(initial),epoch=0;
  return {
    active:false,selected:'ship',ready:false,
    get loadout(){return createLoadoutState(confirmed);},get draft(){return createLoadoutState(draft);},
    replace(next){if(this.active)throw new Error('Cannot replace an active hangar session');confirmed=createLoadoutState(next);draft=createLoadoutState(next);return this.loadout;},
    open(){this.active=true;draft=createLoadoutState(confirmed);return this;},
    close(){this.active=false;this.ready=false;epoch++;draft=createLoadoutState(confirmed);return createLoadoutState(confirmed);},
    preview(patch){draft=createLoadoutState({...draft,...patch});return this.draft;},
    confirm(){confirmed=createLoadoutState(draft);return this.loadout;},
    cancel(){draft=createLoadoutState(confirmed);return this.draft;},
    async select(key){const request=++epoch;this.selected=key;this.ready=false;await prepare(key);if(request!==epoch)return false;this.ready=true;return true;},
  };
}
