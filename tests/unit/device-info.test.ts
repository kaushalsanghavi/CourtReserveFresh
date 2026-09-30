import { describe, expect, it } from "vitest";
import { parseDeviceInfo } from "../../shared/device-info";

describe("parseDeviceInfo", () => {
  it("formats desktop browser device information", () => {
    expect(parseDeviceInfo("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36"))
      .toBe("Mac Desktop (macOS 10.15.7) - Chrome");
    expect(parseDeviceInfo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/140.0"))
      .toBe("Windows 10 Desktop - Edge");
  });

  it("formats mobile device information", () => {
    expect(parseDeviceInfo("Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile Safari/604.1"))
      .toBe("iPhone (iOS 18.6.1) - Safari");
  });
});
