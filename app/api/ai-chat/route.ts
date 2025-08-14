// app/api/ai-chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()

    // Create research-focused system prompt
    const systemPrompt = `You are an AI research assistant helping with collaborative scientific research. 
    
Context about the current collaboration:
- Project: ${context.colab || 'Research Collaboration'}
- Description: ${context.description || 'No description provided'}
- Recent contributions: ${context.contributions ? context.contributions.join('; ') : 'None yet'}

You should:
1. Provide helpful research guidance and methodological advice
2. Suggest collaboration strategies and best practices
3. Help analyze research progress and identify gaps
4. Recommend relevant research directions
5. Be encouraging and constructive in your responses
6. Keep responses concise but informative (2-3 paragraphs max)

Remember: You're supporting collaborative research, so emphasize teamwork, peer review, and scientific rigor.`

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash:generateContent',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    })

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I\'m here to help with your research collaboration. I\'ll provide thoughtful, research-focused guidance to support your team\'s scientific work.' }],
        },
      ],
    })

    const result = await chat.sendMessage(message)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ response: text })

  } catch (error) {
    console.error('Gemini AI Error:', error)
    
    // Fallback responses for common research questions
    const fallbackResponses = {
      methodology: "Consider using mixed-methods research combining quantitative data collection with qualitative insights. Start with a literature review to identify gaps, then design your study methodology accordingly.",
      collaboration: "Effective research collaboration requires clear communication, defined roles, regular progress updates, and shared documentation. Consider using version control for your research materials.",
      analysis: "Based on your contributions, I'd recommend organizing your findings into themes, identifying patterns, and discussing implications with your team. Peer review is crucial at this stage.",
      default: "I'm here to help with your research! Feel free to ask about methodology, data analysis, collaboration strategies, or any other research-related questions."
    }

    const message_lower = (await request.json()).message?.toLowerCase() || ''
    let fallback = fallbackResponses.default

    if (message_lower.includes('method') || message_lower.includes('approach')) {
      fallback = fallbackResponses.methodology
    } else if (message_lower.includes('collaborat') || message_lower.includes('team')) {
      fallback = fallbackResponses.collaboration
    } else if (message_lower.includes('analyz') || message_lower.includes('result')) {
      fallback = fallbackResponses.analysis
    }

    return NextResponse.json({ response: fallback })
  }
}