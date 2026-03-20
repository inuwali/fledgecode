// imports
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export async function sendRequest(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { apiKey, model, message, systemMessage, provider } = req.body;

  if (message === null) {
    return res.status(400).json({ error: 'Message is required' });
  }
    
  if (systemMessage === null) {
    return res.status(400).json({ error: 'System message is required' });
  }
  
  if (!provider) {
    provider = "openai";
  }

  let useSkeleton = false;
  
  if (typeof process.env.SKELETON_KEY_ENABLED !== 'undefined' && process.env.SKELETON_KEY_ENABLED === 'true') {
    if (process.env.API_SKELETON_KEY === apiKey)  {
      useSkeleton = true;
    } else if (typeof process.env.SKELETON_KEY_LIST !== 'undefined') {
      let found = JSON.parse(process.env.SKELETON_KEY_LIST).filter ( entry => (entry.apiKey === apiKey && entry.enabled === true))
      console.log(found);
      console.log(found.length);
      if (found.length > 0) {
        useSkeleton = true;
      }
    }
  }
  
  if (useSkeleton === true) {
    console.log("Using skeleton key");
    if (provider === "openai") {
      apiKey = process.env.OPENAI_API_KEY;
    } else if (provider === "anthropic") {
      apiKey = process.env.ANTHROPIC_API_KEY;
    }
  }
  
  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  if (!model) {
    model = provider === "anthropic" ? "claude-sonnet-4-5-20250929" : "gpt-3.5-turbo";
  }
  
  console.log(`Using model ${model}`);
  
  console.log(`Prompt: ${message}`);

  try {
    let response;

    if (provider === "anthropic") {
      const anthropic = new Anthropic({
        apiKey: apiKey,
      });

      const completion = await anthropic.messages.create({
        model: model,
        max_tokens: 4096,
        temperature: 0.9,
        system: systemMessage,
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      });

      console.log("Anthropic Completion:", JSON.stringify(completion, null, 2));
      response = completion.content[0].text;
    } else {
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: message
          },
          {
            role: "system",
            content: systemMessage
          }
        ],
        max_tokens: 4096,
        temperature: 0.9
      });

      console.log("OpenAI Completion:", JSON.stringify(completion, null, 2));
      response = completion.choices[0].message.content;
    }

    return res.status(200).json({
      response: response
    });

  } catch (error) {
    console.error(`${provider === "anthropic" ? "Anthropic" : "OpenAI"} API error:`, error);

    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}