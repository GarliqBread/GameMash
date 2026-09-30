import { isIPv6 } from "node:net";

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;
const IPV6_GROUPS = 8;
const IPV6_PREFIX_GROUPS = 4;

const expandIPv6 = (address: string) => {
  const [head = "", tail = ""] = address.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const missing = IPV6_GROUPS - headGroups.length - tailGroups.length;
  return [...headGroups, ...Array.from({ length: missing }, () => "0"), ...tailGroups];
};

export const clientKey = (ip: string) => {
  const mapped = IPV4_MAPPED.exec(ip);
  if (mapped?.[1]) return mapped[1];
  const address = ip.split("%")[0] ?? ip;
  if (!isIPv6(address)) return ip;
  const prefix = expandIPv6(address)
    .slice(0, IPV6_PREFIX_GROUPS)
    .map((group) => group.toLowerCase().padStart(4, "0"));
  return `${prefix.join(":")}::/64`;
};
