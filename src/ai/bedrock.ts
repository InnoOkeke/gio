export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

interface BedrockErrorBody {
  error?: { message?: string } | string;
  message?: string;
}

const REQUEST_TIMEOUT_MS = 60_000;

type RequiredEnv = 'AWS_REGION' | 'BEDROCK_MODEL_ID' | 'AWS_BEARER_TOKEN_BEDROCK';

function requireEnv(name: RequiredEnv): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env (see .env.example) or the process environment.`);
  }
  return value;
}

function readErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as BedrockErrorBody;
    if (typeof parsed.error === 'string') return parsed.error;
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {
    // Body is not JSON; use it as-is.
  }
  return body.trim();
}

/**
 * Amazon Bedrock's OpenAI-compatible Chat Completions API on the bedrock-mantle endpoint,
 * authenticated with a Bedrock API key sent as a bearer token.
 */
export async function chat(messages: ChatMessage[], options: { maxTokens: number; temperature: number }): Promise<string> {
  const region = requireEnv('AWS_REGION');
  const model = requireEnv('BEDROCK_MODEL_ID');
  const apiKey = requireEnv('AWS_BEARER_TOKEN_BEDROCK');

  const response = await fetch(`https://bedrock-mantle.${region}.api.aws/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: options.maxTokens, temperature: options.temperature }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(`Bedrock request failed (HTTP ${response.status}): ${readErrorMessage(rawBody)}`);
  }

  const content = (JSON.parse(rawBody) as ChatCompletionResponse).choices?.[0]?.message?.content;
  if (!content || !content.trim()) throw new Error('No text content in Bedrock response');
  return content;
}
