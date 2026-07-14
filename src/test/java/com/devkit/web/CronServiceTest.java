package com.devkit.web;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CronServiceTest {

    private final CronService cronService = new CronService();

    @Test
    void parsesValidQuartzExpression() {
        Map<String, Object> result = cronService.nextRuns("0 0 2 * * ?", 3, "QUARTZ");
        assertTrue((Boolean) result.get("success"));
        assertEquals(3, ((java.util.List<?>) result.get("nextRuns")).size());
    }

    @Test
    void rejectsOverlongExpression() {
        Map<String, Object> result = cronService.nextRuns("x".repeat(300), 1, "QUARTZ");
        assertFalse((Boolean) result.get("success"));
    }

    @Test
    void rejectsInvalidType() {
        Map<String, Object> result = cronService.nextRuns("0 0 2 * * ?", 1, "INVALID");
        assertFalse((Boolean) result.get("success"));
    }
}
