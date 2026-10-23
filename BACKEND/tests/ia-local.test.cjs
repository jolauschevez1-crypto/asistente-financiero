const {test}=require('node:test');
const assert=require('node:assert/strict');
const axios=require('axios');
const groq=require('../src/services/groqService');

test('IA local desactivada no realiza ninguna solicitud de red',async()=>{
  const old=axios.post;let calls=0;axios.post=async()=>{calls++;throw Error('No debe ejecutarse');};
  const previous=groq.provider;groq.provider='disabled';
  try { await assert.rejects(groq.getChatCompletion([{role:'user',content:'Hola'}]),e=>e.status===503);assert.equal(calls,0);assert.equal(groq.status().enabled,false); }
  finally {axios.post=old;groq.provider=previous;}
});
test('fallo de red sin response devuelve error controlado sin secretos',async()=>{
  const safe=groq.providerError(Object.assign(new Error('valor-secreto-ficticio'),{code:'ECONNABORTED'}));
  assert.equal(safe.status,503);assert.match(safe.message,/tardó/);assert.equal(safe.message.includes('secreto'),false);
});
