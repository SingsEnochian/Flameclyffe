// Wyrdrune browser WCE-1, SHA-256 and RFC-8785-compatible canonical encoding.
const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const rot=(v,n)=>(v>>>n)|(v<<(32-n));
export function sha256Hex(value){
  const bytes=new TextEncoder().encode(String(value));
  const data=new Uint8Array(Math.ceil((bytes.length+9)/64)*64);data.set(bytes);data[bytes.length]=128;
  const view=new DataView(data.buffer),bits=BigInt(bytes.length)*8n;
  view.setUint32(data.length-8,Number((bits>>32n)&0xffffffffn));view.setUint32(data.length-4,Number(bits&0xffffffffn));
  const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),W=new Uint32Array(64);
  for(let p=0;p<data.length;p+=64){
    for(let i=0;i<16;i++)W[i]=view.getUint32(p+i*4);
    for(let i=16;i<64;i++){
      const s0=rot(W[i-15],7)^rot(W[i-15],18)^(W[i-15]>>>3),s1=rot(W[i-2],17)^rot(W[i-2],19)^(W[i-2]>>>10);
      W[i]=(W[i-16]+s0+W[i-7]+s1)>>>0;
    }
    let [a,b,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){
      const S1=rot(e,6)^rot(e,11)^rot(e,25),ch=(e&f)^(~e&g),t1=(h+S1+ch+K[i]+W[i])>>>0;
      const S0=rot(a,2)^rot(a,13)^rot(a,22),maj=(a&b)^(a&c)^(b&c),t2=(S0+maj)>>>0;
      h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;
    H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;
  }
  return Array.from(H,v=>v.toString(16).padStart(8,'0')).join('');
}
const BAD_UNICODE=/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
export function canonicalEncode(v){
  if(v===null)return 'null';
  if(v===true)return 'true';
  if(v===false)return 'false';
  if(typeof v==='number'){if(!Number.isFinite(v))throw new RangeError('WCE-1: non-finite number');return Object.is(v,-0)?'0':String(v);}
  if(typeof v==='string'){if(BAD_UNICODE.test(v))throw new TypeError('WCE-1: ill-formed Unicode text');return JSON.stringify(v);}
  if(Array.isArray(v))return '['+v.map(canonicalEncode).join(',')+']';
  const proto=v!==undefined&&typeof v==='object'?Object.getPrototypeOf(v):undefined;
  if(proto===Object.prototype||proto===null){
    const keys=Object.keys(v).sort((a,b)=>a<b?-1:a>b?1:0);
    return '{'+keys.map(k=>{if(BAD_UNICODE.test(k))throw new TypeError('WCE-1: ill-formed Unicode key');return JSON.stringify(k)+':'+canonicalEncode(v[k]);}).join(',')+'}';
  }
  throw new TypeError('WCE-1: unsupported value type '+typeof v);
}
export const canonicalDigest=v=>'wce1:'+sha256Hex(canonicalEncode(v));
