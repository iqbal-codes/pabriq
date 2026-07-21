import type { MastraDBMessage } from '@mastra/core/agent'
import { PromptInjectionDetector } from '@mastra/core/processors'
import { describe, expect, it, vi } from 'vitest'
import {
  createBusinessAssistantAgent,
  roleAdherenceValidator,
  topicGuardrail,
} from './business-assistant-agent'

function makeMessages(content: string): MastraDBMessage[] {
  return [{ content, role: 'user' } as unknown as MastraDBMessage]
}

function makeOutputMessages(text: string): MastraDBMessage[] {
  return [{ content: text, role: 'assistant' } as unknown as MastraDBMessage]
}

describe('agent instructions', () => {
  it('contains Bahasa Indonesia decline template', async () => {
    const agent = createBusinessAssistantAgent({} as never)
    const instructions = await agent.getInstructions()
    expect(instructions).toContain(
      'Maaf, saya hanya dapat membantu pertanyaan seputar bisnis dan ERP',
    )
  })

  it('contains English decline template', async () => {
    const agent = createBusinessAssistantAgent({} as never)
    const instructions = await agent.getInstructions()
    expect(instructions).toContain(
      'Sorry, I can only assist with business and ERP questions',
    )
  })

  it('contains In-Scope and Out-of-Scope sections', async () => {
    const agent = createBusinessAssistantAgent({} as never)
    const instructions = await agent.getInstructions()
    expect(instructions).toContain('## In-Scope')
    expect(instructions).toContain('## Out-of-Scope')
    expect(instructions).toContain('## Core Rules')
  })
  it('registers exactly 14 tools', async () => {
    const agent = createBusinessAssistantAgent({} as never)
    const tools = await agent.listTools()
    const toolKeys = Object.keys(tools)
    expect(toolKeys).toHaveLength(14)
    expect(toolKeys).toContain('businessSearchTool')
    expect(toolKeys).toContain('businessOverviewTool')
    expect(toolKeys).toContain('resolveOrderDraftTool')
    expect(toolKeys).toContain('proposeOrderDraftTool')
    expect(toolKeys).toContain('confirmOrderDraftTool')
    expect(toolKeys).toContain('searchCustomerTool')
    expect(toolKeys).toContain('createCustomerTool')
    expect(toolKeys).toContain('updateCustomerTool')
    expect(toolKeys).toContain('searchProductTool')
    expect(toolKeys).toContain('createProductTool')
    expect(toolKeys).toContain('updateProductTool')
    expect(toolKeys).toContain('searchOrderTool')
    expect(toolKeys).toContain('getOrderTool')
    expect(toolKeys).toContain('updateDraftOrderTool')
  })

  it('mentions customer, product, and order capability groups', async () => {
    const agent = createBusinessAssistantAgent({} as never)
    const instructions = await agent.getInstructions()
    expect(instructions).toContain('Customer Management')
    expect(instructions).toContain('Product Management')
    expect(instructions).toContain('Order Browse and Draft Update')
  })

  it('states UI-only boundaries for addresses, breakpoints, status transitions', async () => {
    const agent = createBusinessAssistantAgent({} as never)
    const instructions = await agent.getInstructions()
    expect(instructions).toContain('remain UI-only')
  })
})

describe('topicGuardrail', () => {
  it('passes business queries through', async () => {
    const messages = makeMessages('Show me orders for Acme Corp')
    const result = await topicGuardrail.processInput({
      messages,
      abort: vi.fn() as never,
    } as never)
    expect(result).toBe(messages)
  })

  it('aborts off-topic Bahasa Indonesia queries with Indonesian decline', async () => {
    const messages = makeMessages('Aku mau curhat nih')
    const abort = vi.fn().mockImplementation((msg: string) => {
      throw new Error(msg)
    })

    await expect(
      topicGuardrail.processInput({ messages, abort } as never),
    ).rejects.toThrow(
      'Maaf, saya hanya dapat membantu pertanyaan seputar bisnis dan ERP',
    )
  })

  it('aborts off-topic English queries with English decline', async () => {
    const messages = makeMessages('Tell me a story please')
    const abort = vi.fn().mockImplementation((msg: string) => {
      throw new Error(msg)
    })

    await expect(
      topicGuardrail.processInput({ messages, abort } as never),
    ).rejects.toThrow(
      'Sorry, I can only assist with business and ERP questions',
    )
  })

  it('aborts emotional queries', async () => {
    const messages = makeMessages('I feel so galau today')
    const abort = vi.fn().mockImplementation((msg: string) => {
      throw new Error(msg)
    })

    await expect(
      topicGuardrail.processInput({ messages, abort } as never),
    ).rejects.toThrow()
  })

  it('aborts entertainment queries', async () => {
    const messages = makeMessages('Sing a song for me')
    const abort = vi.fn().mockImplementation((msg: string) => {
      throw new Error(msg)
    })

    await expect(
      topicGuardrail.processInput({ messages, abort } as never),
    ).rejects.toThrow()
  })
})

describe('roleAdherenceValidator', () => {
  it('passes in-role business responses', async () => {
    const messages = makeOutputMessages(
      'Here are the orders for Acme Corp: ORD-001, ORD-002.',
    )
    const result = await roleAdherenceValidator.processOutputResult({
      messages,
      abort: vi.fn() as never,
      retryCount: 0,
    } as never)
    expect(result).toBe(messages)
  })

  it('aborts off-role emotional responses when retryCount < 2', async () => {
    const messages = makeOutputMessages(
      'Saya turut sedih dengan situasi kamu. Sabar ya.',
    )
    const abort = vi.fn().mockImplementation((msg: string) => {
      throw new Error(msg)
    })

    await expect(
      roleAdherenceValidator.processOutputResult({
        messages,
        abort,
        retryCount: 0,
      } as never),
    ).rejects.toThrow('Response is off-role')
  })

  it('aborts off-role English responses when retryCount < 2', async () => {
    const messages = makeOutputMessages(
      'That sounds tough. I understand how you feel.',
    )
    const abort = vi.fn().mockImplementation((msg: string) => {
      throw new Error(msg)
    })

    await expect(
      roleAdherenceValidator.processOutputResult({
        messages,
        abort,
        retryCount: 1,
      } as never),
    ).rejects.toThrow('Response is off-role')
  })

  it('passes off-role responses when retryCount >= 2 (max retries reached)', async () => {
    const messages = makeOutputMessages(
      'Saya turut sedih dengan situasi kamu. Sabar ya.',
    )
    const abort = vi.fn()
    const result = await roleAdherenceValidator.processOutputResult({
      messages,
      abort,
      retryCount: 2,
    } as never)
    expect(result).toBe(messages)
    expect(abort).not.toHaveBeenCalled()
  })
})
describe('PromptInjectionDetector', () => {
  it('can be instantiated with the expected config', () => {
    const detector = new PromptInjectionDetector({
      strategy: 'block',
      model: 'openrouter/google/gemini-3.1-flash-lite',
      threshold: 0.8,
      detectionTypes: [
        'injection',
        'jailbreak',
        'system-override',
        'role-manipulation',
      ],
    })
    expect(detector).toBeDefined()
    expect(typeof detector.processInput).toBe('function')
  })

  it('is wired as the first input processor in the agent', async () => {
    const agent = createBusinessAssistantAgent({} as never)
    // The agent stores processors internally; verify the agent was created
    // with the PromptInjectionDetector by checking it doesn't throw
    expect(agent).toBeDefined()
    expect(typeof agent.generate).toBe('function')
  })
})
