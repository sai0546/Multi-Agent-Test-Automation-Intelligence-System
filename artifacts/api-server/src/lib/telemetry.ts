import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { SimpleSpanProcessor, ConsoleSpanExporter, BasicTracerProvider } from "@opentelemetry/sdk-trace-node";
import { trace, context, propagation, SpanStatusCode, type Span, type Tracer } from "@opentelemetry/api";

// Initialize a lightweight tracer (no external collector needed)
const provider = new BasicTracerProvider({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "matis-api",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
});

// Console exporter writes OTLP-compatible spans to stdout in development
if (process.env["NODE_ENV"] === "development") {
  provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
}

provider.register();

export const tracer: Tracer = trace.getTracer("matis-agents", "1.0.0");

export { trace, context, propagation, SpanStatusCode };
export type { Span };

/** Run fn inside a new span, setting error status on throw */
export async function withSpan<T>(
  name: string,
  attrs: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes(attrs);
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}
