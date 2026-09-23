type LogFields = Record<string, unknown>;

function writeLog(
  level: "info" | "error",
  event: string,
  fields: LogFields = {},
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

export const logger = {
  info(event: string, fields?: LogFields) {
    writeLog("info", event, fields);
  },

  error(event: string, fields?: LogFields) {
    writeLog("error", event, fields);
  },
};
