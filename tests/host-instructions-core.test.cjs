const {test}=require('node:test'),assert=require('node:assert/strict');
const {DEFAULT_HOST_INSTRUCTIONS,validateHostInstructions,instructionDocument}=require('../dist/host-instructions-core');
const {formatMessageCommand}=require('../dist/message-commands');
test('Instruction settings persist configuration history and reject reserved markers',()=>{
 assert.deepEqual(validateHostInstructions(DEFAULT_HOST_INSTRUCTIONS),DEFAULT_HOST_INSTRUCTIONS);
 assert.deepEqual(validateHostInstructions({text:'\r\n Keep continuity. \r\n',enabled:true,hideMarked:true}),{text:'Keep continuity.',enabled:true,hideMarked:true,configured:true});
 assert.equal(validateHostInstructions({...DEFAULT_HOST_INSTRUCTIONS,text:'',configured:false},true).configured,true);
 for(const patch of [{text:'x'.repeat(4001)},{text:'[[FF-SP:1]]'},{text:'[[/FF-SP:1]]'},{text:'a\0b'},{enabled:'yes'},{hideMarked:0},{enabled:true,text:''}])assert.throws(()=>validateHostInstructions({...DEFAULT_HOST_INSTRUCTIONS,...patch}));
});
test('Attached instruction blocks replace retries, preserve rich content, and leave code intact',()=>{
 const original={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'/me Look at '},{type:'mention',attrs:{id:'aria',label:'Aria'}},{type:'text',text:' №1.'}]},{type:'codeBlock',content:[{type:'text',text:'[[FF-SP:1]]\ncode\n[[/FF-SP:1]]'}]}]};
 const plain=formatMessageCommand(original).document;
 const attached=instructionDocument(plain,'Remember the background.\n/me is an example, not dialogue.');
 assert.equal(attached.content.length,3);assert.deepEqual(attached.content.slice(0,2),plain.content);assert.equal(original.content[0].content[0].text,'/me Look at ');
 assert.equal(formatMessageCommand(attached),null,'Commands in guidance are not interpreted as player formatting.');
 assert.deepEqual(instructionDocument(attached,'Remember the background.\n/me is an example, not dialogue.'),attached,'Retries attach exactly one block.');
 assert.deepEqual(instructionDocument(attached,null),plain);assert.equal(instructionDocument(attached,'Updated instructions.').content.length,3);
 const replacement=instructionDocument(attached,'Updated instructions.');assert.equal(replacement.content[2].content[4].text,'Updated instructions.');
});
