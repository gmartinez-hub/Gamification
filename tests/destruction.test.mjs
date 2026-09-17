import test from 'node:test';
import assert from 'node:assert/strict';
import { IcosahedronGeometry } from '../vendor/three.module.js';
import { fractureGeometry } from '../src/lowpoly/destruction.js';

test('fracture retains original exterior/UV and closes every piece at its cut edges',()=>{
 const original=new IcosahedronGeometry(1,1),result=fractureGeometry(original,8),g=result.geometry;
 const input=original.attributes.position,positions=g.attributes.position,ids=g.attributes.fractureId,uv=g.attributes.uv;
 assert.equal(result.perPiece.length,8);assert(positions.count>input.count);
 for(let i=0;i<input.count;i++){for(let j=0;j<3;j++)assert.equal(positions.array[i*3+j],input.array[i*3+j]);assert.equal(uv.getX(i),original.attributes.uv.getX(i));assert.equal(uv.getY(i),original.attributes.uv.getY(i));}
 const edges=new Map(),key=i=>[positions.getX(i),positions.getY(i),positions.getZ(i)].map(x=>Math.round(x*1e5)).join(',');
 for(let i=0;i<positions.count;i+=3){assert.equal(ids.getX(i),ids.getX(i+1));assert.equal(ids.getX(i),ids.getX(i+2));for(let j=0;j<3;j++){const a=key(i+j),b=key(i+(j+1)%3),k=ids.getX(i)+':'+[a,b].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}}
 assert([...edges.values()].every(n=>n===2),'every piece must have closed boundary edges');
 assert([...positions.array,...g.attributes.normal.array].every(Number.isFinite));
 original.dispose();g.dispose();
});
