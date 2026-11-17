// Folder edition: validate source files; do not embed assets or regenerate HTML.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname,html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,11);
const sources=scripts.map(f=>fs.readFileSync(path.join(root,f.split('?')[0]),'utf8'));
for(let i=0;i<sources.length;i++)new vm.Script(sources[i],{filename:scripts[i]});
new vm.Script(sources.join('\n'));
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g))if(!/^(https?:|#|data:)/.test(match[1]))assert(fs.existsSync(path.join(root,match[1].split('?')[0])),match[1]);
for(const match of sources.join('\n').matchAll(/["'](assets\/[^"']+)["']/g))assert(fs.existsSync(path.join(root,match[1].split('?')[0])),match[1]);
assert(!/data:(audio|image)/.test(html+sources.join('\n')),'Media must be external');
console.log('PASS: folder source syntax, script order, local resources, external media. No build required.');
