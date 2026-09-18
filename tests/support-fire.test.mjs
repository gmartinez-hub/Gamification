import test from 'node:test';
import assert from 'node:assert/strict';
import { installedTurrets, selectSupportThreat } from '../src/lowpoly/support-fire.js';

test('support fire uses owned host-local turrets and never selects mission rocks',()=>{
 const loadout={turrets:[{id:'t1'},{id:'t2'}],placements:{t1:{hostId:'noma-1'},t2:{hostId:'bike-1'}}};
 assert.deepEqual(installedTurrets(loadout,'noma-1').map(t=>t.id),['t1']);
 const target=selectSupportThreat([{id:'rock',side:'neutral',distance:1},{id:'far',side:'enemy',distance:9},{id:'near',side:'enemy',distance:4}]);
 assert.equal(target.id,'near');
});
