import type { SafetyCheckResult, SafetyFlag } from '@coach-keith/shared/types/coaching';

/**
 * Crisis severity levels, from concerning to immediate danger.
 */
export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CrisisDetection {
  detected: boolean;
  severity: CrisisSeverity;
  indicators: string[];
  suggestedAction: string;
}

export interface CrisisResource {
  name: string;
  contact: string;
  description: string;
  availability: string;
}

/**
 * Pattern definitions for detecting crisis signals in user messages.
 */
const CRISIS_PATTERNS = {
  selfHarm: [
    /\b(kill\s*(my|him|her)?self|suicide|suicidal|end\s*(it|my\s*life)|don'?t\s*want\s*to\s*(be\s*here|live|exist)|better\s*off\s*(without\s*me|dead))\b/i,
    /\b(want\s*to\s*die|rather\s*(be\s*)?dead|no\s*(point|reason)\s*(in\s*)?(living|going\s*on))\b/i,
    /\b(self[- ]?harm|cut(ting)?\s*(my)?self|hurt(ing)?\s*(my)?self)\b/i,
  ],
  violence: [
    /\b(kill\s*(her|him|them|my\s*(wife|kids?))|hurt\s*(her|him|them)|hit\s*(her|him|my\s*wife))\b/i,
    /\b(going\s*to\s*(snap|lose\s*it|explode)|can'?t\s*control\s*(my\s*)?(anger|rage|temper))\b/i,
    /\b(gun|weapon|firearm)\b.*\b(use|get|bring)\b/i,
  ],
  domesticViolence: [
    /\b(she\s*(hits?|beats?|attacks?|threatens?)\s*me|he\s*(hits?|beats?|attacks?|threatens?)\s*(her|me))\b/i,
    /\b(domestic\s*(violence|abuse)|physically\s*(abusive?|violent)|chok(e[ds]?|ing))\b/i,
    /\b(afraid\s*(of|for)\s*(my\s*)?(life|safety|her|him))\b/i,
  ],
  childAbuse: [
    /\b(hit(ting)?\s*(the|my)\s*kid|hurt(ing)?\s*(the|my)\s*(child|kid|son|daughter))\b/i,
    /\b(child\s*abuse|abus(e|ing)\s*(the|my)\s*(child|kid))\b/i,
  ],
  substanceAbuse: [
    /\b(overdos(e|ing)|can'?t\s*stop\s*drinking|drunk\s*(every|all)|blackout|blacking\s*out)\b/i,
    /\b(relapse[d]?|using\s*(again|drugs?|meth|heroin|cocaine|pills?))\b/i,
  ],
} as const;

/**
 * Patterns that indicate potentially harmful AI responses.
 */
const HARMFUL_RESPONSE_PATTERNS = [
  /\b(you\s*should\s*(leave|divorce)\s*(your\s*)?wife)\b/i,
  /\b(women\s*are\s*(all|just)|she\s*deserves?\s*(it|what\s*she\s*gets?))\b/i,
  /\b(make\s*her\s*(jealous|pay|suffer)|punish\s*her)\b/i,
  /\b(red\s*pill|alpha\s*male\s*dominance|pickup\s*artist)\b/i,
  /\b(manipulat(e|ion)\s*(her|your\s*wife|women))\b/i,
  /\b(gaslight(ing)?|love\s*bomb(ing)?|silent\s*treatment\s*as\s*strategy)\b/i,
];

export class SafetyGuardrails {
  /**
   * Pre-check a user message for crisis indicators before generating a response.
   */
  checkMessage(message: string): SafetyCheckResult {
    const flags: SafetyFlag[] = [];
    const resourcesProvided: string[] = [];

    const crisis = this.detectCrisis(message);

    if (crisis.detected) {
      flags.push('crisis_detected');

      if (crisis.severity === 'high' || crisis.severity === 'critical') {
        const resources = this.getCrisisResources();
        resourcesProvided.push(...resources.map((r) => `${r.name}: ${r.contact}`));
      }
    }

    return {
      passed: !crisis.detected || crisis.severity === 'low',
      flags,
      resourcesProvided: resourcesProvided.length > 0 ? resourcesProvided : undefined,
    };
  }

  /**
   * Post-check an AI response for harmful content before delivering to user.
   */
  checkResponse(response: string): SafetyCheckResult {
    const flags: SafetyFlag[] = [];

    for (const pattern of HARMFUL_RESPONSE_PATTERNS) {
      if (pattern.test(response)) {
        flags.push('harmful_content');
        break;
      }
    }

    // Check for manipulation tactics
    if (this.detectManipulationAdvice(response)) {
      flags.push('manipulation_detected');
    }

    return {
      passed: flags.length === 0,
      flags,
    };
  }

  /**
   * Detect crisis indicators in a message and return severity + details.
   */
  detectCrisis(message: string): CrisisDetection {
    const indicators: string[] = [];
    let maxSeverity: CrisisSeverity = 'low';

    // Self-harm — always critical
    for (const pattern of CRISIS_PATTERNS.selfHarm) {
      if (pattern.test(message)) {
        indicators.push('self-harm or suicidal ideation');
        maxSeverity = 'critical';
      }
    }

    // Violence toward others — critical
    for (const pattern of CRISIS_PATTERNS.violence) {
      if (pattern.test(message)) {
        indicators.push('potential violence toward others');
        maxSeverity = 'critical';
      }
    }

    // Domestic violence — high
    for (const pattern of CRISIS_PATTERNS.domesticViolence) {
      if (pattern.test(message)) {
        indicators.push('domestic violence');
        if (maxSeverity !== 'critical') maxSeverity = 'high';
      }
    }

    // Child abuse — critical
    for (const pattern of CRISIS_PATTERNS.childAbuse) {
      if (pattern.test(message)) {
        indicators.push('child abuse concern');
        maxSeverity = 'critical';
      }
    }

    // Substance abuse — high
    for (const pattern of CRISIS_PATTERNS.substanceAbuse) {
      if (pattern.test(message)) {
        indicators.push('substance abuse crisis');
        if (maxSeverity !== 'critical') maxSeverity = 'high';
      }
    }

    const detected = indicators.length > 0;

    let suggestedAction = 'continue normal coaching';
    if (maxSeverity === 'critical') {
      suggestedAction = 'immediately provide crisis resources and recommend professional help';
    } else if (maxSeverity === 'high') {
      suggestedAction = 'provide crisis resources and gently recommend professional support';
    } else if (detected) {
      suggestedAction = 'monitor closely and check in on safety';
    }

    return {
      detected,
      severity: detected ? maxSeverity : 'low',
      indicators,
      suggestedAction,
    };
  }

  /**
   * Return crisis resource hotlines and contacts.
   */
  getCrisisResources(): CrisisResource[] {
    return [
      {
        name: 'Suicide & Crisis Lifeline',
        contact: '988 (call or text)',
        description: 'Free, confidential support for people in distress',
        availability: '24/7',
      },
      {
        name: 'Crisis Text Line',
        contact: 'Text HOME to 741741',
        description: 'Free crisis counseling via text message',
        availability: '24/7',
      },
      {
        name: 'National Domestic Violence Hotline',
        contact: '1-800-799-7233',
        description: 'Support for domestic violence situations',
        availability: '24/7',
      },
      {
        name: 'SAMHSA National Helpline',
        contact: '1-800-662-4357',
        description: 'Substance abuse and mental health treatment referral',
        availability: '24/7, 365 days/year',
      },
      {
        name: 'Childhelp National Child Abuse Hotline',
        contact: '1-800-422-4453',
        description: 'Crisis intervention and support for child abuse',
        availability: '24/7',
      },
    ];
  }

  /**
   * Detect if a response contains manipulation tactics or unhealthy advice.
   */
  private detectManipulationAdvice(response: string): boolean {
    const manipulationPatterns = [
      /\b(withhold\s*(affection|sex|love)\s*(to|as\s*a)\s*(punish|teach|leverage))\b/i,
      /\b(make\s*her\s*(chase|beg|earn)|dread\s*game)\b/i,
      /\b(ignore\s*her\s*(to|so\s*she)|withdraw\s*(attention|love)\s*(strategically|on\s*purpose))\b/i,
      /\b(play\s*(hard\s*to\s*get|mind\s*games)|emotional\s*leverage)\b/i,
    ];

    return manipulationPatterns.some((p) => p.test(response));
  }
}
