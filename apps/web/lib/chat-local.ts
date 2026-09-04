import type { ChatSnapshot } from '@/lib/chat-context';
import type { LlmMessage } from '@/lib/llm';

function lastUserText(messages: LlmMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

function formatSensor(row: ChatSnapshot['sensors'][number]): string {
  return `- ${row.name} (${row.id}): ${row.value.toFixed(2)} ${row.unit} · ${row.severity}`;
}

export function localPlantBrief(messages: LlmMessage[], snapshot: ChatSnapshot): string {
  const q = lastUserText(messages).toLowerCase();
  const { plant, plants, counts, sensors, alerts } = snapshot;
  const flagged = sensors.filter((s) => s.severity === 'warning' || s.severity === 'critical');
  const lines: string[] = [];

  lines.push(`**${plant.shortName}** · ${plant.code} · ${plant.kind}`);
  lines.push(
    `${counts.total} instruments · ${counts.nominal} nominal · ${counts.warning} warning · ${counts.critical} critical.`,
  );

  if (q.includes('compare') || q.includes('fleet') || q.includes('all plant')) {
    lines.push('');
    lines.push('**Visible plants**');
    for (const p of plants) {
      const mark = p.id === plant.id ? ' (selected)' : '';
      lines.push(`- ${p.shortName} · ${p.kind}${mark}`);
    }
  }

  if (q.includes('alarm') || q.includes('alert') || q.includes('critical') || q.includes('warning')) {
    lines.push('');
    if (flagged.length === 0 && alerts.length === 0) {
      lines.push('No sensors are in alarm on this plant right now.');
    } else {
      if (flagged.length) {
        lines.push('**Sensors in alarm**');
        flagged.forEach((s) => lines.push(formatSensor(s)));
      }
      if (alerts.length) {
        lines.push('');
        lines.push('**Active alerts**');
        alerts.forEach((a) => lines.push(`- ${a.code}: ${a.message} (${a.severity})`));
      }
    }
  } else if (q.includes('effluent') || q.includes('consent') || q.includes('discharge') || q.includes('wqi')) {
    const effluent = sensors.filter(
      (s) =>
        s.id.includes('EFF') ||
        s.parameter.includes('tss') ||
        s.parameter.includes('bod') ||
        s.name.toLowerCase().includes('effluent'),
    );
    lines.push('');
    lines.push('**Effluent / consent-relevant tags**');
    if (effluent.length === 0) {
      lines.push('No effluent tags are in the live snapshot for this plant.');
    } else {
      effluent.forEach((s) => lines.push(formatSensor(s)));
    }
  } else if (q.includes('check') || q.includes('inspect') || q.includes('next')) {
    lines.push('');
    lines.push('**First-look checklist**');
    lines.push('1. Confirm plant selection and stream badge (LIVE vs SIM).');
    lines.push('2. Scan critical then warning instruments.');
    lines.push('3. Open the treatment stage that owns the worst tag.');
    lines.push('4. Ack or escalate any active alerts.');
    if (flagged[0]) {
      lines.push(`5. Start at ${flagged[0].name} — currently ${flagged[0].severity}.`);
    }
  } else {
    lines.push('');
    if (flagged.length) {
      lines.push('**Needs attention**');
      flagged.slice(0, 8).forEach((s) => lines.push(formatSensor(s)));
    } else {
      lines.push('All reported instruments are nominal on this snapshot.');
    }
    if (alerts.length) {
      lines.push('');
      lines.push('**Active alerts**');
      alerts.forEach((a) => lines.push(`- ${a.code}: ${a.message}`));
    }
  }

  lines.push('');
  lines.push(
    '_Local plant brief — the OpenAI-compatible LLM is not connected yet. Set `LLM_BASE_URL` on the web app to route questions to your model._',
  );

  return lines.join('\n');
}
