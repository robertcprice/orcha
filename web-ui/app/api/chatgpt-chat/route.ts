/**
 * ChatGPT Chat API - Interactive conversation with GPT-5 for plans and insights
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages, model = 'gpt-5', temperature = 0.7, systemPrompt } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Build messages array with system prompt if provided
    const apiMessages: any[] = [];

    // Add system prompt (if model supports it)
    if (systemPrompt && !model.startsWith('o1')) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }

    // Add conversation history
    apiMessages.push(...messages);

    // Call OpenAI API
    // Note: GPT-5 and o1/o3 models have different parameter requirements:
    // - Use max_completion_tokens instead of max_tokens
    // - Temperature must be 1 (default) - cannot be customized
    const isGPT5 = model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3');
    const completion = await openai.chat.completions.create({
      model,
      messages: apiMessages,
      ...(isGPT5 ? {} : { temperature }), // GPT-5 doesn't support custom temperature
      ...(isGPT5 ? { max_completion_tokens: 4000 } : { max_tokens: 4000 }),
    });

    const response = completion.choices[0].message;

    return NextResponse.json({
      success: true,
      message: response.content,
      model: completion.model,
      usage: completion.usage,
    });

  } catch (error: any) {
    console.error('ChatGPT Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from ChatGPT' },
      { status: 500 }
    );
  }
}
