package com.devkit.web;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;

/**
 * URL 拉取安全校验，防止 SSRF。
 */
public final class FetchUrlValidator {

    private FetchUrlValidator() {
    }

    public static void validate(URI uri, boolean allowLocalhost) {
        if (uri == null) {
            throw new IllegalArgumentException("URL 不能为空");
        }
        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("仅支持 http/https 协议");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("URL 缺少主机名");
        }
        String lowerHost = host.toLowerCase(Locale.ROOT);
        if (lowerHost.equals("localhost") || lowerHost.endsWith(".localhost")) {
            if (!allowLocalhost) {
                throw new IllegalArgumentException("禁止访问 localhost（可在配置中开启 devkit.fetch.allow-localhost）");
            }
            return;
        }
        if (isBlockedLiteralHost(lowerHost, allowLocalhost)) {
            throw new IllegalArgumentException("禁止访问内网或保留地址: " + host);
        }
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress address : addresses) {
                if (isBlockedAddress(address, allowLocalhost)) {
                    throw new IllegalArgumentException("禁止访问内网地址: " + host);
                }
            }
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("无法解析主机: " + host);
        }
    }

    /**
     * 解析 DNS 并返回首个通过校验的地址，供建连时绑定 IP（避免连接时二次解析到内网）。
     */
    public static InetAddress resolveValidatedAddress(String host, boolean allowLocalhost) {
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("URL 缺少主机名");
        }
        String lowerHost = host.toLowerCase(Locale.ROOT);
        if (lowerHost.equals("localhost") || lowerHost.endsWith(".localhost")) {
            if (!allowLocalhost) {
                throw new IllegalArgumentException("禁止访问 localhost");
            }
        } else if (isBlockedLiteralHost(lowerHost, allowLocalhost)) {
            throw new IllegalArgumentException("禁止访问内网或保留地址: " + host);
        }
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            if (addresses.length == 0) {
                throw new IllegalArgumentException("无法解析主机: " + host);
            }
            for (InetAddress address : addresses) {
                if (isBlockedAddress(address, allowLocalhost)) {
                    throw new IllegalArgumentException("禁止访问内网地址: " + host);
                }
            }
            return addresses[0];
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("无法解析主机: " + host);
        }
    }

    /** 复核单个解析结果（单测 / 扩展用） */
    public static void validateResolvedAddress(InetAddress address, boolean allowLocalhost) {
        if (address == null) {
            throw new IllegalArgumentException("无法解析目标地址");
        }
        if (isBlockedAddress(address, allowLocalhost)) {
            throw new IllegalArgumentException("目标解析到禁止访问的地址: " + address.getHostAddress());
        }
    }

    private static boolean isBlockedLiteralHost(String host, boolean allowLocalhost) {
        if (!allowLocalhost && (host.equals("127.0.0.1") || host.equals("0.0.0.0") || host.equals("::1"))) {
            return true;
        }
        return host.equals("metadata.google.internal")
                || host.equals("169.254.169.254");
    }

    private static boolean isBlockedAddress(InetAddress address, boolean allowLocalhost) {
        if (address.isAnyLocalAddress() || address.isLinkLocalAddress() || address.isSiteLocalAddress()) {
            return !allowLocalhost || !address.isLoopbackAddress();
        }
        if (address.isLoopbackAddress()) {
            return !allowLocalhost;
        }
        byte[] raw = address.getAddress();
        if (raw.length == 16) {
            // Unique local fc00::/7
            if ((raw[0] & 0xfe) == 0xfc) {
                return true;
            }
            // Link-local fe80::/10
            if ((raw[0] & 0xff) == 0xfe && (raw[1] & 0xc0) == 0x80) {
                return true;
            }
        }
        if (raw.length == 4) {
            int b0 = raw[0] & 0xFF;
            int b1 = raw[1] & 0xFF;
            // 10.0.0.0/8
            if (b0 == 10) return true;
            // 172.16.0.0/12
            if (b0 == 172 && b1 >= 16 && b1 <= 31) return true;
            // 192.168.0.0/16
            if (b0 == 192 && b1 == 168) return true;
            // 169.254.0.0/16 link-local
            if (b0 == 169 && b1 == 254) return true;
            // 127.0.0.0/8
            if (b0 == 127 && !allowLocalhost) return true;
        }
        return false;
    }
}
