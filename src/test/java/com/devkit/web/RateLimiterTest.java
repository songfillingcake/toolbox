package com.devkit.web;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RateLimiterTest {

    @Test
    void allowsUpToLimit() {
        RateLimiter limiter = new RateLimiter(3);
        assertDoesNotThrow(() -> {
            limiter.check("client-a");
            limiter.check("client-a");
            limiter.check("client-a");
        });
    }

    @Test
    void rejectsOverLimit() {
        RateLimiter limiter = new RateLimiter(2);
        limiter.check("client-b");
        limiter.check("client-b");
        assertThrows(ResponseStatusException.class, () -> limiter.check("client-b"));
    }

    @Test
    void isolatesClients() {
        RateLimiter limiter = new RateLimiter(1);
        limiter.check("x");
        assertDoesNotThrow(() -> limiter.check("y"));
    }

    @Test
    void treatsNullAsUnknown() {
        RateLimiter limiter = new RateLimiter(1);
        limiter.check(null);
        assertThrows(ResponseStatusException.class, () -> limiter.check(null));
    }
}
