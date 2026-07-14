package com.devkit.web;

import com.cronutils.model.Cron;
import com.cronutils.model.CronType;
import com.cronutils.model.definition.CronDefinitionBuilder;
import com.cronutils.model.time.ExecutionTime;
import com.cronutils.parser.CronParser;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class CronService {

    static final int MAX_EXPRESSION_LEN = 256;
    static final int MAX_COUNT = 30;

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public Map<String, Object> nextRuns(String expression, int count, String type) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (expression == null || expression.isBlank()) {
            result.put("success", false);
            result.put("message", "表达式不能为空");
            return result;
        }
        if (expression.length() > MAX_EXPRESSION_LEN) {
            result.put("success", false);
            result.put("message", "表达式过长（上限 " + MAX_EXPRESSION_LEN + " 字符）");
            return result;
        }
        try {
            CronType cronType = CronType.valueOf(type.toUpperCase());
            CronParser parser = new CronParser(CronDefinitionBuilder.instanceDefinitionFor(cronType));
            Cron cron = parser.parse(expression.trim());
            cron.validate();

            ExecutionTime executionTime = ExecutionTime.forCron(cron);
            ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
            List<String> runs = new ArrayList<>();
            ZonedDateTime cursor = now;

            int limit = Math.min(Math.max(count, 1), MAX_COUNT);
            for (int i = 0; i < limit; i++) {
                var next = executionTime.nextExecution(cursor);
                if (next.isEmpty()) {
                    break;
                }
                cursor = next.get();
                runs.add(cursor.format(FORMATTER));
            }

            result.put("success", true);
            result.put("expression", expression);
            result.put("type", cronType.name());
            result.put("nextRuns", runs);
        } catch (IllegalArgumentException e) {
            result.put("success", false);
            result.put("message", "不支持的 Cron 类型: " + type);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", e.getMessage());
        }
        return result;
    }
}
