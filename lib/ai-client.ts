/**
 * AI Client for BC Docker Troubleshooting
 * Uses Anthropic Claude API for intelligent assistance
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIMessage, TroubleshootingContext } from './types';

// Initialize Anthropic client - API key is optional (checked at runtime)
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
};

const SYSTEM_PROMPT = `You are an expert IT support assistant specializing in Microsoft Dynamics 365 Business Central Docker containers. You help users troubleshoot issues, explain concepts, and provide solutions.

Your knowledge includes:
- Business Central container deployment and configuration
- BcContainerHelper PowerShell module
- Docker Engine on Windows
- SQL Server database operations
- BC web client and development services
- Common BC container errors and their solutions

When helping users:
1. Ask clarifying questions if the issue is unclear
2. Provide step-by-step solutions
3. Explain why errors occur
4. Suggest preventive measures
5. Reference specific commands or scripts when helpful

Common issues you can help with:
- Container won't start (check Docker, memory, ports)
- Web client inaccessible (SSL, hosts file, port mappings)
- Database backup/restore issues
- Performance problems
- License issues
- Extension deployment failures

Format your responses with:
- Clear headings for different sections
- Code blocks for commands
- Bullet points for steps
- Bold for important warnings`;

/**
 * Sends a message to the AI assistant
 */
export async function sendMessage(
  messages: AIMessage[],
  context?: TroubleshootingContext
): Promise<string> {
  // Build context message if provided
  let contextMessage = '';
  if (context) {
    if (context.containerName) {
      contextMessage += `\n\nContext: Working with container "${context.containerName}"`;
    }
    if (context.errorLog) {
      contextMessage += `\n\nRecent error log:\n\`\`\`\n${context.errorLog.slice(0, 2000)}\n\`\`\``;
    }
    if (context.action) {
      contextMessage += `\n\nUser was trying to: ${context.action}`;
    }
  }

  // Convert messages to Anthropic format
  const anthropicMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'user' && contextMessage && m === messages[messages.length - 1]
      ? m.content + contextMessage
      : m.content,
  }));

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: anthropicMessages,
  });

  // Extract text content
  const textContent = response.content.find(c => c.type === 'text');
  return textContent?.text || 'I apologize, but I was unable to generate a response.';
}

/**
 * Analyzes an error log and provides diagnosis
 */
export async function analyzeError(errorLog: string, containerName?: string): Promise<string> {
  const prompt = `Analyze this Business Central container error and provide:
1. What the error means
2. Likely causes
3. Step-by-step solution
4. How to prevent it in the future

${containerName ? `Container: ${containerName}` : ''}

Error log:
\`\`\`
${errorLog.slice(0, 3000)}
\`\`\``;

  const messages: AIMessage[] = [{
    id: 'error-analysis',
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString(),
  }];

  return sendMessage(messages);
}

/**
 * Generates a troubleshooting checklist for common issues
 */
export async function getTroubleshootingChecklist(issue: string): Promise<string> {
  const prompt = `Generate a troubleshooting checklist for this BC container issue: "${issue}"

Provide a numbered list of diagnostic steps with:
- What to check
- The command or action to perform
- What the expected vs problematic result looks like
- How to fix if that step reveals the problem`;

  const messages: AIMessage[] = [{
    id: 'checklist',
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString(),
  }];

  return sendMessage(messages);
}

/**
 * Explains a BC concept
 */
export async function explainConcept(concept: string): Promise<string> {
  const prompt = `Explain this Business Central container concept in simple terms: "${concept}"

Include:
- What it is
- Why it matters
- How it works in BC containers
- Common related issues`;

  const messages: AIMessage[] = [{
    id: 'explain',
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString(),
  }];

  return sendMessage(messages);
}
