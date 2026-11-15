import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./worker.mjs',import.meta.url),'utf8');
const campaign=source.slice(source.indexOf('async function runRSSCampaign('));
test('diagnóstico RSS mantiene conteos por causa sin cambiar total',()=>{
 assert.match(campaign,/skip_reasons:\{short_content:0,duplicate:0,needs_review:0\}/);
 assert.match(campaign,/if\(item\.body\.length<80\)\{result\.skipped\+\+;result\.skip_reasons\.short_content\+\+;continue;\}/);
 assert.match(campaign,/if\(exists\.length\)\{result\.skipped\+\+;result\.skip_reasons\.duplicate\+\+;continue;\}/);
 assert.match(campaign,/result\.skip_reasons\.needs_review\+\+;continue;/);
 assert.match(campaign,/if\(e\.status===409\)\{result\.skipped\+\+;result\.skip_reasons\.duplicate\+\+;\}/);
});
test('diagnóstico RSS sigue persistiendo last_result y no publica en Blogger',()=>{
 assert.match(campaign,/last_result:result/);
 assert.match(campaign,/estado:'borrador'/);
 assert.doesNotMatch(campaign,/blogger\.googleapis\.com/);
});
