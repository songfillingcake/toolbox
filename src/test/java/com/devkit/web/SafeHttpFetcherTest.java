package com.devkit.web;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SafeHttpFetcherTest {

    @Test
    void readLimitedTruncatesLargeStream() throws Exception {
        byte[] data = "x".repeat(SafeHttpFetcher.MAX_BYTES + 100).getBytes();
        String content = SafeHttpFetcher.readLimited(new java.io.ByteArrayInputStream(data));
        org.junit.jupiter.api.Assertions.assertTrue(content.contains("已截断"));
    }

    @Test
    void buildRequestPathIncludesQuery() {
        assertEquals("/api?q=1", SafeHttpFetcher.buildRequestPath(
                java.net.URI.create("https://example.com/api?q=1")));
        assertEquals("/", SafeHttpFetcher.buildRequestPath(
                java.net.URI.create("https://example.com")));
    }

    @Test
    void parseStatusLineRejectsRedirect() {
        assertThrows(IllegalArgumentException.class,
                () -> SafeHttpFetcher.parseStatusLine("HTTP/1.1 302 Found"));
    }

    @Test
    void readHttpBodyParsesSimpleResponse() throws Exception {
        String raw = "HTTP/1.1 200 OK\r\nContent-Length: 5\r\nConnection: close\r\n\r\nhello";
        String body = SafeHttpFetcher.readHttpBody(new java.io.ByteArrayInputStream(raw.getBytes()));
        assertEquals("hello", body);
    }
}
