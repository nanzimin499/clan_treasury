export type AnalyticsEvent = {
  name: string;
  timestamp: string;
  payload: Record<string, string | number | boolean>;
};

const analyticsEvents: AnalyticsEvent[] = [];

export function trackEvent(
  name: string,
  payload: Record<string, string | number | boolean>
) {
  analyticsEvents.unshift({
    name,
    timestamp: new Date().toISOString(),
    payload
  });
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  return analyticsEvents;
}

export function clearAnalyticsEvents() {
  analyticsEvents.splice(0, analyticsEvents.length);
}

export function getAnalyticsSummary() {
  return {
    trackedEvents: analyticsEvents.length,
    walletEvents: analyticsEvents.filter((event) => event.name.includes("wallet")).length,
    contractEvents: analyticsEvents.filter((event) => event.name.includes("contract")).length
  };
}