package com.devkit.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/cron")
public class CronController {

    private static final RateLimiter RATE_LIMITER = new RateLimiter(60);

    private final CronService cronService = new CronService();
    private final ClientIpResolver clientIpResolver;

    public CronController(ClientIpResolver clientIpResolver) {
        this.clientIpResolver = clientIpResolver;
    }

    @GetMapping("/next")
    public Map<String, Object> nextRuns(
            @RequestParam String expression,
            @RequestParam(defaultValue = "10") int count,
            @RequestParam(defaultValue = "QUARTZ") String type,
            HttpServletRequest request) {
        RATE_LIMITER.check(clientIpResolver.resolve(request));
        return cronService.nextRuns(expression, count, type);
    }
}
