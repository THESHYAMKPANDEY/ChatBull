type OllamaMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OllamaChatRequest = {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_ctx?: number;
  };
};

type OllamaChatResponse = {
  message?: {
    role: 'assistant';
    content: string;
  };
};

const getOllamaBaseUrl = () => process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

export const ollamaChat = async (req: { model: string; messages: OllamaMessage[] }) => {
  const baseUrl = getOllamaBaseUrl();
  const body: OllamaChatRequest = {
    model: req.model,
    messages: req.messages,
    stream: false,
    options: {
      temperature: 0.4,
      top_p: 0.9,
      num_ctx: 2048,
    },
  };

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as OllamaChatResponse;
  const content = data?.message?.content?.trim();
  if (!response.ok || !content) {
    throw new Error('Local AI failed to respond');
  }
  return content;
};

