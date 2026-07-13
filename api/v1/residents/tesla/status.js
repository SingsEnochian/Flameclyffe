export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method!=='GET')return res.status(405).json({error:'GET required.'});
  return res.status(200).json({
    resident:'tesla',
    providers:{
      openai:Boolean(process.env.OPENAI_API_KEY||process.env.VEE_API_KEY),
      anthropic:Boolean(process.env.ANTHROPIC_API_KEY||process.env.CLAUDE_API_KEY),
      deepseek:Boolean(process.env.DEEPSEEK_API_KEY),
      yggdrasil:Boolean(process.env.YGGDRASIL_LOCAL_URL)
    }
  });
}
