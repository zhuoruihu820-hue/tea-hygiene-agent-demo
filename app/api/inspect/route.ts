import { NextResponse } from 'next/server';

const RULES = [
  { id:'R-CTR-001', item:'操作台', text:'不得有成片静置积水、明显残渣、黏污、废弃杯或包装物。' },
  { id:'R-ING-001', item:'原料', text:'非取用状态的原料必须盖严；食材和包装不得直接接触地面。' },
  { id:'R-LAB-001', item:'标签', text:'分装或开封原料应有名称/日期标签；文字模糊时只能判断标签是否存在。' },
  { id:'R-BIN-001', item:'垃圾桶', text:'食品操作区垃圾桶应有盖、保持关闭且不得满溢。' },
  { id:'R-EMP-001', item:'员工着装', text:'制作区员工必须戴帽或发网，长发完全束入；工作服或围裙应保持清洁。' },
  { id:'R-CLN-001', item:'清洁工具', text:'拖把、扫帚、清洁桶必须与食品、原料、杯具分区存放，不得混放或直接接触。' },
  { id:'R-EQP-001', item:'器具与地面', text:'食品接触器具不得有明显残渣或陈旧污渍；地面不得有明显垃圾、积水或食材。' },
];
function outputText(body:{choices?:Array<{message?:{content?:string}}>}) { return body.choices?.[0]?.message?.content || ''; }

export async function POST(request:Request) {
  const {image,item,store}=await request.json();
  const rule=RULES.find(x=>x.item===item);
  if(!image||!rule) return NextResponse.json({error:'缺少巡检图片或未找到已启用检查规则。'},{status:400});
  const key=process.env.DASHSCOPE_API_KEY;
  if(!key) return NextResponse.json({error:'真实 AI 服务尚未配置。请在部署环境中设置 DASHSCOPE_API_KEY 后重试。'},{status:503});
  const prompt=`仅按此规则审核图片：${rule.id} ${rule.item}：${rule.text}。证据不足、模糊、遮挡或未入镜：status/risk 必须为“无法判断”并说明补拍；标签文字模糊时只判断标签是否存在。仅凭可见证据判违规；明确食品污染风险为高风险，其余违规为中风险。输出 JSON：{"status":"合规|违规|无法判断","risk":"高风险|中风险|无风险|无法判断","evidence":"不超过35字","recommendation":"不超过45字","confidence":0到100,"reason":"可选"}`;
  try {
    const response=await fetch(`${process.env.DASHSCOPE_BASE_URL||'https://dashscope.aliyuncs.com/compatible-mode/v1'}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.DASHSCOPE_MODEL||'qwen3.8-max',messages:[{role:'system',content:'仅输出严格 JSON。'},{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:image}}]}],response_format:{type:'json_object'},enable_thinking:false,temperature:0,max_tokens:180})});
    if(!response.ok) return NextResponse.json({error:'真实 AI 服务调用失败，请检查模型配置和服务密钥。'},{status:502});
    const finding=JSON.parse(outputText(await response.json()).replace(/^```json\s*|\s*```$/g,''));
    if(!['合规','违规','无法判断'].includes(finding.status)) throw new Error('invalid status');
    finding.item=rule.item;finding.ruleId=rule.id;finding.ruleText=rule.text;
    return NextResponse.json({finding});
  } catch { return NextResponse.json({error:'未能解析 AI 检查结果，请重新拍摄清晰图片后重试。'},{status:502}); }
}
