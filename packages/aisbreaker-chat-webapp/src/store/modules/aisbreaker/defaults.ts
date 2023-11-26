//import { api } from 'aisbreaker-core-browserjs'
import { api } from 'aisbreaker-api-js'


//
// default API URL - depends on the URL of this WebApp
//
const hostname = window.location.hostname
const protocol = window.location.protocol // 'http:' or 'https:'
console.log(`WebApp server 'protocol//hostname': '${protocol}//${hostname}'`)
export const defaultApiURL: string =
  (hostname == 'localhost' || hostname == '127.0.0.1') ?
  // testing with localhost
  'http://localhost:3000'
  :
  // production
  `${protocol}//api.${hostname}`
console.log(`defaultApiURL': '${defaultApiURL}'`)

//
// AIs Service Props Templates
//
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
    description: 'Dummy Chat assistant - for testing',
    serviceProps: {
      serviceId: 'chat:dummy',
    }
  },
  {
    name: 'Echo+Mirror Chat',
    description: 'Echo and mirror the user input - for testing',
    serviceProps: {
      serviceId: 'aisbreaker:mirror',
      forward2ServiceProps: {
          serviceId: 'chat:echo',
      },
    } as any
  },
  {
    name: 'Huggingface conversational-task: ANY/MODEL',
    description: 'Huggingface.co inference API for any conversational-task',
    serviceProps: {
      serviceId: 'chat:huggingface.co/ANY/MODEL',
    }
  },
  {
    name: 'Huggingface conversational-task: microsoft/DialoGPT-large',
    description: 'Huggingface.co inference API for any conversational-task: model microsoft/DialoGPT-large',
    serviceProps: {
      serviceId: 'chat:huggingface.co/microsoft/DialoGPT-large',
    }
  },
  {
    name: 'Huggingface conversational-task: microsoft/DialoGPT-small',
    description: 'Huggingface.co inference API for any conversational-task: model microsoft/DialoGPT-small',
    serviceProps: {
      serviceId: 'chat:huggingface.co/microsoft/DialoGPT-small',
    }
  },
  {
    name: 'OpenAI ChatGPT',
    description: 'OpenAI ChatGPT connector (default GPT version)',
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
    name: 'OpenAI ChatGPT compatible servers (like Azure OpenAI GPT)',
    description: 'OpenAI ChatGPT compatible connector, configure the URL of the alternative API server',
    serviceProps: {
      serviceId: 'chat:openai.com',
      url: 'https://api.openai.compatible.example.com/v1/chat/completions',
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
