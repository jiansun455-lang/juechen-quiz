const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { answers, typeName, typeSubtitle } = JSON.parse(event.body);
  const apiKey = process.env.QWEN_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not set' }) };
  }

  const prompt = `你是一位深谙人性的品酒师和性格分析师，代表「觉尘白酒」品牌。
用户完成了12道性格测试题，测出他的人格类型是「${typeName}」（${typeSubtitle}）。

以下是用户的12道题答案：
${answers}

请根据用户的具体答案，用200字左右写一段个性化的性格解读。要求：
- 语气温暖有力，像一个老朋友在说你
- 结合「觉尘」品牌调性：大梦不觉醒，湮灭红尘中
- 要让用户感觉"说的就是我"，有强烈共鸣
- 最后一句自然引出他适合的那种酒
- 不要分段，不要标题，就是一段流畅的文字`;

  const body = JSON.stringify({
    model: 'qwen-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'dashscope.aliyuncs.com',
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.message?.content || '';
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result: text }),
          });
        } catch (e) {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'parse error', raw: data }),
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: e.message }),
      });
    });

    req.write(body);
    req.end();
  });
};
