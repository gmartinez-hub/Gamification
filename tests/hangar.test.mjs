import test from 'node:test';
import assert from 'node:assert/strict';
import { createHangarSession } from '../src/lowpoly/hangar.js';
import { createLoadoutState } from '../src/lowpoly/loadout.js';

test('hangar edits are transactional and closing restores the confirmed loadout', () => {
  const original=createLoadoutState({charge:8,unlocked:['front','final'],modules:[{id:'front-1',type:'front'},{id:'final-1',type:'final'}]});
  const hangar=createHangarSession(original);
  hangar.open();hangar.preview({charge:1});hangar.cancel();
  assert.equal(hangar.loadout.charge,8);
  hangar.preview({activeComposition:['front-1','final-1']});hangar.confirm();hangar.close();
  assert.deepEqual(hangar.loadout.activeComposition,['front-1','final-1']);
});

test('hangar ignores stale resource completion after selection changes', async () => {
  const resolvers=[];const hangar=createHangarSession(createLoadoutState(),{prepare:key=>new Promise(resolve=>resolvers.push([key,resolve]))});
  const first=hangar.select('ship'),second=hangar.select('bike');
  resolvers.find(([key])=>key==='ship')[1]('ship-ready');
  assert.equal(await first,false);
  resolvers.find(([key])=>key==='bike')[1]('bike-ready');
  assert.equal(await second,true);assert.equal(hangar.selected,'bike');
});
