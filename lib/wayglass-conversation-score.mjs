import {renderWyrdruneTimedScore} from './wayglass-timed-score.mjs';

const words = text => text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
const range = value => value/(value+4);
const spoken = value => typeof value==='string' && value.trim() ? value : '';
const count = (text,pattern) => Array.from(text.matchAll(pattern)).length;

export async function composeWatercolourConversation(source,{turns,draft=''}) {
  const exchanges = turns.map(turn=>[
    ['rowan',spoken(turn.request?.authorText)],
    ['wayglass',spoken(turn.response?.text??turn.response?.output)],
  ].filter(([,text])=>text)).filter(exchange=>exchange.length);
  if(spoken(draft))exchanges.push([['rowan',draft]]);
  if(!exchanges.length)throw new Error('Write something in Watercolour to give Wyrdrune a score.');

  // Keep complete exchanges in chronological order, including every character
  // in each contribution. Each contiguous section gets its own local features.
  const sectionCount = Math.min(8,exchanges.length);
  const sections = Array.from({length:sectionCount},()=>[]);
  exchanges.forEach((exchange,index)=>{
    sections[Math.floor(index*sectionCount/exchanges.length)].push(...exchange);
  });
  const encoder = new TextEncoder();
  const phrases = await Promise.all(sections.map(async (entries,index)=>{
    const input = encoder.encode(JSON.stringify(entries));
    const digest = await globalThis.crypto.subtle.digest('SHA-256',input);
    const colour = new DataView(digest).getUint32(0)/0xffffffff;
    const text = entries.map(([,value])=>value).join('\n');
    const total = words(text);
    const rowan = entries.reduce((sum,[role,value])=>sum+(role==='rowan'?words(value):0),0);
    const rowanShare = total?rowan/total:entries.filter(([role])=>role==='rowan').length/entries.length;
    const motion = range(count(text,/\b(?:taps?|staccato|race[sd]?|spins?|sweep(?:s|ing)?|beats?|pulses?|turns?)\b/giu));
    const cadence = Number(/three (?:quick|fast|short)|three beats fast|one beat held|eight hellos/i.test(text));
    const descent = Number(/descend(?:s|ed|ing)?|sweep down|down\.\s+down|staccato ping/i.test(text));
    const withness = Number(/\bwithness\b|\bheartbeat\b|\bheart of myth (?:is )?awake/i.test(text));
    const density = total/(total+85);
    return 'phrase('+[index,colour,motion,cadence,descent,withness,rowanShare,density]
      .map(value=>value.toFixed(9)).join(',')+')';
  }));
  // Only bounded numbers enter the source. Rowan's and Wayglass's text remains
  // in the browser and is never evaluated as Wyrdrune.
  const scoreSource = 'operator conversation_phrases() = ['+phrases.join(',')+'];\n'+
    'operator conversation_duration() = '+(sectionCount*5.25+1)+';\n'+source;
  const score = await renderWyrdruneTimedScore(scoreSource);
  return {...score,inputCount:exchanges.reduce((sum,exchange)=>sum+exchange.length,0)};
}
