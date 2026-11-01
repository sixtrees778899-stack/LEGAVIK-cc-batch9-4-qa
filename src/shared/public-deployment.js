// Public release configuration is generated at packaging time. It never
// grants server authority; each Edge Function independently validates its env.
export function publicDeployment(config,location){
 const d=config?.deployment;
 if(!d||!['qa','production'].includes(d.environment)||!['test','live'].includes(d.stripeMode))return null;
 if(d.stripeMode!==(d.environment==='qa'?'test':'live'))return null;
 try{
  const site=new URL(d.siteUrl),backend=new URL(config.supabaseUrl);
  if(site.protocol!=='https:'||backend.protocol!=='https:'||site.search||site.hash||site.username||site.password)return null;
  if(backend.origin!==d.supabaseUrl||backend.href!==d.supabaseUrl+'/')return null;
  if(!/^legavik-[a-z0-9-]+-\d{8}-[1-9]\d*$/.test(d.release??''))return null;
  if(d.environment==='production'&&(/-qa-/.test(d.release)||site.hostname.endsWith('.github.io')))return null;
  if(location){
   const origin=location.origin??`${location.protocol??'https:'}//${location.hostname}`;
   if(origin!==site.origin||!location.pathname.startsWith(site.pathname.replace(/\/$/,'')+'/'))return null;
  }
  return d;
 }catch{return null;}
}
export const qaDeployment=(config,location)=>publicDeployment(config,location)?.environment==='qa';
export const paymentEnabled=(config,location)=>publicDeployment(config,location)!==null&&config?.paymentsEnabled===true;
