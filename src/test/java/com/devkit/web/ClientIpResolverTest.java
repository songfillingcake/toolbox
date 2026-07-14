package com.devkit.web;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ClientIpResolverTest {

    @Test
    void ignoresForwardedHeadersWhenProxyNotTrusted() {
        ClientIpResolver resolver = new ClientIpResolver("");
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("203.0.113.10");
        req.addHeader("X-Forwarded-For", "1.2.3.4");
        assertEquals("203.0.113.10", resolver.resolve(req));
    }

    @Test
    void usesXffWhenRemoteIsTrustedProxy() {
        ClientIpResolver resolver = new ClientIpResolver("127.0.0.1");
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("127.0.0.1");
        req.addHeader("X-Forwarded-For", "198.51.100.5, 10.0.0.1");
        assertEquals("198.51.100.5", resolver.resolve(req));
    }

    @Test
    void usesXRealIpWhenTrustedAndNoXff() {
        ClientIpResolver resolver = new ClientIpResolver("10.0.0.2");
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.2");
        req.addHeader("X-Real-IP", "198.51.100.8");
        assertEquals("198.51.100.8", resolver.resolve(req));
    }

    @Test
    void parseTrustedSplitsCommaList() {
        assertTrue(ClientIpResolver.parseTrusted("127.0.0.1, ::1").contains("127.0.0.1"));
        assertFalse(new ClientIpResolver("").isTrustedProxy("127.0.0.1"));
    }
}
