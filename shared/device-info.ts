export function parseDeviceInfo(userAgent: string): string {
  if (!userAgent) return "Unknown Device";

  const isAndroid = userAgent.includes("Android");
  const isIOS = userAgent.includes("iPhone") || userAgent.includes("iPad");
  const isWindows = userAgent.includes("Windows");
  const isMac = userAgent.includes("Macintosh");
  const isLinux = userAgent.includes("Linux") && !isAndroid;
  const isChrome = userAgent.includes("Chrome") && !userAgent.includes("Edg");
  const isFirefox = userAgent.includes("Firefox");
  const isSafari = userAgent.includes("Safari") && !userAgent.includes("Chrome");
  const isEdge = userAgent.includes("Edg");

  let browserName = "Unknown Browser";
  if (isChrome) browserName = "Chrome";
  else if (isFirefox) browserName = "Firefox";
  else if (isSafari) browserName = "Safari";
  else if (isEdge) browserName = "Edge";

  if (isAndroid) {
    const version = userAgent.match(/Android (\d+(?:\.\d+)?)/)?.[1] || "Unknown";
    const model = userAgent.match(/;\s*([^)]+)\)/)?.[1].replace(/[;,]/g, "").trim() || "Unknown Device";
    return `${model} (Android ${version}) - ${browserName}`;
  }

  if (isIOS) {
    const version = userAgent.match(/OS (\d+(?:_\d+)*)/)?.[1].replace(/_/g, ".") || "Unknown";
    const device = userAgent.includes("iPad") ? "iPad" : userAgent.includes("iPhone") ? "iPhone" : "iOS Device";
    return `${device} (iOS ${version}) - ${browserName}`;
  }

  if (isWindows) {
    const version = userAgent.match(/Windows NT (\d+\.\d+)/)?.[1] || "Unknown";
    const windowsVersion = version === "10.0" ? "Windows 10" : version === "6.3" ? "Windows 8.1" : version === "6.1" ? "Windows 7" : `Windows NT ${version}`;
    return `${windowsVersion} Desktop - ${browserName}`;
  }

  if (isMac) {
    const version = userAgent.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/)?.[1].replace(/_/g, ".") || "Unknown";
    return `Mac Desktop (macOS ${version}) - ${browserName}`;
  }

  if (isLinux) return `Linux Desktop - ${browserName}`;
  return `Unknown Device - ${browserName}`;
}
