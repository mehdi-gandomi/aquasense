import type { ChatSnapshot } from '@/lib/chat-context';

export interface ChatPrompt {
  id: string;
  title: string;
  hint: string;
  prompt: string;
}

export function chatPrompts(snapshot?: ChatSnapshot): ChatPrompt[] {
  const plant = snapshot?.plant.shortName ?? 'this plant';
  return [
    {
      id: 'status',
      title: 'Plant status',
      hint: 'Health of the selected site',
      prompt: `Give me a concise operational status for ${plant}. Call out anything that is warning or critical.`,
    },
    {
      id: 'alarms',
      title: 'Sensors in alarm',
      hint: 'Instruments that need attention',
      prompt: `Which sensors are in alarm on ${plant}? List them with current values and what I should check first.`,
    },
    {
      id: 'effluent',
      title: 'Effluent quality',
      hint: 'Consent-relevant readings',
      prompt: `Summarise effluent / discharge quality for ${plant} from the live instruments. Flag anything near or over consent.`,
    },
    {
      id: 'checklist',
      title: 'First-look checklist',
      hint: 'What to inspect next',
      prompt: `Give me a first-look operator checklist for ${plant} based on the live sensors and alerts.`,
    },
  ];
}
