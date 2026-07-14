package com.devkit.tool;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * .env 解析（与前端 dotenv-pro.js 行为对齐，供单测与服务端复用）。
 */
public final class DotenvParser {

    private static final Pattern KEY_PATTERN = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");
    private static final Pattern SENSITIVE_KEY = Pattern.compile(
            "(password|passwd|secret|token|credential|api[_-]?key|private[_-]?key)", Pattern.CASE_INSENSITIVE);

    private DotenvParser() {
    }

    public record Entry(String key, String value, int line) {
    }

    public record ParseResult(List<Entry> entries, List<String> errors) {
    }

    public static ParseResult parse(String text) {
        List<Entry> entries = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return new ParseResult(entries, errors);
        }

        String[] rawLines = text.split("\\r?\\n");
        int i = 0;
        while (i < rawLines.length) {
            int lineNo = i + 1;
            String line = rawLines[i];
            String trimmed = line.trim();
            i++;

            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            if (trimmed.startsWith("export ")) {
                trimmed = trimmed.substring(7).trim();
            }

            int eq = trimmed.indexOf('=');
            if (eq <= 0) {
                errors.add("第 " + lineNo + " 行：缺少 KEY=VALUE");
                continue;
            }

            String key = trimmed.substring(0, eq).trim();
            String valPart = trimmed.substring(eq + 1);

            String value;
            String unquoted = valPart.trim();
            if (unquoted.startsWith("\"")) {
                StringBuilder sb = new StringBuilder();
                int j = 1;
                boolean closed = false;
                while (j < unquoted.length()) {
                    char c = unquoted.charAt(j);
                    if (c == '\\' && j + 1 < unquoted.length()) {
                        char next = unquoted.charAt(j + 1);
                        if (next == 'n') {
                            sb.append('\n');
                            j += 2;
                        } else if (next == 't') {
                            sb.append('\t');
                            j += 2;
                        } else {
                            sb.append(next);
                            j += 2;
                        }
                    } else if (c == '"') {
                        closed = true;
                        j++;
                        break;
                    } else {
                        sb.append(c);
                        j++;
                    }
                }
                if (!closed) {
                    while (i < rawLines.length) {
                        sb.append('\n').append(rawLines[i]);
                        i++;
                        if (rawLines[i - 1].trim().endsWith("\"")) {
                            String tail = rawLines[i - 1].trim();
                            sb.setLength(sb.length() - tail.length());
                            sb.append(tail, 0, tail.length() - 1);
                            break;
                        }
                    }
                }
                value = sb.toString();
                int hash = value.indexOf(" #");
                if (hash >= 0) {
                    value = value.substring(0, hash);
                }
            } else if (unquoted.startsWith("'") && unquoted.endsWith("'") && unquoted.length() >= 2) {
                value = unquoted.substring(1, unquoted.length() - 1);
            } else {
                value = stripInlineComment(unquoted.trim());
            }

            value = value.replace("\\n", "\n").replace("\\t", "\t");

            if (!KEY_PATTERN.matcher(key).matches()) {
                errors.add("第 " + lineNo + " 行：非法变量名 " + key);
            }
            entries.add(new Entry(key, value, lineNo));
        }
        return new ParseResult(entries, errors);
    }

    private static String stripInlineComment(String val) {
        boolean inSingle = false;
        boolean inDouble = false;
        for (int k = 0; k < val.length(); k++) {
            char c = val.charAt(k);
            if (c == '\'' && !inDouble) {
                inSingle = !inSingle;
            } else if (c == '"' && !inSingle) {
                inDouble = !inDouble;
            } else if (c == '#' && !inSingle && !inDouble) {
                int sp = k;
                if (sp > 0 && Character.isWhitespace(val.charAt(sp - 1))) {
                    return val.substring(0, sp).trim();
                }
            }
        }
        return val;
    }

    public static boolean isSensitiveKey(String key) {
        return key != null && SENSITIVE_KEY.matcher(key).find();
    }

    public static List<Entry> maskSecrets(List<Entry> entries) {
        return entries.stream()
                .map(e -> isSensitiveKey(e.key()) ? new Entry(e.key(), "******", e.line()) : e)
                .toList();
    }
}
