export type LogLevel = "INFO" | "WARN" | "ERROR";

type LogDetails = Record<string, unknown>;

function safeDetails(details?: LogDetails): LogDetails {
  return details ?? {};
}

export function createStructuredLogger(functionName: string, requestId?: string) {
  const resolvedRequestId = requestId ?? (crypto.randomUUID?.() ?? `${Date.now()}`);

  const emit = (
    level: LogLevel,
    step: string,
    businessPurpose: string,
    technicalDetails?: LogDetails,
  ) => {
    const payload = {
      ts: new Date().toISOString(),
      level,
      functionName,
      requestId: resolvedRequestId,
      step,
      businessPurpose,
      technicalDetails: safeDetails(technicalDetails),
    };

    if (level === "ERROR") {
      console.error(payload);
      return;
    }

    if (level === "WARN") {
      console.warn(payload);
      return;
    }

    console.log(payload);
  };

  return {
    requestId: resolvedRequestId,
    info: (step: string, businessPurpose: string, technicalDetails?: LogDetails) => {
      emit("INFO", step, businessPurpose, technicalDetails);
    },
    warn: (step: string, businessPurpose: string, technicalDetails?: LogDetails) => {
      emit("WARN", step, businessPurpose, technicalDetails);
    },
    error: (step: string, businessPurpose: string, technicalDetails?: LogDetails) => {
      emit("ERROR", step, businessPurpose, technicalDetails);
    },
  };
}
