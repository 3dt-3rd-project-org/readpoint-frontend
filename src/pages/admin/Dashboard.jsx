import { authenticateToken } from './auth.js'
import { app } from '@azure/functions'

function timespanToKusto(timespan) {
  const map = {
    'PT30M': '30m',
    'PT1H': '1h',
    'PT6H': '6h',
    'PT12H': '12h',
    'P1D': '1d',
    'P3D': '3d',
    'P7D': '7d',
  }
  return map[timespan] || '1h'
}

function handleError(err, context) {
  const message = err.message || ''
  context.log(`[Insights] 오류: ${message}`)

  if (message.includes('applicationinsights') || message.includes('fetch')) {
    return {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Application Insights 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' })
    }
  }

  return {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' })
  }
}

function safeJson(res, label, context) {
  if (!res.ok) {
    context.log(`[Insights] ${label} fetch 실패: ${res.status}`)
    return null
  }
  return res.json().catch(err => {
    context.log(`[Insights] ${label} JSON 파싱 실패: ${err.message}`)
    return null
  })
}

app.http('getInsights', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'insights',
  handler: async (request, context) => {
    try {
      authenticateToken(request)
    } catch (err) {
      return {
        status: err.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(err.body)
      }
    }

    context.log('[Insights] Application Insights 데이터 조회 시작')
    try {
      const appId = process.env.APPINSIGHTS_APP_ID
      const apiKey = process.env.APPINSIGHTS_API_KEY

      if (!appId || !apiKey) {
        context.log('[Insights] 환경변수 누락: APPINSIGHTS_APP_ID 또는 APPINSIGHTS_API_KEY')
        return {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: '서버 설정 오류가 발생했습니다.' })
        }
      }

      const timespan = request.query.get('timespan') || 'PT1H'
      const kustoTimespan = timespanToKusto(timespan)

      const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
      const queryUrl = `https://api.applicationinsights.io/v1/apps/${appId}/query`

      const [requestsRes, failedRes, durationRes, byOperationRes, failedDetailRes] = await Promise.allSettled([
        fetch(`https://api.applicationinsights.io/v1/apps/${appId}/metrics/requests/count?timespan=${timespan}`, { headers }),
        fetch(queryUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `requests | where timestamp > ago(${kustoTimespan}) | where toint(resultCode) >= 400 | count`
          })
        }),
        fetch(`https://api.applicationinsights.io/v1/apps/${appId}/metrics/requests/duration?timespan=${timespan}&aggregation=avg`, { headers }),
        fetch(queryUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `requests | where timestamp > ago(${kustoTimespan}) | summarize count() by name | order by count_ desc | take 20`
          })
        }),
        fetch(queryUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `requests | where timestamp > ago(${kustoTimespan}) | where toint(resultCode) >= 400 | project timestamp, name, resultCode, duration | order by timestamp desc | take 20`
          })
        }),
      ])

      const getValue = (settled, label) => {
        if (settled.status === 'rejected') {
          context.log(`[Insights] ${label} fetch 실패: ${settled.reason}`)
          return null
        }
        return settled.value
      }

      const [requestsData, failedData, durationData, byOperationData, failedDetailData] = await Promise.all([
        safeJson(getValue(requestsRes, 'requests/count') || { ok: false, status: 0 }, 'requests/count', context),
        safeJson(getValue(failedRes, 'failedCount') || { ok: false, status: 0 }, 'failedCount', context),
        safeJson(getValue(durationRes, 'duration') || { ok: false, status: 0 }, 'duration', context),
        safeJson(getValue(byOperationRes, 'byOperation') || { ok: false, status: 0 }, 'byOperation', context),
        safeJson(getValue(failedDetailRes, 'failedDetail') || { ok: false, status: 0 }, 'failedDetail', context),
      ])

      const totalRequests = requestsData?.value?.['requests/count']?.sum || 0
      const failedRequests = failedData?.tables?.[0]?.rows?.[0]?.[0] || 0
      const avgResponseTime = durationData?.value?.['requests/duration']?.avg || 0
      const successRate = totalRequests > 0
        ? Math.round(((totalRequests - failedRequests) / totalRequests) * 1000) / 10
        : 0

      const requestsByOperation = (byOperationData?.tables?.[0]?.rows || [])
        .map(row => ({ name: row[0], requests: row[1] }))
        .filter(item => /^(GET|POST|PUT|DELETE|PATCH)\s/.test(item.name))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10)

      const failedDetails = (failedDetailData?.tables?.[0]?.rows || [])
        .map(row => ({ timestamp: row[0], name: row[1], resultCode: row[2], duration: row[3] }))
        .filter(item => !/^(GET|POST|PUT|DELETE|PATCH)\s/.test(item.name))

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalRequests,
          failedRequests,
          avgResponseTime,
          successRate,
          requestsByOperation,
          failedDetails,
        })
      }
    } catch (err) {
      return handleError(err, context)
    }
  }
})