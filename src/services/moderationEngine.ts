import { ChatMessage, ModerationAnalysis, ModerationConfig } from '../types/squadshield';

/**
 * Evaluates an outgoing free-text message against configured moderation rules.
 * Note: Smart Moderation never permanently bans users automatically.
 * Suspicious messages are flagged with clear explanations for human moderator review.
 */
export function evaluateMessageModeration(
  rawText: string,
  senderId: string,
  recentMessages: ChatMessage[],
  config: ModerationConfig,
  now: number = Date.now()
): ModerationAnalysis {
  const normalized = rawText.trim().toLowerCase();
  const reasons: string[] = [];
  const matchedTerms: string[] = [];

  let ruleType: ModerationAnalysis['ruleType'] = null;
  let severity: ModerationAnalysis['severity'] = null;

  // 1. Check configured abusive words / phrases using word-boundary aware matching
  for (const word of config.blockedWords) {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) continue;

    const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    if (regex.test(normalized)) {
      matchedTerms.push(cleanWord);
    }
  }

  if (matchedTerms.length > 0) {
    ruleType = 'Abusive Language';
    severity = matchedTerms.length > 1 ? 'High' : 'Medium';
    reasons.push(
      `Matched ${matchedTerms.length} configured restricted term${matchedTerms.length > 1 ? 's' : ''}: "${matchedTerms.join('", "')}".`
    );
  }

  // 2. Check repeated spam (identical text sent recently or excessive repeated characters)
  if (config.detectRepeatedSpam) {
    const recentFromSender = recentMessages.filter(
      (msg) =>
        msg.senderId === senderId &&
        msg.kind === 'text' &&
        now - msg.createdAt <= 60_000
    );

    const duplicateCount = recentFromSender.filter(
      (msg) => msg.content.trim().toLowerCase() === normalized
    ).length;

    const hasRepeatedCharFlood = /(.)\1{6,}/.test(normalized);
    const words = normalized.split(/\s+/).filter(Boolean);
    const hasRepeatedWordSpam =
      words.length >= 4 &&
      words.every((w) => w === words[0]);

    if (duplicateCount >= 1) {
      if (!ruleType) ruleType = 'Spam Repetition';
      if (!severity) severity = 'Medium';
      reasons.push(
        `Identical message repeated within 60 seconds (${duplicateCount + 1} occurrences).`
      );
    } else if (hasRepeatedCharFlood || hasRepeatedWordSpam) {
      if (!ruleType) ruleType = 'Spam Repetition';
      if (!severity) severity = 'Low';
      reasons.push(
        hasRepeatedWordSpam
          ? 'Detected repetitive single-word spam pattern.'
          : 'Detected excessive repeated-character flooding.'
      );
    }
  }

  // 3. Check message flooding rate
  if (config.detectFlooding) {
    const windowMs = config.floodWindowSeconds * 1000;
    const windowMessages = recentMessages.filter(
      (msg) =>
        msg.senderId === senderId &&
        msg.kind === 'text' &&
        now - msg.createdAt <= windowMs
    );

    if (windowMessages.length >= config.floodThresholdCount) {
      if (!ruleType) ruleType = 'Message Flooding';
      if (!severity) severity = 'Medium';
      reasons.push(
        `Sent ${windowMessages.length + 1} free-text messages within ${config.floodWindowSeconds} seconds (threshold: ${config.floodThresholdCount}).`
      );
    }
  }

  return {
    flagged: reasons.length > 0,
    ruleType,
    severity,
    reasons,
    matchedTerms,
  };
}
