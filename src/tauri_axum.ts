const { invoke } = window.__TAURI__.core

let localAppRequestCommand = 'local_app_request'

// 创建一个增强的 Response 类，支持自动 JSON 解析
class EnhancedResponse extends Response {
  private _jsonData?: any
  private _isJson: boolean

  constructor(body: string | null, init: ResponseInit & { isJson?: boolean }) {
    super(body, init)
    this._isJson = init.isJson || false
  }

  async json(): Promise<any> {
    if (this._jsonData) {
      return this._jsonData
    }

    if (!this._isJson) {
      throw new Error('Response is not JSON')
    }

    const text = await this.text()
    this._jsonData = JSON.parse(text)
    return this._jsonData
  }

  get isJson(): boolean {
    return this._isJson
  }
}

export function initialize(localAppRequestCommandOverride: string) {
  if (localAppRequestCommandOverride) {
    localAppRequestCommand = localAppRequestCommandOverride
  }

  proxyFetch()
}

function proxyFetch() {
  const originalFetch = window.fetch

  window.fetch = async (...args) => {
    const [url, options] = args
    if (url.startsWith('ipc://')) {
      return originalFetch(...args)
    }

    const request = {
      uri: url,
      method: options?.method || 'GET',
      headers: options?.headers || {},
      ...(options?.body && { body: options.body }),
    }
    let response = await invoke(localAppRequestCommand, {
      localRequest: request,
    })

    while ([301, 302, 303, 307, 308].includes(parseInt(response.status_code))) {
      const location = response.headers['location']

      const redirectRequest = {
        uri: location,
        method: 'GET',
        headers: {},
      }
      response = await invoke('local_app_request', {
        localRequest: redirectRequest,
      })
    }

    let bodyText
    if (response.body && response.body.length > 0) {
      const bodyByteArray = new Uint8Array(response.body)
      const decoder = new TextDecoder('utf-8')
      bodyText = decoder.decode(bodyByteArray)
    } else {
      bodyText = ''
    }

    const status = parseInt(response.status_code)
    const headers = new Headers(response.headers)

    // 自动检测并处理 JSON 响应
    const contentType = headers.get('content-type') || ''
    let finalBody = bodyText

    if (contentType.includes('application/json')) {
      // 如果是 JSON 响应，尝试解析并重新序列化以确保格式正确
      try {
        const jsonData = JSON.parse(bodyText)
        finalBody = JSON.stringify(jsonData)
        console.log('检测到 JSON 响应，已解析为对象:', jsonData)
      } catch (e) {
        // 如果解析失败，保持原始文本
        console.warn('Failed to parse JSON response:', e)
      }
    } else {
      console.log('response text:', bodyText)
    }

    console.log('contentType=', contentType)
    console.log('响应类型:', contentType.includes('application/json') ? 'JSON' : 'TEXT')

    // 创建增强的 Response 对象
    const isJson = contentType.includes('application/json')
    return new EnhancedResponse(finalBody, { status, headers, isJson })
  }
}
