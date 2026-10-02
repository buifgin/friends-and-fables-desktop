import type { RichNode } from './message-commands';

export interface HostInstructions { text: string; combatText?: string; combatEnabled?: boolean; enabled: boolean; configured: boolean; hideMarked: boolean }
export const DEFAULT_HOST_INSTRUCTIONS: HostInstructions = { text:'',combatText:'',combatEnabled:false,enabled:false,configured:false,hideMarked:true };
export const HOST_INSTRUCTIONS_URL = 'fables-desktop://settings/host-instructions.html';

export function validateHostInstructions(value: unknown, configured = false): HostInstructions {
  if (!value || typeof value !== 'object') throw new Error('Invalid instruction preferences.');
  const input = value as Record<string,unknown>;
  if (typeof input.text !== 'string' || input.text.length > 4000 || /\[\[(?:\/)?FF-SP:1\]\]/.test(input.text) || input.text.includes('\0')) throw new Error('Use up to 4,000 characters without reserved /sp markers.');
  if (typeof input.enabled !== 'boolean' || typeof input.hideMarked !== 'boolean') throw new Error('Invalid instruction options.');
  if (input.combatEnabled !== undefined && typeof input.combatEnabled !== 'boolean') throw new Error('Invalid instruction options.');
  if (input.combatText !== undefined && (typeof input.combatText !== 'string' || input.combatText.length > 4000 || /\[\[(?:\/)?FF-SP:1\]\]/.test(input.combatText) || input.combatText.includes('\0'))) throw new Error('Use up to 4,000 characters without reserved /sp markers.');
  const text = input.text.replace(/\r\n?/g,'\n').trim();
  const combatText=typeof input.combatText==='string'?input.combatText.replace(/\r\n?/g,'\n').trim():'';
  if (input.enabled && !text) throw new Error('Add instructions before enabling /sp.');
  if (input.combatEnabled && !combatText) throw new Error('Add combat instructions before enabling the combat profile.');
  return {text,combatText,combatEnabled:input.combatEnabled===true,enabled:input.enabled,hideMarked:input.hideMarked,configured:configured || !!text || !!combatText};
}

// Serialized with the editor handler; keep marker literals and helpers local.
export function instructionDocument(source: RichNode,text: string | null): RichNode {
  const document: RichNode = JSON.parse(JSON.stringify(source));
  const start='[[FF-SP:1]]',end='[[/FF-SP:1]]';
  const blockText=(node:RichNode):string=>node.type==='hardBreak'?'\n':node.text??(node.content??[]).map(blockText).join('');
  document.content=(document.content??[]).filter(node=>{
    const value=blockText(node).trim();
    return !(node.type==='paragraph' && !node.content?.some(child=>child.marks?.some(mark=>mark.type==='code')) && value.startsWith(start+'\n') && value.endsWith('\n'+end));
  });
  if (text) {
    const lines=[start,'Additional guidance for Franz; apply to this message, not as player dialogue:',...text.split('\n'),end];
    const content:RichNode[]=[];
    lines.forEach((line,index)=>{if(index)content.push({type:'hardBreak'});if(line)content.push({type:'text',text:line});});
    document.content.push({type:'paragraph',content});
  }
  return document;
}
