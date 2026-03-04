const BOLNA_API_BASE = 'https://api.bolna.ai/v2';
const BOLNA_CALL_URL = 'https://api.bolna.ai/call';

function getApiKey(): string {
  const key = process.env.BOLNA_API_KEY;
  if (!key) throw new Error('BOLNA_API_KEY not set');
  return key;
}

export interface AgentConfig {
  agentName: string;
  webhookUrl: string;
  welcomeMessage?: string;
  systemPrompt?: string;
}

export async function createAgent(config: AgentConfig) {
  const res = await fetch(`${BOLNA_API_BASE}/agent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_config: {
        agent_name: config.agentName,
        agent_welcome_message: config.welcomeMessage || 'Hi! This is Pulse from FieldPulse. Ready for a quick check-in?',
        webhook_url: config.webhookUrl,
        agent_type: 'other',
        tasks: [
          {
            task_type: 'conversation',
            tools_config: {
              llm_agent: {
                agent_type: 'simple_llm_agent',
                agent_flow_type: 'streaming',
                llm_config: {
                  agent_flow_type: 'streaming',
                  provider: 'openai',
                  family: 'openai',
                  model: 'gpt-4.1-mini',
                  max_tokens: 150,
                  presence_penalty: 0,
                  frequency_penalty: 0,
                  temperature: 0.3,
                  top_p: 0.9,
                  request_json: false,
                },
              },
              synthesizer: {
                provider: 'elevenlabs',
                provider_config: {
                  voice: 'Nila',
                  voice_id: 'V9LCAAi4tTlqe9JadbCo',
                  model: 'eleven_turbo_v2_5',
                },
                stream: true,
                buffer_size: 250,
                audio_format: 'wav',
              },
              transcriber: {
                provider: 'deepgram',
                model: 'nova-3',
                language: 'hi',
                stream: true,
                sampling_rate: 16000,
                encoding: 'linear16',
                endpointing: 250,
              },
              input: { provider: 'plivo', format: 'wav' },
              output: { provider: 'plivo', format: 'wav' },
            },
            toolchain: {
              execution: 'parallel',
              pipelines: [['transcriber', 'llm', 'synthesizer']],
            },
            task_config: {
              hangup_after_silence: 10,
              incremental_delay: 400,
              number_of_words_for_interruption: 2,
              call_terminate: 300,
              backchanneling: false,
              ambient_noise: false,
              voicemail: false,
            },
          },
        ],
      },
      agent_prompts: {
        task_1: {
          system_prompt: config.systemPrompt || '',
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bolna createAgent failed (${res.status}): ${text}`);
  }

  return res.json();
}

export interface CallUserData {
  rep_name: string;
  company_name: string;
  territory_name: string;
  store_list: string;
  last_call_context: string;
}

export async function makeCall(agentId: string, phone: string, userData: CallUserData) {
  const res = await fetch(BOLNA_CALL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: agentId,
      recipient_phone_number: phone,
      user_data: userData,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bolna makeCall failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{ message: string; status: string; execution_id: string }>;
}

export async function getExecution(agentId: string, executionId: string) {
  const res = await fetch(`${BOLNA_API_BASE}/agent/${agentId}/executions/${executionId}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bolna getExecution failed (${res.status}): ${text}`);
  }

  return res.json();
}
