package com.devkit.tool;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * MyBatis 日志转 SQL（与前端 mybatis-sql.js 保持行为一致，供单测验证）。
 */
public final class MyBatisSqlConverter {

    private static final String[] STRING_TYPES = {
            "String", "string", "Date", "Timestamp", "LocalDateTime",
            "LocalDate", "LocalTime", "Time", "BigDecimal", "char", "Character"
    };

    private MyBatisSqlConverter() {
    }

    public record Param(String value, String type) {
    }

    public record Result(List<String> sqls, String error) {
    }

    public static Result convertAll(String logText) {
        if (logText == null || logText.isBlank()) {
            return new Result(List.of(), "请输入 MyBatis 日志");
        }

        String[] lines = logText.split("\\R");
        List<String> sqls = new ArrayList<>();
        String preparing = null;
        String params = null;

        for (String line : lines) {
            Matcher prepMatch = Pattern.compile("==>\\s*Preparing:\\s*(.+)", Pattern.CASE_INSENSITIVE).matcher(line);
            Matcher paramMatch = Pattern.compile("==>\\s*Parameters:\\s*(.+)", Pattern.CASE_INSENSITIVE).matcher(line);
            if (prepMatch.find()) {
                if (preparing != null) {
                    sqls.add(convertBlock(preparing, params));
                }
                preparing = prepMatch.group(1);
                params = null;
                continue;
            }
            if (paramMatch.find() && preparing != null) {
                params = paramMatch.group(1);
                sqls.add(convertBlock(preparing, params));
                preparing = null;
                params = null;
            }
        }
        if (preparing != null) {
            sqls.add(convertBlock(preparing, params));
        }

        if (sqls.isEmpty()) {
            Matcher prep = Pattern.compile("Preparing:\\s*(.+?)(?:\\s*==>|$)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL).matcher(logText);
            Matcher par = Pattern.compile("Parameters:\\s*(.+)", Pattern.CASE_INSENSITIVE).matcher(logText);
            if (prep.find()) {
                sqls.add(convertBlock(prep.group(1).trim(), par.find() ? par.group(1).trim() : null));
            }
        }

        if (sqls.isEmpty()) {
            return new Result(List.of(), "未识别到 MyBatis 日志格式");
        }
        return new Result(sqls, null);
    }

    static String convertBlock(String preparingSql, String paramLine) {
        String sql = preparingSql.trim();
        if (paramLine == null || paramLine.isBlank()) {
            return sql;
        }
        for (Param param : parseParameters(paramLine)) {
            sql = sql.replaceFirst("\\?", formatValue(param.value(), param.type()));
        }
        return sql;
    }

    static List<Param> parseParameters(String paramLine) {
        List<Param> params = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        for (char ch : paramLine.toCharArray()) {
            if (ch == '(') depth++;
            if (ch == ')') depth--;
            if (ch == ',' && depth == 0) {
                if (!current.toString().trim().isEmpty()) {
                    params.add(parseOneParam(current.toString().trim()));
                }
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        if (!current.toString().trim().isEmpty()) {
            params.add(parseOneParam(current.toString().trim()));
        }
        return params;
    }

    static Param parseOneParam(String raw) {
        Matcher m = Pattern.compile("^(.+)\\(([^)]+)\\)$").matcher(raw);
        if (m.matches()) {
            return new Param(m.group(1).trim(), m.group(2).trim());
        }
        return new Param(raw, "String");
    }

    static String formatValue(String value, String type) {
        if ("null".equals(value) || value.isEmpty()) {
            return "NULL";
        }
        boolean isString = false;
        String lowerType = type.toLowerCase();
        for (String t : STRING_TYPES) {
            if (lowerType.contains(t.toLowerCase())) {
                isString = true;
                break;
            }
        }
        if (isString) {
            return "'" + value.replace("'", "''") + "'";
        }
        return value;
    }
}
