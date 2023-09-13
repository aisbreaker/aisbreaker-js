//import { api } from 'aisbreaker-core-browserjs'
import { api } from 'aisbreaker-api-js'


// TODO:
export const defaultApiURL: string = 'http://localhost:3000'

export interface AIsServicePropsTemplate {
  name: string
  description: string
  serviceProps: api.AIsServiceProps
}

export const defaultAIsServicePropsTemplateName: string = 'Dummy Chat'

export function getAIsServicePropsTemplateByName(name: string | undefined): AIsServicePropsTemplate | undefined {
  if (name === undefined) {
    return undefined
  }
  return allAIsServicePropsTemplate.find((template) => template.name === name)
}

export const allAIsServicePropsTemplate: AIsServicePropsTemplate[] = [
  {
    name: 'Dummy Chat',
    description: 'Dummy Chat assistant for testing',
    serviceProps: {
      serviceId: 'chat:dummy',
    }
  },
  {
    name: 'OpenAI ChatGPT',
    description: 'OpenAI ChatGPT connector (default version)',
    serviceProps: {
      serviceId: 'chat:openai.com',
    }
  },
  {
    name: 'OpenAI ChatGPT-4',
    description: 'OpenAI ChatGPT connector (version GPT-4)',
    serviceProps: {
      serviceId: 'chat:openai.com/gpt-4',
    }
  },
  {
    name: 'OpenAI ChatGPT compatible server',
    description: 'OpenAI ChatGPT compatible connector, configure the URL of the alternative API server',
    serviceProps: {
      serviceId: 'chat:openai.com',
      url: 'https://api.openai.compatible.example.com/v1/chat/completions',
    }
  },
  {
    name: 'Echo+Mirror Chat',
    description: 'Echo and mirror the user input - for testing',
    serviceProps: {
      serviceId: 'aisbreaker:mirror',
      /*
      forward2ServiceProps: {
          serviceId: 'chat:openai.com',
      },
      */

    }
  },

]

export const allAIsServicePropsTemplateNameOptions: { label: string; key: string; value: string, tooltip: string }[] = 
  allAIsServicePropsTemplate.map((template) => {
    return { label: template.name, key: template.name, value: template.name, tooltip: template.description }
  }
)

export const defaultAisSystemPrompt = undefined

export const defaultAisCreativity = 0.0
