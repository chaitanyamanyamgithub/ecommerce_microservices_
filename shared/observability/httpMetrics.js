const { metrics } = require('@opentelemetry/api');

const HTTP_DURATION_BUCKETS_SECONDS = [
  0.01,
  0.025,
  0.05,
  0.1,
  0.2,
  0.35,
  0.5,
  0.75,
  1,
  2.5,
  5
];

const httpInstrumentCache = new Map();
const runtimeMetricsRegistrations = new Set();

const normalizeRoute = (path = '/') => {
  if (!path || path === '') {
    return '/';
  }

  const normalizedPath = path
    .split('?')[0]
    .replace(/\/[0-9a-fA-F]{24}(?=\/|$)/g, '/:id')
    .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,36}(?=\/|$)/g, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[A-Za-z0-9_-]{12,}(?=\/|$)/g, '/:id');

  return normalizedPath === '' ? '/' : normalizedPath;
};

const getRouteLabel = (req) => {
  if (req.route && typeof req.route.path === 'string') {
    return normalizeRoute(`${req.baseUrl || ''}${req.route.path}`);
  }

  return normalizeRoute(req.originalUrl || req.url || req.path || '/');
};

const getStatusClass = (statusCode) => `${Math.floor(statusCode / 100)}xx`;

const getHttpInstruments = (serviceName) => {
  if (!httpInstrumentCache.has(serviceName)) {
    const meter = metrics.getMeter(serviceName);

    httpInstrumentCache.set(serviceName, {
      requestCounter: meter.createCounter('http_requests', {
        description: 'HTTP requests handled by the service.'
      }),
      requestDurationHistogram: meter.createHistogram('http_request_duration', {
        description: 'HTTP server request duration.',
        unit: 's',
        advice: {
          explicitBucketBoundaries: HTTP_DURATION_BUCKETS_SECONDS
        }
      })
    });
  }

  return httpInstrumentCache.get(serviceName);
};

const createHttpMetricsMiddleware = (serviceName) => {
  const { requestCounter, requestDurationHistogram } = getHttpInstruments(serviceName);

  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.once('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
      const statusCode = Number(res.statusCode) || 500;
      const baseAttributes = {
        service: serviceName,
        method: req.method,
        route: getRouteLabel(req),
        status_class: getStatusClass(statusCode)
      };

      requestCounter.add(1, {
        ...baseAttributes,
        status_code: String(statusCode)
      });
      requestDurationHistogram.record(durationSeconds, baseAttributes);
    });

    next();
  };
};

const registerRuntimeMetrics = (serviceName) => {
  if (runtimeMetricsRegistrations.has(serviceName)) {
    return;
  }

  runtimeMetricsRegistrations.add(serviceName);

  const meter = metrics.getMeter(serviceName);
  const attributes = { service: serviceName };
  const uptimeGauge = meter.createObservableGauge('service_uptime', {
    description: 'Process uptime reported by the service runtime.',
    unit: 's'
  });
  const cpuUsageGauge = meter.createObservableGauge('service_cpu_usage_ratio', {
    description: 'CPU usage of the service process as a ratio of a single CPU core.',
    unit: '1'
  });

  let previousCpuUsage = process.cpuUsage();
  let previousTimestamp = process.hrtime.bigint();

  meter.addBatchObservableCallback((observableResult) => {
    const now = process.hrtime.bigint();
    const elapsedSeconds = Number(now - previousTimestamp) / 1e9;
    const currentCpuUsage = process.cpuUsage();
    const cpuUsageMicros =
      (currentCpuUsage.user - previousCpuUsage.user) +
      (currentCpuUsage.system - previousCpuUsage.system);
    const cpuUsageRatio = elapsedSeconds > 0
      ? cpuUsageMicros / (elapsedSeconds * 1e6)
      : 0;

    previousCpuUsage = currentCpuUsage;
    previousTimestamp = now;

    observableResult.observe(uptimeGauge, process.uptime(), attributes);
    observableResult.observe(cpuUsageGauge, Math.max(cpuUsageRatio, 0), attributes);
  }, [uptimeGauge, cpuUsageGauge]);
};

module.exports = {
  createHttpMetricsMiddleware,
  registerRuntimeMetrics
};
