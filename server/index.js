import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const port=Number(process.env.PORT||3000);
const required=['OPENAI_API_KEY','SUPABASE_URL','SUPABASE_ANON_KEY'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length)console.warn(`Missing environment variables: ${missing.join(', ')}. API generation/auth checks will not work until configured.`);
const openai=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
const supabase=process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY?createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false,crossOriginEmbedderPolicy:false}));
app.use(express.json({limit:'80kb'}));
app.use('/api/',rateLimit({windowMs:60_000,limit:12,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests. Please wait a minute and try again.'}}));
app.use(express.static(path.join(__dirname,'..','public')));

const toolInstructions={
 toolkit:'Create a polished, practical K-12 classroom resource. Respect requested mode (lesson plan, worksheet, quiz, exit ticket, lesson ideas, standards planning notes), subject, grade, topic, time, question count, and support/extension setting. Include concrete, ready-to-use content, clear headings, answer key where relevant, and checks for understanding. For Pennsylvania standards, do not invent standard codes or claim exact alignment unless supplied; tell the teacher to verify official wording.',
 sub:'Create a clear substitute teacher plan using the supplied date, grade, schedule, learning assignments, routines, and emergency preference. Preserve supplied details, flag missing safety/medical/dismissal details rather than inventing them, and use a professional print-friendly structure.',
 diff:'Adapt the supplied lesson for the target grade and learner focus. Respect requested vocabulary, step breakdowns, sentence frames, extension, and language. Maintain the core learning objective, use asset-based language, avoid diagnosing students, and clearly flag translations or accommodations for educator review.',
 grade:'Analyze aggregate assessment score patterns and suggest instructional next steps. Data should contain no names or identifying details. Describe limitations, avoid labeling students, distinguish calculations from hypotheses, and recommend checking raw work before decisions. If scores are raw points rather than percentages, do not label them percentages.',
 finder:'Suggest useful classroom materials, free resource ideas, search queries, and reputable types of sources for the grade/type/budget. Do not claim live prices, availability, reviews, or links have been checked. Give specific search phrases the teacher can copy.'
};
function cleanInputs(value){const json=JSON.stringify(value??{});if(json.length>45_000)throw new Error('Input is too long. Please shorten it and try again.');return json;}
async function authenticate(req,res,next){try{if(!supabase)return res.status(503).json({error:'Authentication service is not configured on the server.'});const auth=req.headers.authorization||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)return res.status(401).json({error:'Please sign in to use this feature.'});const {data,error}=await supabase.auth.getUser(token);if(error||!data.user)return res.status(401).json({error:'Your session is invalid or expired. Please sign in again.'});req.user=data.user;next();}catch{res.status(401).json({error:'Could not verify your sign-in. Please sign in again.'});}}
app.post('/api/generate',authenticate,async(req,res)=>{
 try{if(!openai)return res.status(503).json({error:'AI service is not configured. Add OPENAI_API_KEY to your hosting environment.'});const {tool,inputs}=req.body||{};if(!Object.hasOwn(toolInstructions,tool))return res.status(400).json({error:'Unknown tool.'});const inputJson=cleanInputs(inputs);if(tool==='grade'&&/student\s*(name|id|email)|\bIEP\b|date of birth/i.test(inputJson))return res.status(400).json({error:'Please remove student names, identifiers, IEP details, and other sensitive information before analyzing scores.'});
 const response=await openai.responses.create({model:process.env.OPENAI_MODEL||'gpt-5',instructions:`You are NextClass, a careful assistant for K-12 educators. Produce high-quality, actionable, editable teacher materials. Use Markdown only (no HTML). Do not claim access to current web pages or verified standards. Do not invent school-specific policies. Always include a concise teacher review note at the end. Tool-specific instructions: ${toolInstructions[tool]}`,input:`Create the requested resource for this tool: ${tool}. Here are the teacher's settings as JSON:\n${inputJson}`,max_output_tokens:3500});
 const content=(response.output_text||'').trim();if(!content)return res.status(502).json({error:'The AI service returned an empty response. Please try again.'});res.json({content});
 }catch(err){console.error('AI generation failed:',err?.status||'',err?.message||'unknown error');if(err?.status===429)return res.status(429).json({error:'AI usage is temporarily limited. Please try again shortly.'});res.status(500).json({error:'Could not generate the resource. Check the server configuration and try again.'});}
});
app.get('/api/health',(_req,res)=>res.json({ok:true,aiConfigured:Boolean(openai),authConfigured:Boolean(supabase)}));
app.get('/{*path}',(req,res,next)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'API endpoint not found.'});res.sendFile(path.join(__dirname,'..','public','index.html'),err=>{if(err)next(err);});});
app.listen(port,()=>console.log(`NextClass running on port ${port}`));
