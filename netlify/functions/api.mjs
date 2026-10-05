import { getStore } from '@netlify/blobs';
import { createApp } from '../../server/app.mjs';
export default async function handler(request, context) {
  const environment=process.env.CONTEXT||'production';
  const name=environment==='production'?'surabraja-daily-v1':`surabraja-test-${process.env.DEPLOY_ID||'local'}`;
  const app=createApp({storeFactory:()=>getStore({name,consistency:'strong'})});
  return app(request,context);
}
export const config={path:'/api/*'};
