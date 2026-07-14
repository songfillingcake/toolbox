package com.devkit.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FetchController {

    private static final RateLimiter RATE_LIMITER = new RateLimiter(30);

    private final ClientIpResolver clientIpResolver;

    public FetchController(ClientIpResolver clientIpResolver) {
        this.clientIpResolver = clientIpResolver;
    }

    @Value("${devkit.fetch.enabled:true}")
    private boolean fetchEnabled;

    @Value("${devkit.fetch.allow-localhost:false}")
    private boolean allowLocalhost;

    @GetMapping("/fetch")
    public Map<String, Object> fetch(@RequestParam String url, HttpServletRequest request) {
        if (!fetchEnabled) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "URL 拉取功能已禁用");
        }
        RATE_LIMITER.check(clientIpResolver.resolve(request));

        Map<String, Object> result = new LinkedHashMap<>();
        try {
            URI uri = URI.create(url.trim());
            String content = SafeHttpFetcher.fetch(uri, allowLocalhost);
            result.put("success", true);
            result.put("url", url);
            result.put("content", content);
            result.put("size", content.length());
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", e.getMessage());
        }
        return result;
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("fetchEnabled", fetchEnabled);
        cfg.put("fetchAllowLocalhost", allowLocalhost);
        cfg.put("version", DevKitVersion.VERSION);
        cfg.put("maxInputChars", 512 * 1024);
        cfg.put("maxDiffLines", 1500);
        return cfg;
    }
}
