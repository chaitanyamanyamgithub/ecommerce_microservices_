const { resourceFromAttributes } = require('@opentelemetry/resources');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

const serviceName = process.env.OTEL_SERVICE_NAME || 'order-service';
const baseUrl = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318').replace(/\/$/, '');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': serviceName
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${baseUrl}/v1/traces`
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${baseUrl}/v1/metrics`
    }),
    exportIntervalMillis: 5000
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

try {
  sdk.start();
  console.log(`OpenTelemetry initialized for ${serviceName}`);
} catch (error) {
  console.error(`OpenTelemetry failed for ${serviceName}:`, error);
}

process.on('SIGTERM', () => {
  sdk.shutdown()
    .catch(() => {})
    .finally(() => process.exit(0));
});
