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
  servicePropsStr: string
  //Deprecated because it doesn't allow comments:
  //serviceProps: api.AIsServiceProps
}

export const defaultAIsServicePropsTemplateName: string = 'Dummy Chat'

export function getAIsServicePropsTemplateByName(name: string | undefined): AIsServicePropsTemplate | undefined {
  if (name === undefined) {
    return undefined
  }
  return allAIsServicePropsTemplate.find((template) => template.name === name)
}

const allAIsServicePropsTemplate: AIsServicePropsTemplate[] = [
  {
    name: 'Dummy Chat',
    description: 'Dummy Chat assistant - for testing',
    servicePropsStr:
`{
  serviceId: 'chat:dummy',
}`,
  },
  {
    name: 'OpenAI ChatGPT',
    description: 'OpenAI ChatGPT connector (default GPT version)',
    servicePropsStr:
`{
  serviceId: 'chat:openai.com',

  # If you use an OpenAI compatible server
  # (like Azure OpenAI GPT)
  # then set server URL here:
  #
  #url: 'https://<OPENAI-COMPATIBLE-SERVER-HOST>/v1/chat/completions',
}`,
  },
  {
    name: 'OpenAI ChatGPT-4',
    description: 'OpenAI ChatGPT connector (version GPT-4)',
    servicePropsStr:
`{
  serviceId: 'chat:openai.com/gpt-4',

  # If you use an OpenAI compatible server
  # (like Azure OpenAI GPT)
  # then set server URL here:
  #
  #url: 'https://<OPENAI-COMPATIBLE-SERVER-HOST>/v1/chat/completions',
}`,
  },
  {
    name: 'Google VertexAI Gemini',
    description: 'Google VertexAI Gemini connector (model \'gemini-pro\')',
    servicePropsStr:
`{
  serviceId: 'chat:gemini.vertexai.google.com',

  # If you use your own Google Cloud project/own API key
  # (https://aisbreaker.org/docs/ai-service-details/google-cloud-api-keys)
  # then set project+location here:
  #
  #project: "<YOUR-GOOGLE-CLOUD-PROJECT>",
  #location: "<YOUR-GOOGLE-CLOUD-LOCATION, e.g. 'us-central1'>",
}`,
  },
  {
    name: 'Huggingface conversational-task (e.g. "microsoft/DialoGPT-large")',
    description: 'Huggingface.co inference API for every conversational-task, e.g. for model "microsoft/DialoGPT-large"',
    servicePropsStr:
`{
  # serviceId: 'chat:huggingface.co/<HF-ACCOUNT>/<HF-MODEL>',
  serviceId: 'chat:huggingface.co/microsoft/DialoGPT-large',

  # Other examples:
  #serviceId: 'chat:huggingface.co/microsoft/DialoGPT-large',
  #serviceId: 'chat:huggingface.co/microsoft/DialoGPT-small',
  #serviceId: 'chat:huggingface.co/YOU/YourModel',
  #...
}`,
  },
  {
    name: 'Echo+Mirror Chat',
    description: 'Echo and mirror the user input - for testing',
    servicePropsStr:
`{
  serviceId: 'aisbreaker:mirror',
  forward2ServiceProps: {
    # this service should be mirrored
    # (every valid serviceId is possible here):
    serviceId: 'chat:echo',
  },
}`,
  },
]

export const allAIsServicePropsTemplateNameOptions: { label: string; key: string; value: string, tooltip: string }[] = 
  allAIsServicePropsTemplate.map((template) => {
    return { label: template.name, key: template.name, value: template.name, tooltip: template.description }
  }
)

export const defaultAisSystemPrompt = undefined

export const defaultAisCreativity = 0.0
