package com.devkit.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * 解析客户端 IP。仅当直连来自可信反向代理时才读取 X-Forwarded-For / X-Real-IP，
 * 防止攻击者伪造代理头绕过限流。
 */
@Component
public class ClientIpResolver {

    private final Set<String> trustedProxies;

    public ClientIpResolver(@Value("${devkit.trusted-proxies:}") String trustedProxiesConfig) {
        this.trustedProxies = parseTrusted(trustedProxiesConfig);
    }

    static Set<String> parseTrusted(String config) {
        if (config == null || config.isBlank()) {
            return Collections.emptySet();
        }
        Set<String> set = new HashSet<>();
        for (String part : config.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                set.add(trimmed);
            }
        }
        return Collections.unmodifiableSet(set);
    }

    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String remote = blankToUnknown(request.getRemoteAddr());
        if (!isTrustedProxy(remote)) {
            return remote;
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return remote;
    }

    boolean isTrustedProxy(String remoteAddr) {
        if (trustedProxies.isEmpty() || remoteAddr == null) {
            return false;
        }
        return trustedProxies.contains(remoteAddr);
    }

    private static String blankToUnknown(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }
}
