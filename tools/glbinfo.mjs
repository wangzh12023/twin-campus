import fs from 'fs';
const b = fs.readFileSync(process.argv[2]);
const len = b.readUInt32LE(12);
const j = JSON.parse(b.slice(20, 20 + len).toString());
console.log('nodes', j.nodes.length, 'meshes', j.meshes.length, 'materials', j.materials.length);
for (const m of j.meshes) {
  const p = m.primitives[0];
  const acc = j.accessors[p.attributes.POSITION];
  console.log(m.name.padEnd(28), Object.keys(p.attributes).join(','), 'verts', acc.count, 'mat', j.materials[p.material]?.name);
}
const empt = j.nodes.filter(n => n.mesh === undefined).map(n => n.name + ':' + (n.translation || []).map(v => v.toFixed(1)).join(','));
console.log('empties', empt.join(' | '));
