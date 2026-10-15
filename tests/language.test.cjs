const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const i18n=require('../i18n.js');
test('every translation has all three languages and matching placeholders',()=>{
    for(const [key,row] of Object.entries(i18n.catalog)){
        assert.deepEqual(Object.keys(row).sort(),['en','nl','tr']);
        const placeholders=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
        for(const language of ['tr','en','nl']) { assert(row[language].trim(),`${key}/${language}`);assert.deepEqual(placeholders(row[language]),placeholders(key),`${key}/${language}`); }
    }
    const html=fs.readFileSync('index.html','utf8');
    for(const match of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) assert(i18n.catalog[match[1]],match[1]);
    const js=fs.readFileSync('app.js','utf8');
    for(const match of js.matchAll(/\bt\('([^']+)'/g)) assert(i18n.catalog[match[1]],match[1]);
    i18n.setLanguage('tr');assert.equal(i18n.t('Share list'),'Listeyi paylaş');
    i18n.setLanguage('nl');assert.equal(i18n.t('Share list'),'Lijst delen');
    assert.equal(i18n.t('Hello {name}',{name:'<img>'}),'Hallo, <img> 👋');
});
