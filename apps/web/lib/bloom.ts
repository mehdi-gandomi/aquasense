import { assessBloom, type BloomAssessment } from '@aquasense/shared';
import { getDisplay, getValue } from '@/lib/channels';

export function liveBloomAssessment(): BloomAssessment {
  return assessBloom({
    chlorophyll: getValue('HR-CHL-01'),
    phycocyanin: getValue('HR-PHY-01'),
    temperature: getValue('HR-TMP-01'),
    totalNitrogen: getValue('HR-TN-01'),
    totalPhosphorus: getValue('HR-TP-01'),
    secchi: getValue('HR-SDD-01'),
    dissolvedOxygen: getValue('HR-DO-01'),
    upstreamNitrogenLoad: getDisplay('EFF-TN-01') * getDisplay('EFF-FLW-01') * 0.024,
  });
}
