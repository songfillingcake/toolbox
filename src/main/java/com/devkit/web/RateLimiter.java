package com.devkit.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 按客户端 IP 的滑动窗口限流，带过期条目清理。
 */
public final class RateLimiter {

    private final int limitPerMinute;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimiter(int limitPerMinute) {
        this.limitPerMinute = limitPerMinute;
    }

    public void check(String clientKey) {
        String key = clientKey == null || clientKey.isBlank() ? "unknown" : clientKey;
        long now = System.currentTimeMillis();
        evictStale(now);
        Window window = windows.computeIfAbsent(key, k -> new Window(now));
        synchronized (window) {
            if (now - window.startMs > 60_000) {
                window.startMs = now;
                window.count.set(0);
            }
            if (window.count.incrementAndGet() > limitPerMinute) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
            }
        }
    }

    private void evictStale(long now) {
        if (windows.size() < 512) {
            return;
        }
        windows.entrySet().removeIf(e -> now - e.getValue().startMs > 120_000);
    }

    private static final class Window {
        volatile long startMs;
        final AtomicInteger count = new AtomicInteger(0);

        Window(long startMs) {
            this.startMs = startMs;
        }
    }
}
